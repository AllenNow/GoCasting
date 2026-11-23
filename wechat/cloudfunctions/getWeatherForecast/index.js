// cloudfunctions/getWeatherForecast/index.js
// Open-Meteo 大气预报：气压 + 风速 + 降水 + 天气代码
// 与 Marine API 互补（Marine 只有海洋数据，无气压）
// 缓存 1 小时，同坐标多用户共享

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
const { readConfig, apiGet } = require('./qweather');
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

// ── 和风天气：文字现象 → 中文简称 + 评分影响 ────────────────
// 顺序从重到轻，先匹配冰雹/雷暴，再匹配雨雪，最后晴阴
const QW_TEXT_RULES = [
  [/冰雹/, '冰雹', -3], [/雷/, '雷暴', -3],
  [/暴雨|强降雨|大暴雨/, '大雨', -2],
  [/中雨/, '中雨', -1.5],
  [/大雨/, '大雨', -2],
  [/小雪|中雪|大雪|阵雪|雪/, '雪', -2],
  [/阵雨|雷阵雨/, '阵雨', -1.5],
  [/小雨|毛毛雨|细雨|雨/, '小雨', -1],
  [/雾|霾|沙尘|浮尘/, '雾', -0.5],
  [/阴/, '阴', 0],
  [/多云|少云|晴间多云/, '多云', 0.5],
  [/晴/, '晴', 1],
];

function qwTextInfo(text) {
  const s = String(text || '');
  for (const [re, label, score] of QW_TEXT_RULES) {
    if (re.test(s)) return { label, score };
  }
  return { label: s || '未知', score: 0 };
}

const toNum = v => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// 和风 v1 时间 → 本地日期与小时（带 Z 时按 UTC+8 兜底）
function qwTimeParts(t) {
  const s = String(t || '');
  if (!s) return { date: '', hour: NaN };
  let d = s;
  if (/Z$/.test(s)) {
    const ms = new Date(s).getTime();
    if (!Number.isNaN(ms)) {
      const x = new Date(ms + 8 * 3600 * 1000);
      const p = n => String(n).padStart(2, '0');
      d = `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}` +
        `T${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
    }
  }
  return { date: d.slice(0, 10), hour: parseInt(d.slice(11, 13), 10) };
}

const round1 = v => (v == null ? null : Math.round(v * 10) / 10);

// 请求和风实时 + 未来24小时 v1；任一失败返回 null，由 Open-Meteo 兜底
async function fetchQWeather(db, openid, cfg, lat, lon) {
  const t0 = Date.now();
  const la = Number(lat).toFixed(2);
  const lo = Number(lon).toFixed(2);
  const [nowR, hR] = await Promise.allSettled([
    apiGet(cfg, `/weather/v1/current/${la}/${lo}?localTime=true&lang=zh`),
    apiGet(cfg, `/weather/v1/hourly/${la}/${lo}?hours=24&localTime=true&lang=zh`),
  ]);
  const now = nowR.status === 'fulfilled' ? nowR.value : null;
  const hours = hR.status === 'fulfilled' && Array.isArray(hR.value.hours) ? hR.value.hours : [];
  const ok = !!(now || hours.length);
  logApiUsage(db, {
    openid, apiGroup: 'qweather', apiName: 'weather_atmos',
    endpoint: `https://${cfg.host}/weather/v1/hourly`,
    success: ok, latencyMs: Date.now() - t0,
    error: ok ? null : [nowR, hR].map(r => r.status === 'rejected' ? String(r.reason && r.reason.message) : '').filter(Boolean).join(' / '),
  });
  return ok ? { now, hours } : null;
}

// 和风 v1 覆盖当日逐小时（气压/天气/风/降水/气温），保持原有 byDay 结构
function mergeQWeather(dayMap, qw) {
  const put = (dateKey, hour, patch) => {
    if (!dateKey || Number.isNaN(hour)) return;
    if (!dayMap[dateKey]) dayMap[dateKey] = [];
    let row = dayMap[dateKey].find(x => x.hour === hour);
    if (!row) { row = { hour }; dayMap[dateKey].push(row); }
    Object.assign(row, patch);
  };

  (qw.hours || []).forEach(h => {
    const t = qwTimeParts(h.forecastTime);
    const info = qwTextInfo(h.condition && h.condition.text);
    const wind = h.wind || {};
    const dir = wind.direction || {};
    const speed = toNum(wind.speed && wind.speed.value);   // m/s
    const prec = h.precipitation || {};
    put(t.date, t.hour, {
      pressure: toNum(h.pressure && h.pressure.value),
      wmoLabel: info.label, wmoScore: info.score,
      windSpeed: speed != null ? Math.round(speed * 3.6) : null,
      windDir: dir.degree != null ? Number(dir.degree) : null,
      windDirText: '',
      windScale: wind.scale != null ? wind.scale : null,
      precip: toNum(prec.amount && prec.amount.value),
      pop: typeof prec.probability === 'number' ? Math.round(prec.probability * 100) : null,
      tempAir: round1(toNum(h.temperature && h.temperature.value)),
      humidity: typeof h.humidity === 'number' ? Math.round(h.humidity * 100) : null,
      cloud: typeof h.cloudCover === 'number' ? Math.round(h.cloudCover * 100) : null,
      dew: round1(toNum(h.dewPoint && h.dewPoint.value)),
      text: (h.condition && h.condition.text) || '',
      icon: (h.condition && h.condition.code) || '',
      source: 'qweather',
    });
  });

  if (qw.now && qw.now.condition) {
    const n = qw.now;
    const t = qwTimeParts(n.validTime);
    const info = qwTextInfo(n.condition.text);
    const wind = n.wind || {};
    const dir = wind.direction || {};
    const speed = toNum(wind.speed && wind.speed.value);
    const visM = toNum(n.visibility && n.visibility.value);
    put(t.date, t.hour, {
      pressure: toNum(n.pressure && n.pressure.value),
      wmoLabel: info.label, wmoScore: info.score,
      windSpeed: speed != null ? Math.round(speed * 3.6) : null,
      windDir: dir.degree != null ? Number(dir.degree) : null,
      windDirText: '',
      windScale: wind.scale != null ? wind.scale : null,
      precip: toNum(n.precipitation && n.precipitation.amount && n.precipitation.amount.value),
      pop: null,
      tempAir: round1(toNum(n.temperature && n.temperature.value)),
      humidity: typeof n.humidity === 'number' ? Math.round(n.humidity * 100) : null,
      cloud: typeof n.cloudCover === 'number' ? Math.round(n.cloudCover * 100) : null,
      dew: round1(toNum(n.dewPoint && n.dewPoint.value)),
      feelsLike: round1(toNum(n.feelsLike && n.feelsLike.value)),
      vis: visM != null ? Math.round(visM / 100) / 10 : null,
      text: n.condition.text || '',
      icon: n.condition.code || '',
      source: 'qweather',
    });
  }

  Object.keys(dayMap).forEach(k => dayMap[k].sort((a, b) => a.hour - b.hour));
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

      // ── 和风优先：能拿到时用和风覆盖当日逐小时（气压/天气/风/降水/气温）──
      const qwCfg = readConfig();
      if (qwCfg) {
        try {
          const qw = await fetchQWeather(db, OPENID, qwCfg, lat, lon);
          if (qw) mergeQWeather(dayMap, qw);
        } catch (e) {
          console.warn('[getWeatherForecast] 和风合并失败，沿用 Open-Meteo:', e.message);
        }
      }

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
