// utils/goScoreService.js — 出钓指数统一数据服务
// 首页 / 我的 / 评分详情 都从这里取分，保证同一时刻同一地点分数完全一致
// 数据来源：getMarineData（验潮站潮汐）+ getWeather（实况），复用现有 apiCache

const apiCache = require('./apiCache');
const gs = require('./goScore');

const SCORE_TTL = 30 * 60 * 1000;      // 同一地点、同一小时 30 分钟
const DEFAULT_GEO = { lat: 24.479, lon: 118.089, source: 'default' }; // 厦门

function pad(n) { return String(n).padStart(2, '0'); }

function hourKey(date) {
  return `${apiCache.todayKeyBJ()}_${pad(date.getHours())}`;
}

function scoreCacheKey(lat, lon, date) {
  return `apicache_goScore_${hourKey(date)}_${lat.toFixed(1)}_${lon.toFixed(1)}`;
}

// ── 定位：优先显式坐标，其次最近一次定位，最后默认地点 ──
function resolveLocation(options) {
  if (options && options.lat != null && options.lon != null) {
    return Promise.resolve({ lat: options.lat, lon: options.lon, source: 'given' });
  }
  const last = wx.getStorageSync('lastGeo');
  if (last && last.lat != null && Date.now() - (last.ts || 0) < 30 * 86400000) {
    return Promise.resolve({ lat: last.lat, lon: last.lon, source: 'cached' });
  }
  return new Promise(resolve => {
    const fallback = () => resolve(
      last && last.lat != null
        ? { lat: last.lat, lon: last.lon, source: 'cached' }
        : DEFAULT_GEO
    );
    wx.getLocation({
      type: 'gcj02',
      success: res => {
        const geo = { lat: res.latitude, lon: res.longitude, source: 'gps' };
        try { wx.setStorageSync('lastGeo', { lat: geo.lat, lon: geo.lon, ts: Date.now() }); } catch (e) {}
        resolve(geo);
      },
      fail: fallback,
    });
  });
}

// ── 读取海况（优先缓存，否则调云函数）──────────────────
async function loadMarine(lat, lon, errors) {
  const key = apiCache.geoKey('marine', lat, lon);
  const cached = apiCache.get(key);
  if (cached && apiCache.isMarineToday(cached)) return cached;

  try {
    const res = await wx.cloud.callFunction({
      name: 'getMarineData',
      data: { lat, lon, needTide: true, tideDays: 7 },
    });
    const data = res.result && res.result.data;
    if (data && data.allDays && data.allDays.length) {
      if (apiCache.isMarineToday(data)) apiCache.set(key, data, apiCache.TTL.marine);
      return data;
    }
    errors.push('海况数据为空');
  } catch (e) {
    errors.push('海况获取失败');
  }
  return null;
}

// ── 读取天气（优先缓存，否则调云函数）──────────────────
async function loadWeather(lat, lon, errors) {
  const key = apiCache.geoKey('weather', lat, lon);
  const cached = apiCache.get(key);
  if (cached && cached.current) return cached;

  try {
    const res = await wx.cloud.callFunction({ name: 'getWeather', data: { lat, lon } });
    const data = res.result && res.result.data;
    if (data && data.current) {
      apiCache.set(key, data, apiCache.TTL.weather_live);
      return data;
    }
    errors.push('天气数据为空');
  } catch (e) {
    errors.push('天气获取失败');
  }
  return null;
}

function saveHistory(payload) {
  try {
    const list = wx.getStorageSync('goScoreHistory') || [];
    const date = apiCache.todayKeyBJ();
    const item = { date, score: payload.score, level: payload.level.short, updatedAt: payload.updatedAt };
    const idx = list.findIndex(x => x.date === date);
    if (idx >= 0) list[idx] = item; else list.push(item);
    wx.setStorageSync('goScoreHistory', list.slice(-14));
  } catch (e) {}
}

function buildPayload(marine, weatherPayload, geo) {
  const now = new Date();
  const errors = [];
  const days = marine ? marine.allDays : [];
  const todayIdx = marine ? marine.todayIdx : -1;
  const today = todayIdx >= 0 ? days[todayIdx] : null;
  const tomorrow = todayIdx >= 0 ? days[todayIdx + 1] : null;

  const tideSeries = gs.mergeTideSeries(today && today.tideChart, tomorrow && tomorrow.tideChart);
  const hour = now.getHours();
  const waveHeight = today && today.hourly && today.hourly[hour]
    ? today.hourly[hour].waveHeight
    : null;

  const base = gs.calcScore({
    tideSeries,
    hour,
    tideIndex: hour,
    weather: weatherPayload && weatherPayload.current,
    waveHeight,
    date: now,
  });

  const hourlyScores = tideSeries.length
    ? gs.buildTimeline({
      tideSeries,
      startHour: hour,
      weather: weatherPayload && weatherPayload.current,
      waveHeight,
      date: now,
    })
    : [];
  const bestSlots = gs.findBestSlots(hourlyScores);

  const tideSource = (today && today.tideSource) ||
    (marine && marine.tideMeta && marine.tideMeta.source) || 'model';
  const payload = {
    score: base.score,
    level: base.level,
    factors: base.factors,
    hourlyScores,
    bestSlots,
    weather: weatherPayload ? weatherPayload.current : null,
    tide: { state: base.tide.state, label: base.tide.label, icon: base.tide.icon },
    source: {
      tide: tideSource,
      weather: weatherPayload ? (weatherPayload.source || 'qweather') : 'none',
      location: geo.source,
    },
    location: { lat: geo.lat, lon: geo.lon },
    updatedAt: now.getTime(),
    errorMsg: errors.join('；'),
  };
  return payload;
}

/**
 * 获取今日出钓指数（所有页面共用）
 * @param {{lat?:number, lon?:number, force?:boolean}} options
 */
async function getTodayScore(options) {
  const opts = options || {};
  const now = new Date();
  const geo = await resolveLocation(opts);
  const key = scoreCacheKey(geo.lat, geo.lon, now);

  if (!opts.force) {
    const entry = apiCache.getEntry(key);
    if (entry && entry.data) {
      return Object.assign({}, entry.data, {
        fromCache: true,
        cachedAt: entry.cachedAt,
      });
    }
  }

  const errors = [];
  const [marine, weatherPayload] = await Promise.all([
    loadMarine(geo.lat, geo.lon, errors),
    loadWeather(geo.lat, geo.lon, errors),
  ]);

  const payload = buildPayload(marine, weatherPayload, geo);
  payload.errorMsg = [payload.errorMsg].concat(errors).filter(Boolean).join('；');

  // 只有拿到有效潮汐时才缓存，避免把降级结果固化 30 分钟
  if (marine) {
    apiCache.set(key, payload, SCORE_TTL);
    saveHistory(payload);
  }
  return Object.assign({}, payload, { fromCache: false, cachedAt: null });
}

// 定位或日期变化时清掉当天分数缓存
function invalidateScoreCache() {
  apiCache.invalidateByName('goScore');
}

function getHistory() {
  try { return wx.getStorageSync('goScoreHistory') || []; } catch (e) { return []; }
}

module.exports = {
  getTodayScore,
  invalidateScoreCache,
  getHistory,
};
