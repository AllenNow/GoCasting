// cloudfunctions/getMarineData/qweather-tide.js
// 和风天气（QWeather）潮汐适配：
//   JWT(Ed25519)/API KEY 鉴权 → GeoAPI 找最近验潮站 → 按天取潮 → api_cache 缓存
//   返回合并结果，由 index.js 覆盖原本的模型潮汐值
// 未配置凭据或任一环节失败时静默降级（返回 source: 'model'），不影响主流程

const crypto = require('crypto');
const fetch  = require('node-fetch');

const TIDE_FORECAST_DAYS   = 7;                       // 默认只预取未来7天（含今天），远端日期按需追加
const STATION_MAX_DIST_KM  = 150;                     // 验潮站距离上限，过远不采用
const STATION_TTL_MS       = 30 * 24 * 60 * 60 * 1000; // 站点缓存30天
const NEGATIVE_TTL_MS      = 7 * 24 * 60 * 60 * 1000;  // 无站点负缓存7天
const TIDE_TTL_MS          = 6 * 60 * 60 * 1000;       // 今天：逐日潮汐缓存6小时
const TIDE_TTL_FUTURE_MS   = 24 * 60 * 60 * 1000;      // 未来日期：24小时（当日潮汐表一天内不变）
const ARCHIVE_RETENTION_DAYS = 30;                     // 历史存档保留30天
const PRUNE_MARKER_TTL_MS  = 24 * 60 * 60 * 1000;      // 每站每天最多清理一次
const CACHE_COLLECTION     = 'api_cache';              // 复用既有缓存集合

// GeoAPI 不可用/附近无站点时的兜底：内置和风官方 POI 潮汐站列表
// 来源：https://github.com/qwd/LocationList → POI-Tide-Station-List-latest.csv
// 格式：[POI_ID, 名称, 纬度, 经度]
const STATIONS = require('./tide-stations.json');

// ── 配置 ─────────────────────────────────────────────────────
// 环境变量里的私钥常见问题：换行丢失/被引号包裹/END 与正文粘连/CRLF 混合，
// 统一还原成标准 PEM（每行 64 字符），避免 crypto 报 "bad end line"
function normalizePrivateKey(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/^['"`]+/, '').replace(/['"`]+$/, '');
  s = s.replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');
  const m = s.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) return s;
  const body = m[2].replace(/[^A-Za-z0-9+/=]/g, '');
  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${m[1]}-----\n${lines.join('\n')}\n-----END ${m[1]}-----\n`;
}

function readConfig() {
  const host = (process.env.QWEATHER_API_HOST || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  if (!host) return null;

  const privateKey  = normalizePrivateKey(process.env.QWEATHER_PRIVATE_KEY);
  const projectId   = (process.env.QWEATHER_PROJECT_ID || '').trim();
  const keyId       = (process.env.QWEATHER_KEY_ID || '').trim();
  const developerId = (process.env.QWEATHER_DEVELOPER_ID || '').trim();

  if (privateKey && projectId && keyId) {
    return { host, mode: 'jwt', privateKey, projectId, keyId, developerId };
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
  // 和风 JWT 规范：alg 必须为 EdDSA，payload 需要 iss（开发者 ID），有效期 15 分钟
  if (!cfg.developerId) {
    console.warn('[qweather-tide] 缺少 QWEATHER_DEVELOPER_ID，JWT 可能被拒绝');
  }
  const header  = { alg: 'EdDSA', kid: cfg.keyId };
  const payload = { iss: cfg.developerId, sub: cfg.projectId, iat, exp: iat + 900 };
  const signingInput = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(payload)))}`;
  let key;
  try {
    key = crypto.createPrivateKey(cfg.privateKey);
  } catch (e) {
    // 只输出结构信息，不输出私钥内容，便于判断是格式问题还是粘贴不完整
    const k = String(cfg.privateKey || '');
    const diag = `len=${k.length},BEGIN=${k.includes('-----BEGIN')},END=${k.includes('-----END')},lines=${k.split('\n').length}`;
    throw new Error(`QWEATHER_PRIVATE_KEY 无法解析（${e.message}；${diag}）：请确认环境变量含完整的 BEGIN/END 私钥`);
  }
  const signature = crypto.sign(null, Buffer.from(signingInput), key);
  return `${signingInput}.${b64url(signature)}`;
}

// ── 用量埋点（由 index.js 注入；默认关闭，仅统计不影响业务）────
let usageReporter = null;

function setUsageReporter(fn) {
  usageReporter = typeof fn === 'function' ? fn : null;
}

function reportUsage(opts) {
  if (!usageReporter) return;
  try { usageReporter(opts); } catch (e) { /* 埋点失败不影响业务 */ }
}

async function apiGet(cfg, path) {
  const apiName = path.includes('/poi/lookup') ? 'geo_api'
    : (path.includes('/ocean/tide') ? 'tide' : 'other');
  const t0 = Date.now();
  const endpoint = `https://${cfg.host}${path.split('?')[0]}`;

  let url = `https://${cfg.host}${path}`;
  let headers = {};
  if (cfg.mode === 'jwt') {
    headers.Authorization = `Bearer ${signJwt(cfg)}`;
  } else {
    url += `${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(cfg.apiKey)}`;
  }

  try {
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
    reportUsage({ apiName, endpoint, success: true, latencyMs: Date.now() - t0 });
    return json;
  } catch (e) {
    reportUsage({ apiName, endpoint, success: false, latencyMs: Date.now() - t0, error: String(e && e.message || e) });
    throw e;
  }
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
  const p = bjParts(d);
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`;
}

// 云函数运行时区为 UTC：显式取北京时间，避免按小时索引时错 8 小时
const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
function bjParts(d) {
  const t = new Date((d ? d.getTime() : Date.now()) + BJ_OFFSET_MS);
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(),
  };
}

// 北京时间某天往前推 N 天的 YYYYMMDD（用于存档清理）
function bjDayStampOffset(days) {
  const p = bjParts();
  const t = new Date(Date.UTC(p.y, p.m - 1, p.d) - days * 24 * 60 * 60 * 1000);
  return `${t.getUTCFullYear()}${pad2(t.getUTCMonth() + 1)}${pad2(t.getUTCDate())}`;
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

async function fetchTideDay(db, cfg, siteId, dk, ttlMs) {
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
  // 空结果不写缓存，避免一次异常被缓存 6 小时（空缓存陷阱）
  if (extremes.length || hourly.length) {
    await cacheSet(db, cacheKey, day, ttlMs || TIDE_TTL_MS);
  }
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

  // 和风生效后整日统一用验潮站口径：缺整点用高低潮余弦插值补齐，
  // 不能留下个别模型 MSL 值，否则同一天曲线会跳变、涨退潮判断也会错
  const byTime = {};
  interpolateDayHourly(q.extremes).forEach(h => { byTime[h.timeStr] = h.level; });
  hourly.forEach(h => { byTime[h.timeStr] = h.level; });

  // 仍缺的整点用最近的验潮站整点值补齐，保证 00:00-23:00 全部为站值
  for (let h = 0; h < 24; h++) {
    const k = `${pad2(h)}:00`;
    if (byTime[k] != null) continue;
    let best = null, bestDist = 99;
    for (let m = 0; m < 24; m++) {
      const mk = `${pad2(m)}:00`;
      if (byTime[mk] == null) continue;
      const dist = Math.abs(m - h);
      if (dist < bestDist) { bestDist = dist; best = mk; }
    }
    if (best) byTime[k] = byTime[best];
  }

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

  const cutoffKey = bjDayStampOffset(ARCHIVE_RETENTION_DAYS);
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
 * @param {number} [params.days]  预取天数（含今天），默认 TIDE_FORECAST_DAYS
 * @returns {Promise<{meta:object, current:?{levels:number[],idx:number,level:number}}>}
 */
async function enhanceTide({ db, lat, lon, allDays, todayIdx, now, days }) {
  const modelMeta = { source: 'model' };
  try {
    const cfg = readConfig();
    if (!cfg) return { meta: { ...modelMeta, label: '模型推算', reason: '未配置和风天气凭据' } };

    const base = now instanceof Date ? now : new Date();
    const station = await resolveStation(db, cfg, lat, lon).catch(() => null);
    if (!station) return { meta: { ...modelMeta, label: '模型推算', reason: '附近无可用验潮站' } };
    const stationMeta = {
      siteId: station.id,
      siteName: station.name,
      distanceKm: station.distanceKm,
    };

    // 只取 allDays 里存在的今天及未来日期，避免为不存在的日期白调用接口
    const todayStr = dateKey(base);
    const forecastDays = Math.min(
      10,
      Math.max(1, parseInt(days, 10) || TIDE_FORECAST_DAYS)
    );
    const dates = allDays
      .filter(d => d.date >= todayStr)
      .map(d => d.date)
      .slice(0, forecastDays);

    // 保留首个真实错误，便于定位 401/403/空数据等问题
    const rawResults = await Promise.all(
      dates.map(dk => fetchTideDay(db, cfg, station.id, dk, dk === todayStr ? TIDE_TTL_MS : TIDE_TTL_FUTURE_MS)
        .then(v => ({ v, err: null }))
        .catch(e => ({ v: null, err: e })))
    );
    const dayMap = {};
    let firstErr = null;
    rawResults.forEach((r, i) => {
      if (r.v) dayMap[dates[i]] = r.v;
      else if (r.err && !firstErr) firstErr = r.err;
    });

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
    const archiveStart = dateKey(new Date(Date.now() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000));
    const pastDays = allDays.filter(d => d.date < todayStr && d.date >= archiveStart);
    const archived = await Promise.all(pastDays.map(d => readTideArchive(db, station.id, d.date)));
    let archiveDays = 0;
    pastDays.forEach((day, i) => {
      if (!archived[i] || !applyTideDay(day, archived[i])) return;
      day.tideSource = 'qweather-archive';
      archiveDays++;
    });

    if (!applied && !archiveDays) {
      const reason = firstErr
        ? `和风潮汐请求失败：${(firstErr && firstErr.message) || String(firstErr)}`
        : '和风潮汐返回空数据（该验潮站当日无潮汐表）';
      return { meta: { ...modelMeta, label: '模型推算', ...stationMeta, reason } };
    }

    await pruneStationArchive(db, station.id, todayStr);

    // 当前时刻潮位（今天）
    let current = null;
    const today = todayIdx >= 0 ? allDays[todayIdx] : null;
    if (today && today.tideSource === 'qweather' && Array.isArray(today.tideChart) && today.tideChart.length) {
      const levels = today.tideChart.map(p => p.level);
      const hour = bjParts(base).h;
      let idx = today.tideChart.findIndex(p => p.timeStr === `${pad2(hour)}:00`);
      if (idx < 0) idx = Math.min(hour, today.tideChart.length - 1);
      // 该整点缺失时向两侧就近取一个有效值，避免回退到模型 MSL 潮位
      let level = levels[idx];
      for (let k = 1; level == null && k < levels.length; k++) {
        if (levels[idx - k] != null) level = levels[idx - k];
        else if (levels[idx + k] != null) level = levels[idx + k];
      }
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
        label: '和风天气·验潮站',
        ...stationMeta,
        datum: 'station',
        days: applied,
        daysApplied: applied,
        daysRequested: dates.length,
        archiveDays,
        ...(firstErr ? { daysFailed: dates.length - applied, firstError: (firstErr && firstErr.message) || String(firstErr) } : {}),
        updatedAt: new Date().toISOString(),
      },
      current,
    };
  } catch (e) {
    console.warn('[qweather-tide] 降级为模型潮汐:', e.message);
    return { meta: { ...modelMeta, label: '模型推算', reason: e.message } };
  }
}

module.exports = { enhanceTide, readConfig, setUsageReporter };
