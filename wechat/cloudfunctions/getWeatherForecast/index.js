// cloudfunctions/getWeatherForecast/index.js
// Open-Meteo 大气预报：气压 + 风速 + 降水 + 天气代码
// 与 Marine API 互补（Marine 只有海洋数据，无气压）
// 缓存 1 小时，同坐标多用户共享

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const CACHE_TTL_MS  = 60 * 60 * 1000;   // 1小时
const SOFT_TTL_MS   = 45 * 60 * 1000;   // 45分钟后允许后台刷新

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
  } catch (e) { return null; }
}

async function cacheSet(db, key, data, ttlMs, softTtlMs) {
  const now = Date.now();
  const jitter = Math.floor(Math.random() * 60 * 1000);
  const soft = softTtlMs || Math.round(ttlMs * 0.75);
  try {
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
    console.warn('[cache] atmos 写入失败:', e.message);
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
      return 'off';
    }
  }
}

async function releaseLock(db, key) {
  try { await db.collection('api_cache_lock').doc(key).remove(); } catch (_) {}
}

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

// WMO 天气代码 → 中文简称 + 评分影响
// https://open-meteo.com/en/docs#weathervariables
const WMO_MAP = {
  0:  { label: '晴',     score: 1  },
  1:  { label: '晴间多云', score: 1 },
  2:  { label: '多云',   score: 0.5 },
  3:  { label: '阴',     score: 0  },
  45: { label: '雾',     score: -0.5 },
  48: { label: '雾凇',   score: -0.5 },
  51: { label: '毛毛雨', score: -0.5 },
  53: { label: '毛毛雨', score: -0.5 },
  55: { label: '毛毛雨', score: -1 },
  61: { label: '小雨',   score: -1 },
  63: { label: '中雨',   score: -1.5 },
  65: { label: '大雨',   score: -2 },
  71: { label: '小雪',   score: -1 },
  73: { label: '中雪',   score: -1.5 },
  75: { label: '大雪',   score: -2 },
  80: { label: '阵雨',   score: -1 },
  81: { label: '阵雨',   score: -1.5 },
  82: { label: '强阵雨', score: -2 },
  95: { label: '雷暴',   score: -3 },
  96: { label: '冰雹',   score: -3 },
  99: { label: '强冰雹', score: -3 },
};

function wmoInfo(code) {
  return WMO_MAP[code] || { label: '未知', score: 0 };
}

exports.main = async (event, context) => {
  const { lat, lon } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 缓存 key（0.1° 精度，≈11km）
  const sLat = (Math.round(lat / 0.1) * 0.1).toFixed(1);
  const sLon = (Math.round(lon / 0.1) * 0.1).toFixed(1);
  const cacheKey = `atmos_${sLat}_${sLon}`;

  try {
    const out = await withCache(db, cacheKey, CACHE_TTL_MS, SOFT_TTL_MS, async () => {
      // ── 请求 Open-Meteo 大气预报（过去7天+未来7天）────────────
      const hourlyVars = [
        'surface_pressure',    // 海平面气压（hPa）→ 核心鱼口指标
        'weather_code',        // WMO 天气代码
        'wind_speed_10m',      // 风速（km/h）
        'wind_direction_10m',  // 风向（°）
        'precipitation',       // 降水量（mm）
        'temperature_2m',      // 气温（°C）
      ].join(',');

      const url = `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&hourly=${hourlyVars}` +
        `&timezone=Asia/Shanghai` +
        `&past_days=7` +
        `&forecast_days=7` +
        `&cell_selection=nearest`;

      const t0 = Date.now();
      const resp = await fetch(url, { timeout: 10000 });
      const apiData = await resp.json();
      const latencyMs = Date.now() - t0;

      logApiUsage(db, {
        openid: OPENID, apiGroup: 'open_meteo', apiName: 'atmos_forecast',
        endpoint: 'https://api.open-meteo.com/v1/forecast',
        success: !!apiData.hourly, latencyMs,
        error: !apiData.hourly ? 'hourly 字段为空' : null,
      });

      if (!apiData.hourly) return null;

      const H     = apiData.hourly;
      const times = H.time;

      // ── 按天分组（key: "YYYY-MM-DD"）────────────────────────
      const dayMap = {};
      times.forEach((timeStr, i) => {
        const dateKey = timeStr.slice(0, 10);
        if (!dayMap[dateKey]) dayMap[dateKey] = [];
        dayMap[dateKey].push({
          hour:     parseInt(timeStr.slice(11, 13)),
          pressure: H.surface_pressure?.[i]    != null ? parseFloat(H.surface_pressure[i].toFixed(1))    : null,
          wmoCode:  H.weather_code?.[i]        ?? null,
          wmoLabel: wmoInfo(H.weather_code?.[i]).label,
          wmoScore: wmoInfo(H.weather_code?.[i]).score,
          windSpeed:   H.wind_speed_10m?.[i]   != null ? parseFloat(H.wind_speed_10m[i].toFixed(1))   : null,
          windDir:     H.wind_direction_10m?.[i] != null ? Math.round(H.wind_direction_10m[i])           : null,
          precip:      H.precipitation?.[i]    != null ? parseFloat(H.precipitation[i].toFixed(1))    : null,
          tempAir:     H.temperature_2m?.[i]   != null ? parseFloat(H.temperature_2m[i].toFixed(1))   : null,
        });
      });

      return { byDay: dayMap, generatedAt: new Date().toISOString() };
    });

    if (!out.data) return { success: false, error: '大气预报数据为空' };
    return {
      success: true,
      data: out.data,
      _fromCache: out.fromCache,
      _cachedAt: out.cachedAt,
    };

  } catch (err) {
    console.error('getWeatherForecast error:', err);
    return { success: false, error: String(err) };
  }
};
