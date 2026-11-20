// cloudfunctions/getMarineData/qweather-tide.js
// 和风天气（QWeather）潮汐适配：
//   JWT(Ed25519)/API KEY 鉴权 → GeoAPI 找最近验潮站 → 按天取潮 → api_cache 缓存
//   返回合并结果，由 index.js 覆盖原本的模型潮汐值
// 未配置凭据或任一环节失败时静默降级（返回 source: 'model'），不影响主流程

const crypto = require('crypto');
const fetch  = require('node-fetch');

const TIDE_FORECAST_DAYS   = 10;                      // 和风潮汐最多未来10天（含今天）
const STATION_MAX_DIST_KM  = 150;                     // 验潮站距离上限，过远不采用
const STATION_TTL_MS       = 30 * 24 * 60 * 60 * 1000; // 站点缓存30天
const NEGATIVE_TTL_MS      = 7 * 24 * 60 * 60 * 1000;  // 无站点负缓存7天
const TIDE_TTL_MS          = 6 * 60 * 60 * 1000;       // 逐日潮汐缓存6小时
const ARCHIVE_RETENTION_DAYS = 30;                     // 历史存档保留30天
const PRUNE_MARKER_TTL_MS  = 24 * 60 * 60 * 1000;      // 每站每天最多清理一次
const CACHE_COLLECTION     = 'api_cache';              // 复用既有缓存集合

// GeoAPI 不可用/附近无站点时的兜底：内置和风官方 POI 潮汐站列表
// 来源：https://github.com/qwd/LocationList → POI-Tide-Station-List-latest.csv
// 格式：[POI_ID, 名称, 纬度, 经度]
const STATIONS = require('./tide-stations.json');

// ── 配置 ─────────────────────────────────────────────────────
function readConfig() {
  const host = (process.env.QWEATHER_API_HOST || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (!host) return null;

  const privateKey = (process.env.QWEATHER_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  const projectId  = (process.env.QWEATHER_PROJECT_ID || '').trim();
  const keyId      = (process.env.QWEATHER_KEY_ID || '').trim();

  if (privateKey && projectId && keyId) {
    return { host, mode: 'jwt', privateKey, projectId, keyId };
  }

  const apiKey = (process.env.QWEATHER_API_KEY || '').trim();
  if (apiKey) return { host, mode: 'key', apiKey };

  return null;
}

// ── JWT（Ed25519）───────────────────────────────────────────
function b64url(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signJwt(cfg) {
  const iat = Math.floor(Date.now() / 1000) - 30;
  const header  = { alg: 'Ed25519', kid: cfg.keyId };
  const payload = { sub: cfg.projectId, iat, exp: iat + 3600 };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`;
  const signature = crypto.sign(null, Buffer.from(signingInput), crypto.createPrivateKey(cfg.privateKey));
  return `${signingInput}.${b64url(signature)}`;
}

async function apiGet(cfg, path) {
  let url = `https://${cfg.host}${path}`;
  let headers = {};
  if (cfg.mode === 'jwt') {
    headers.Authorization = `Bearer ${signJwt(cfg)}`;
  } else {
    url += `${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(cfg.apiKey)}`;
  }

  const resp = await fetch(url, { headers, timeout: 8000 });
  const text = await resp.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`QWeather 返回非 JSON（HTTP ${resp.status}）: ${text.slice(0, 120)}`);
  }
  if (!resp.ok) {
    const msg = (json && json.error && json.error.message) || text.slice(0, 120);
    throw new Error(`QWeather HTTP ${resp.status}: ${msg}`);
  }
  if (json.code && json.code !== '200') {
    throw new Error(`QWeather code ${json.code}: ${json.message || '请求失败'}`);
  }
  return json;
}

// ── 缓存（与项目既有文档结构一致：doc.data 存业务负载）────────
async function cacheGet(db, key) {
  try {
    const res = await db.collection(CACHE_COLLECTION).where({ _id: key }).limit(1).get();
    if (!res.data.length) return null;
    const payload = res.data[0].data;
    if (!payload || !payload.__payload) return null;
    if (payload.expireAt && new Date(payload.expireAt) < new Date()) return null;
    return payload.value;
  } catch (e) {
    return null;
  }
}

async function cacheSet(db, key, value, ttlMs) {
  try {
    await db.collection(CACHE_COLLECTION).doc(key).set({
      data: {
        __payload: true,
        value,
        expireAt: new Date(Date.now() + ttlMs).toISOString(),
        cachedAt: db.serverDate(),
      },
    });
  } catch (e) {
    console.warn('[qweather-tide] 缓存写入失败:', e.message);
  }
}

// ── 工具 ─────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0');
const round2 = v => parseFloat(Number(v).toFixed(2));

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// "2026-11-20T03:00+08:00" → "03:00"
function fxTimeToHHMM(fxTime) {
  if (typeof fxTime !== 'string' || fxTime.length < 16) return null;
  return fxTime.slice(11, 16);
}

function hhmmToHours(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 当接口未返回足够逐小时数据时，用高低潮时刻做余弦插值，补出 24 小时曲线
function interpolateDayHourly(extremes) {
  if (!Array.isArray(extremes) || extremes.length < 2) return [];
  const pts = extremes
    .map(e => ({ h: hhmmToHours(e.timeStr), l: e.level }))
    .filter(p => Number.isFinite(p.h) && Number.isFinite(p.l))
    .sort((a, b) => a.h - b.h);
  if (pts.length < 2) return [];

  const out = [];
  for (let h = 0; h < 24; h++) {
    let v;
    if (h <= pts[0].h) v = pts[0].l;
    else if (h >= pts[pts.length - 1].h) v = pts[pts.length - 1].l;
    else {
      let k = 0;
      while (k < pts.length - 2 && h > pts[k + 1].h) k++;
      const a = pts[k], b = pts[k + 1];
      const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
      v = a.l + (b.l - a.l) * (1 - Math.cos(Math.PI * t)) / 2;
    }
    out.push({ timeStr: `${pad2(h)}:00`, level: round2(v) });
  }
  return out;
}

// ── 找站 ─────────────────────────────────────────────────────
// 内置官方列表就近匹配（无需联网，覆盖 728 个验潮站）
function nearestListedStation(lat, lon) {
  let best = null;
  for (let i = 0; i < STATIONS.length; i++) {
    const s = STATIONS[i];
    const d = haversineKm(lat, lon, s[2], s[3]);
    if (!best || d < best.distanceKm) {
      best = { id: s[0], name: s[1], lat: s[2], lon: s[3], distanceKm: round2(d) };
    }
  }
  return best;
}

async function resolveStation(db, cfg, lat, lon) {
  // 1) 官方列表优先
  const local = nearestListedStation(lat, lon);
  if (local && local.distanceKm <= STATION_MAX_DIST_KM) return local;
  // 深入内陆（离最近验潮站 > 400km）时潮汐无参考意义，直接降级
  if (!local || local.distanceKm > 400) return null;

  // 2) 列表无覆盖（远海/新建站）时走 GeoAPI；可按需彻底关闭
  //    GeoAPI 每月前 5 万次免费，超出 0.0007 元/次；结果按 0.5° 网格缓存
  if (String(process.env.QWEATHER_GEO_FALLBACK || '').toLowerCase() === 'off') return null;

  const sLat = (Math.round(lat / 0.5) * 0.5).toFixed(1);
  const sLon = (Math.round(lon / 0.5) * 0.5).toFixed(1);
  const cacheKey = `qwt_station_${sLat}_${sLon}`;

  const cached = await cacheGet(db, cacheKey);
  if (cached) {
    if (cached.__none) return null;   // 负缓存：附近确实没有可用站点
    if (cached.id) return cached;
  }

  let candidates = [];
  let geoOk = false;
  const query = `location=${lon.toFixed(4)},${lat.toFixed(4)}&type=TSTA&number=10&lang=zh`;
  try {
    // 新控制台：所有接口（含 GeoAPI）走专属 API Host，路径带 /geo 前缀
    const json = await apiGet(cfg, `/geo/v2/poi/lookup?${query}`);
    candidates = Array.isArray(json.poi) ? json.poi : [];
    geoOk = true;
  } catch (e) {
    // 兜底：公共 GeoAPI（路径无 /geo 前缀）
    if (cfg.host !== 'geoapi.qweather.com') {
      try {
        const json = await apiGet({ ...cfg, host: 'geoapi.qweather.com' }, `/v2/poi/lookup?${query}`);
        candidates = Array.isArray(json.poi) ? json.poi : [];
        geoOk = true;
      } catch (e2) {
        console.warn('[qweather-tide] GeoAPI 找站失败:', e.message, '/', e2.message);
      }
    } else {
      console.warn('[qweather-tide] GeoAPI 找站失败:', e.message);
    }
  }

  // 请求本身失败属于临时故障，不写缓存，下次再试
  if (!geoOk) return null;

  let best = null;
  candidates.forEach(p => {
    const pLat = parseFloat(p.lat);
    const pLon = parseFloat(p.lon);
    if (!Number.isFinite(pLat) || !Number.isFinite(pLon) || !p.id) return;
    const dist = haversineKm(lat, lon, pLat, pLon);
    if (!best || dist < best.distanceKm) {
      best = {
        id: String(p.id),
        name: p.name || '验潮站',
        lat: pLat,
        lon: pLon,
        distanceKm: round2(dist),
      };
    }
  });

  if (!best || best.distanceKm > STATION_MAX_DIST_KM) {
    // 成功响应但无可用站点：负缓存 7 天，避免同一网格反复消耗配额
    await cacheSet(db, cacheKey, { __none: true }, NEGATIVE_TTL_MS);
    return null;
  }

  await cacheSet(db, cacheKey, best, STATION_TTL_MS);
  return best;
}

// ── 取一天潮汐 ───────────────────────────────────────────────
function tideDocKey(siteId, dk) {
  return `qwt_tide_${siteId}_${dk.replace(/-/g, '')}`;
}

async function fetchTideDay(db, cfg, siteId, dk) {
  const cacheKey = tideDocKey(siteId, dk);
  const cached = await cacheGet(db, cacheKey);
  if (cached) return cached;

  const json = await apiGet(cfg, `/v7/ocean/tide?location=${encodeURIComponent(siteId)}&date=${dk.replace(/-/g, '')}`);

  const extremes = (Array.isArray(json.tideTable) ? json.tideTable : [])
    .map(t => {
      const level = parseFloat(t.height);
      const timeStr = fxTimeToHHMM(t.fxTime);
      if (!timeStr || !Number.isFinite(level)) return null;
      const isHigh = t.type === 'H';
      return {
        type: isHigh ? 'high' : 'low',
        timeStr,
        level: round2(level),
        label: isHigh ? '高潮' : '低潮',
        icon: isHigh ? '⬆️' : '⬇️',
      };
    })
    .filter(Boolean)
    .sort((a, b) => hhmmToHours(a.timeStr) - hhmmToHours(b.timeStr));

  const hourly = (Array.isArray(json.tideHourly) ? json.tideHourly : [])
    .map(h => {
      const level = parseFloat(h.height);
      const timeStr = fxTimeToHHMM(h.fxTime);
      if (!timeStr || !Number.isFinite(level)) return null;
      return { timeStr, level: round2(level) };
    })
    .filter(Boolean);

  const day = { extremes, hourly, fetchedAt: new Date().toISOString() };
  await cacheSet(db, cacheKey, day, TIDE_TTL_MS);
  return day;
}

// 读取历史存档：与缓存共用同一份文档，但忽略 expireAt
async function readTideArchive(db, siteId, dk) {
  try {
    const res = await db.collection(CACHE_COLLECTION)
      .where({ _id: tideDocKey(siteId, dk) })
      .limit(1)
      .get();
    if (!res.data.length) return null;
    const payload = res.data[0].data;
    if (!payload || !payload.__payload) return null;
    return payload.value;
  } catch (e) {
    return null;
  }
}

// 把一天的和风潮汐合并进日历数据，成功返回 true
function applyTideDay(day, q) {
  if (!q || !Array.isArray(q.hourly) || !Array.isArray(q.extremes)) return false;

  const hourly = q.hourly.length >= 18 ? q.hourly : interpolateDayHourly(q.extremes);
  if (hourly.length < 18) return false;

  const byTime = {};
  hourly.forEach(h => { byTime[h.timeStr] = h.level; });

  if (Array.isArray(day.tideChart)) {
    day.tideChart = day.tideChart.map(p => (
      byTime[p.timeStr] != null ? { timeStr: p.timeStr, level: byTime[p.timeStr] } : p
    ));
  }
  if (Array.isArray(day.hourly)) {
    day.hourly = day.hourly.map(p => (
      byTime[p.timeStr] != null ? { ...p, tideLevel: byTime[p.timeStr] } : p
    ));
  }
  if (q.extremes.length) day.extremes = q.extremes;

  const vals = (day.tideChart || []).map(p => p.level).filter(v => v != null);
  if (vals.length) {
    day.tideLevelMax = round2(Math.max(...vals));
    day.tideLevelMin = round2(Math.min(...vals));
  }
  return true;
}

// 清理超过保留期的存档（每站每天最多执行一次）
async function pruneStationArchive(db, siteId, todayKey) {
  const markerKey = `qwt_prune_${siteId}_${todayKey.replace(/-/g, '')}`;
  if (await cacheGet(db, markerKey)) return;
  await cacheSet(db, markerKey, { done: true }, PRUNE_MARKER_TTL_MS);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ARCHIVE_RETENTION_DAYS);
  const cutoffKey = `${cutoff.getFullYear()}${pad2(cutoff.getMonth() + 1)}${pad2(cutoff.getDate())}`;
  const prefix = `^qwt_tide_${String(siteId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_`;

  try {
    const res = await db.collection(CACHE_COLLECTION)
      .where({ _id: db.RegExp({ regexp: prefix }) })
      .limit(100)
      .get();
    const stale = res.data
      .map(doc => doc._id)
      .filter(id => id.slice(-8) < cutoffKey);
    await Promise.all(stale.map(id => db.collection(CACHE_COLLECTION).doc(id).remove().catch(() => {})));
  } catch (e) {
    console.warn('[qweather-tide] 存档清理失败:', e.message);
  }
}

// ── 主入口：把和风潮汐合并进 allDays ─────────────────────────
/**
 * @param {object} params
 * @param {object} params.db       云数据库实例
 * @param {number} params.lat
 * @param {number} params.lon
 * @param {Array}  params.allDays  14天数据（会被原地修改）
 * @param {number} params.todayIdx 今天在 allDays 中的下标
 * @param {Date}   params.now
 * @returns {Promise<{meta:object, current:?{levels:number[],idx:number,level:number}}>}
 */
async function enhanceTide({ db, lat, lon, allDays, todayIdx, now }) {
  const modelMeta = { source: 'model' };
  try {
    const cfg = readConfig();
    if (!cfg) return { meta: { ...modelMeta, reason: '未配置和风天气凭据' } };

    const base = now instanceof Date ? now : new Date();
    const station = await resolveStation(db, cfg, lat, lon).catch(() => null);
    if (!station) return { meta: { ...modelMeta, reason: '附近无可用验潮站' } };

    // 今天 ~ +9 天
    const dates = [];
    for (let i = 0; i < TIDE_FORECAST_DAYS; i++) {
      dates.push(dateKey(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
    }

    const rawDays = await Promise.all(
      dates.map(dk => fetchTideDay(db, cfg, station.id, dk).catch(() => null))
    );
    const dayMap = {};
    dates.forEach((dk, i) => { if (rawDays[i]) dayMap[dk] = rawDays[i]; });

    // 先全部标记为模型，命中和风数据的日期再覆盖来源
    allDays.forEach(day => { day.tideSource = 'model'; });

    let applied = 0;
    allDays.forEach(day => {
      const q = dayMap[day.date];
      if (!q || !applyTideDay(day, q)) return;
      day.tideSource = 'qweather';
      applied++;
    });

    // 过去日期：优先使用验潮站存档（保留 30 天），缺失时保留模型值
    const todayStr = dateKey(base);
    const archiveStart = dateKey(new Date(
      base.getFullYear(), base.getMonth(), base.getDate() - ARCHIVE_RETENTION_DAYS
    ));
    const pastDays = allDays.filter(d => d.date < todayStr && d.date >= archiveStart);
    const archived = await Promise.all(pastDays.map(d => readTideArchive(db, station.id, d.date)));
    let archiveDays = 0;
    pastDays.forEach((day, i) => {
      if (!archived[i] || !applyTideDay(day, archived[i])) return;
      day.tideSource = 'qweather-archive';
      archiveDays++;
    });

    if (!applied && !archiveDays) return { meta: { ...modelMeta, reason: '和风潮汐无有效数据' } };

    await pruneStationArchive(db, station.id, todayStr);

    // 当前时刻潮位（今天）
    let current = null;
    const today = todayIdx >= 0 ? allDays[todayIdx] : null;
    if (today && today.tideSource === 'qweather' && Array.isArray(today.tideChart) && today.tideChart.length) {
      const levels = today.tideChart.map(p => p.level);
      const hour = base.getHours();
      const idx = today.tideChart.findIndex(p => p.timeStr === `${pad2(hour)}:00`);
      const level = idx >= 0 ? levels[idx] : levels[hour];
      if (level != null) {
        // 末位时刻补上明天 0 点，便于判断涨/退
        if (idx >= levels.length - 1) {
          const nextDay = allDays[todayIdx + 1];
          const nextLevel = nextDay && nextDay.tideChart && nextDay.tideChart[0]
            ? nextDay.tideChart[0].level : null;
          if (nextLevel != null) levels.push(nextLevel);
        }
        current = { levels, idx: idx >= 0 ? idx : hour, level: round2(level) };
      }
    }

    return {
      meta: {
        source: 'qweather',
        siteId: station.id,
        siteName: station.name,
        distanceKm: station.distanceKm,
        datum: 'station',
        days: applied,
        archiveDays,
        updatedAt: new Date().toISOString(),
      },
      current,
    };
  } catch (e) {
    console.warn('[qweather-tide] 降级为模型潮汐:', e.message);
    return { meta: { ...modelMeta, reason: e.message } };
  }
}

module.exports = { enhanceTide, readConfig };
