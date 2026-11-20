// cloudfunctions/getWeather/index.js
// 调用高德天气 API：逆地理编码 + 实况天气 + 3天预报
// 缓存策略：云端共享缓存（api_cache 集合）+ 埋点（api_usage_logs）
// 缓存命中时直接返回，不请求高德 API，减少配额消耗

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AMAP_KEY = process.env.AMAP_KEY || 'b5fddea474402d2c2e263595eee40006';

// ── 缓存 TTL（毫秒）─────────────────────────────────────────
const CACHE_TTL = {
  regeo:    30 * 24 * 60 * 60 * 1000,   // 30天：城市名不变
  weather:  15 * 60 * 1000,             // 15分钟：实况+预报共用
};
const SOFT_WEATHER_MS = 10 * 60 * 1000;  // 10分钟后允许后台刷新

// ── 云端缓存：软过期 + 单飞锁 ───────────────────────────────
// 硬过期前先软过期：命中软过期时只允许一个实例回源，其余实例继续用旧数据，
// 避免大量并发同时击穿缓存。
const LOCK_TTL_MS = 60 * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cacheGet(db, key) {
  try {
    const res = await db.collection('api_cache').where({ _id: key }).limit(1).get();
    if (!res.data.length) return null;
    const entry = res.data[0];
    const payload = entry.data || {};
    const isBundle = payload.data !== undefined;
    const data = isBundle ? payload.data : payload;
    if (data == null) return null;
    if (payload.expireAt && new Date(payload.expireAt).getTime() < Date.now()) {
      db.collection('api_cache').doc(entry._id).remove().catch(() => {});
      return null;
    }
    return {
      data,
      cachedAt: payload.cachedAt || null,
      expireAt: payload.expireAt || null,
      softExpireAt: payload.softExpireAt || payload.expireAt || null,
    };
  } catch (e) {
    return null;  // 查询失败时降级为调 API
  }
}

async function cacheSet(db, key, data, ttlMs, softTtlMs) {
  const now = Date.now();
  const jitter = Math.floor(Math.random() * 60 * 1000);  // 打散同时到期
  const soft = softTtlMs || Math.round(ttlMs * 0.75);
  try {
    // 注意：业务数据内不能再带 _id，否则云数据库会报 -501007
    await db.collection('api_cache').doc(key).set({
      data: {
        data,
        cachedAt: new Date(now).toISOString(),
        softExpireAt: new Date(now + soft + jitter).toISOString(),
        expireAt: new Date(now + ttlMs + jitter).toISOString(),
      },
    });
    return new Date(now).toISOString();
  } catch (e) {
    console.warn('[cache] 写入失败:', key, e.message);
    return null;
  }
}

// 抢占刷新锁：'locked' 抢到 / 'busy' 别人在刷 / 'off' 锁不可用（降级直连）
async function tryLock(db, key) {
  const now = Date.now();
  const coll = db.collection('api_cache_lock');
  const lockData = { _id: key, until: new Date(now + LOCK_TTL_MS).toISOString() };
  try {
    await coll.add({ data: lockData });
    return 'locked';
  } catch (e) {
    try {
      const r = await coll.where({ _id: key }).limit(1).get();
      const doc = r.data[0];
      if (doc) {
        if (new Date(doc.until).getTime() < now) {
          await coll.doc(key).remove();
          await coll.add({ data: lockData });
          return 'locked';
        }
        return 'busy';
      }
      return 'off';
    } catch (_) {
      return 'off';  // 锁集合不存在等异常：降级为直接回源
    }
  }
}

async function releaseLock(db, key) {
  try { await db.collection('api_cache_lock').doc(key).remove(); } catch (_) {}
}

// 缓存优先 + 软过期单飞刷新；返回 { data, fromCache, stale, cachedAt }
async function withCache(db, key, ttlMs, softTtlMs, fetcher) {
  const hit = await cacheGet(db, key);
  const now = Date.now();

  if (hit) {
    const softAt = hit.softExpireAt ? new Date(hit.softExpireAt).getTime() : 0;
    if (now < softAt) {
      return { data: hit.data, fromCache: true, stale: false, cachedAt: hit.cachedAt };
    }
    const lock = await tryLock(db, key);
    if (lock === 'locked' || lock === 'off') {
      try {
        const fresh = await fetcher();
        if (fresh != null) {
          const at = await cacheSet(db, key, fresh, ttlMs, softTtlMs);
          return { data: fresh, fromCache: false, stale: false, cachedAt: at };
        }
        return { data: hit.data, fromCache: true, stale: true, cachedAt: hit.cachedAt };
      } catch (e) {
        console.warn('[cache] 刷新失败，沿用旧数据:', key, e.message);
        return { data: hit.data, fromCache: true, stale: true, cachedAt: hit.cachedAt };
      } finally {
        releaseLock(db, key);
      }
    }
    return { data: hit.data, fromCache: true, stale: true, cachedAt: hit.cachedAt };
  }

  let lock = await tryLock(db, key);
  if (lock === 'busy') {
    for (let i = 0; i < 8; i++) {
      await sleep(150);
      const again = await cacheGet(db, key);
      if (again) return { data: again.data, fromCache: true, stale: false, cachedAt: again.cachedAt };
    }
    lock = await tryLock(db, key);
  }
  try {
    const fresh = await fetcher();
    if (fresh == null) return { data: null, fromCache: false, stale: false, cachedAt: null };
    const at = await cacheSet(db, key, fresh, ttlMs, softTtlMs);
    return { data: fresh, fromCache: false, stale: false, cachedAt: at };
  } finally {
    if (lock === 'locked') releaseLock(db, key);
  }
}

// ── 天气描述 → emoji ────────────────────────────────────────
const WEATHER_ICONS = {
  '晴': '☀️', '多云': '⛅', '阴': '☁️',
  '小雨': '🌦️', '中雨': '🌧️', '大雨': '🌧️',
  '暴雨': '⛈️', '雷阵雨': '⛈️', '雪': '❄️',
  '大雪': '🌨️', '雾': '🌫️', '霾': '😷', '阵雨': '🌦️',
};
function weatherIcon(desc) {
  if (!desc) return '🌤️';
  for (const [k, v] of Object.entries(WEATHER_ICONS)) {
    if (desc.includes(k)) return v;
  }
  return '🌤️';
}

async function timedFetch(url) {
  const t0 = Date.now();
  const json = await fetch(url).then(r => r.json());
  return { json, latencyMs: Date.now() - t0 };
}

exports.main = async (event, context) => {
  const { lat, lon } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  try {
    // ══════════════════════════════════════════════
    // Step 1：逆地理编码（缓存 30 天）
    // 缓存 key：坐标精度 0.1°（≈11km），同城市完全复用
    // ══════════════════════════════════════════════
    const sLat = (Math.round(lat / 0.1) * 0.1).toFixed(1);
    const sLon = (Math.round(lon / 0.1) * 0.1).toFixed(1);
    const regeoKey = `regeo_${sLat}_${sLon}`;

    const regeoHit = await cacheGet(db, regeoKey);
    let geoData = regeoHit ? regeoHit.data : null;
    let geoFromCache = !!geoData;
    let geoLatency = 0, geoSuccess = true, geoError = null;
    let city = '未知城市', adcode = '';

    if (!geoData) {
      // 未命中，请求高德
      const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lon},${lat}&key=${AMAP_KEY}&extensions=base&output=json`;
      try {
        const { json: geoRes, latencyMs } = await timedFetch(geoUrl);
        geoLatency = latencyMs;
        const adComp = geoRes?.regeocode?.addressComponent;
        city    = adComp?.city || adComp?.district || adComp?.province || '未知城市';
        adcode  = adComp?.adcode || '';
        if (adComp) {
          geoData = { city, adcode };
          // 异步写缓存（不 await）
          cacheSet(db, regeoKey, geoData, CACHE_TTL.regeo);
        } else {
          geoSuccess = false; geoError = 'addressComponent 为空';
        }
      } catch (e) {
        geoSuccess = false; geoError = String(e);
      }
      // 埋点
      logApiUsage(db, {
        openid: OPENID, apiGroup: 'amap', apiName: 'regeo',
        endpoint: 'https://restapi.amap.com/v3/geocode/regeo',
        success: geoSuccess, latencyMs: geoLatency, error: geoError,
      });
    } else {
      city   = geoData.city;
      adcode = geoData.adcode;
    }

    if (!adcode) {
      return { success: true, data: { city, current: null, forecast: [], fromCache: false } };
    }

    // ══════════════════════════════════════════════
    // Step 2+3：天气实况 + 3天预报（共享缓存 15 分钟）
    // 缓存 key：adcode 级别，同城市所有用户共享
    // ══════════════════════════════════════════════
    const weatherKey = `weather_${adcode}`;

    const wRes = await withCache(db, weatherKey, CACHE_TTL.weather, SOFT_WEATHER_MS, async () => {
      let liveSuccess = true, liveLatency = 0, liveError = null;
      let castSuccess = true, castLatency = 0, castError = null;
      let current = null, forecast = [];

      // 并行请求实况 + 预报
      const [liveResult, castResult] = await Promise.allSettled([
        timedFetch(`https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${AMAP_KEY}&extensions=base&output=json`),
        timedFetch(`https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${AMAP_KEY}&extensions=all&output=json`),
      ]);

      // 处理实况
      if (liveResult.status === 'fulfilled') {
        const { json: liveRes, latencyMs } = liveResult.value;
        liveLatency = latencyMs;
        const live = liveRes?.lives?.[0];
        current = live ? {
          temp: live.temperature, desc: live.weather,
          humidity: live.humidity, wind_speed: live.windpower,
          visibility: live.visibility || '—',
        } : null;
        if (!live) { liveSuccess = false; liveError = 'lives 数组为空'; }
      } else {
        liveSuccess = false; liveError = String(liveResult.reason);
      }

      // 处理预报
      if (castResult.status === 'fulfilled') {
        const { json: castRes, latencyMs } = castResult.value;
        castLatency = latencyMs;
        const casts = castRes?.forecasts?.[0]?.casts || [];
        const weekDays = ['周日','周一','周二','周三','周四','周五','周六'];
        forecast = casts.slice(0, 3).map((c, i) => ({
          date:     i === 0 ? '今天' : weekDays[new Date(c.date).getDay()],
          desc:     c.dayweather,
          icon:     weatherIcon(c.dayweather),
          tempHigh: c.daytemp,
          tempLow:  c.nighttemp,
        }));
        if (!casts.length) { castSuccess = false; castError = '预报数组为空'; }
      } else {
        castSuccess = false; castError = String(castResult.reason);
      }

      // 埋点（两个接口分别记录）
      logApiUsage(db, {
        openid: OPENID, apiGroup: 'amap', apiName: 'weather_live',
        endpoint: 'https://restapi.amap.com/v3/weather/weatherInfo?extensions=base',
        success: liveSuccess, latencyMs: liveLatency, error: liveError,
      });
      logApiUsage(db, {
        openid: OPENID, apiGroup: 'amap', apiName: 'weather_forecast',
        endpoint: 'https://restapi.amap.com/v3/weather/weatherInfo?extensions=all',
        success: castSuccess, latencyMs: castLatency, error: castError,
      });

      // 两个接口都失败时不写缓存，避免把空结果固化
      if (!current && !forecast.length) return null;
      return { city, current, forecast };
    });

    const weatherData = wRes.data;
    const current  = weatherData ? weatherData.current : null;
    const forecast = weatherData ? weatherData.forecast : [];
    if (weatherData && weatherData.city) city = weatherData.city;

    return {
      success: true,
      data: { city, current, forecast },
      // 透传缓存命中情况（供客户端展示更新时间）
      _fromCache: wRes.fromCache,
      _cachedAt: wRes.cachedAt,
      _cache: { regeo: geoFromCache, weather: wRes.fromCache },
    };

  } catch (err) {
    console.error('getWeather error:', err);
    return { success: false, error: String(err) };
  }
};
