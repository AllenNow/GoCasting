// cloudfunctions/getWeather/index.js
// 调用高德天气 API：逆地理编码 + 实况天气 + 3天预报
// 缓存策略：云端共享缓存（api_cache 集合）+ 埋点（api_usage_logs）
// 缓存命中时直接返回，不请求高德 API，减少配额消耗

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AMAP_KEY = 'b5fddea474402d2c2e263595eee40006';

// ── 缓存 TTL（毫秒）─────────────────────────────────────────
const CACHE_TTL = {
  regeo:    30 * 24 * 60 * 60 * 1000,   // 30天：城市名不变
  weather:  20 * 60 * 1000,             // 20分钟：实况+预报共用
};

// ── 云端缓存读写 ────────────────────────────────────────────
async function cacheGet(db, key) {
  try {
    const res = await db.collection('api_cache')
      .where({ _id: key })
      .limit(1)
      .get();
    if (!res.data.length) return null;
    const entry = res.data[0];
    // 检查过期
    if (entry.expireAt && new Date(entry.expireAt) < new Date()) {
      // 异步删除（不阻塞）
      db.collection('api_cache').doc(entry._id).remove().catch(() => {});
      return null;
    }
    return entry.data;
  } catch (e) {
    return null;  // 查询失败时降级为调 API
  }
}

async function cacheSet(db, key, data, ttlMs) {
  try {
    const expireAt = new Date(Date.now() + ttlMs).toISOString();
    // upsert：存在则更新，不存在则创建
    await db.collection('api_cache').doc(key).set({
      data: {
        _id:      key,
        data,
        expireAt,
        cachedAt: db.serverDate(),
      },
    });
  } catch (e) {
    console.warn('[cache] 写入失败:', key, e.message);
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

    let geoData = await cacheGet(db, regeoKey);
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
    // Step 2+3：天气实况 + 3天预报（共享缓存 20 分钟）
    // 缓存 key：adcode 级别，同城市所有用户共享
    // ══════════════════════════════════════════════
    const weatherKey = `weather_${adcode}`;
    let weatherData  = await cacheGet(db, weatherKey);
    let weatherFromCache = !!weatherData;
    let current = null, forecast = [];

    if (!weatherData) {
      // 未命中，调高德天气
      let liveSuccess = true, liveLatency = 0, liveError = null;
      let castSuccess = true, castLatency = 0, castError = null;

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

      // 写云端缓存（两个接口的数据打包存一条记录）
      if (current || forecast.length) {
        weatherData = { city, current, forecast };
        cacheSet(db, weatherKey, weatherData, CACHE_TTL.weather);
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
    } else {
      // 缓存命中，直接解包
      current  = weatherData.current;
      forecast = weatherData.forecast;
      city     = weatherData.city || city;
    }

    return {
      success: true,
      data: { city, current, forecast },
      // 透传缓存命中情况（供调试）
      _cache: { regeo: geoFromCache, weather: weatherFromCache },
    };

  } catch (err) {
    console.error('getWeather error:', err);
    return { success: false, error: String(err) };
  }
};
