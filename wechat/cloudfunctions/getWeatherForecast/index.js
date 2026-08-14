// cloudfunctions/getWeatherForecast/index.js
// Open-Meteo 大气预报：气压 + 风速 + 降水 + 天气代码
// 与 Marine API 互补（Marine 只有海洋数据，无气压）
// 缓存 1 小时，同坐标多用户共享

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const CACHE_TTL_MS = 60 * 60 * 1000;  // 1小时

// ── 云端缓存（复用 api_cache 集合）───────────────────────────
async function cacheGet(db, key) {
  try {
    const res = await db.collection('api_cache').where({ _id: key }).limit(1).get();
    if (!res.data.length) return null;
    const entry = res.data[0];
    if (entry.expireAt && new Date(entry.expireAt) < new Date()) {
      db.collection('api_cache').doc(entry._id).remove().catch(() => {});
      return null;
    }
    return entry.data;
  } catch (e) { return null; }
}

async function cacheSet(db, key, data, ttlMs) {
  try {
    await db.collection('api_cache').doc(key).set({
      data: { _id: key, data, expireAt: new Date(Date.now() + ttlMs).toISOString(), cachedAt: db.serverDate() },
    });
  } catch (e) { console.warn('[cache] atmos 写入失败:', e.message); }
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
    const cached = await cacheGet(db, cacheKey);
    if (cached) return { success: true, data: cached, _fromCache: true };

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

    if (!apiData.hourly) {
      return { success: false, error: '大气预报数据为空' };
    }

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

    const result = { byDay: dayMap, generatedAt: new Date().toISOString() };
    cacheSet(db, cacheKey, result, CACHE_TTL_MS);
    return { success: true, data: result };

  } catch (err) {
    console.error('getWeatherForecast error:', err);
    return { success: false, error: String(err) };
  }
};
