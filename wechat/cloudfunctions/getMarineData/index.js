// cloudfunctions/getMarineData/index.js
// 海洋数据：过去7天 + 未来7天，共14天逐小时
// 支持按天分组：hourlyByDay / tideChartByDay / extremesByDay
// 缓存策略：云端共享缓存（api_cache，TTL 1小时）

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const CACHE_TTL_MS = 60 * 60 * 1000;  // 1小时

// ── 云端缓存 ──────────────────────────────────────────────────
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
  } catch (e) { console.warn('[cache] marine 写入失败:', e.message); }
}

// ── 工具函数 ──────────────────────────────────────────────────
function degToDirection(deg) {
  if (deg == null) return '—';
  const dirs = ['北','北北东','东北','东北东','东','东南东','东南','南南东',
                '南','南南西','西南','西西南','西','西西北','西北','北北西'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function waveDesc(h) {
  if (h == null) return '—';
  if (h < 0.1)  return '无浪';
  if (h < 0.5)  return '微浪';
  if (h < 1.25) return '小浪';
  if (h < 2.5)  return '中浪';
  if (h < 4.0)  return '大浪';
  return '巨浪';
}

// 从逐小时数组提取高低潮极值
function extractExtremes(times, levels) {
  const extremes = [];
  for (let i = 1; i < levels.length - 1; i++) {
    if (levels[i] == null || levels[i-1] == null || levels[i+1] == null) continue;
    const isHigh = levels[i] > levels[i-1] && levels[i] > levels[i+1];
    const isLow  = levels[i] < levels[i-1] && levels[i] < levels[i+1];
    if (isHigh || isLow) {
      extremes.push({
        type: isHigh ? 'high' : 'low',
        timeStr: typeof times[i] === 'string' ? times[i].slice(11, 16) : times[i],
        level: parseFloat(levels[i].toFixed(2)),
        label: isHigh ? '高潮' : '低潮',
        icon:  isHigh ? '⬆️' : '⬇️',
      });
    }
  }
  return extremes;
}

function getTideState(levels, idx) {
  if (idx < 0 || idx >= levels.length - 1) return 'unknown';
  const diff = (levels[idx + 1] || 0) - (levels[idx] || 0);
  if (diff > 0.08)  return 'rising';
  if (diff < -0.08) return 'falling';
  return (levels[idx] || 0) > 0 ? 'high' : 'low';
}

const TIDE_STATE_MAP = {
  rising:  { label: '涨潮',   icon: '🌊', value: 'rising'  },
  falling: { label: '退潮',   icon: '↘️', value: 'falling' },
  high:    { label: '高平潮', icon: '⬆️', value: 'high'    },
  low:     { label: '低平潮', icon: '⬇️', value: 'low'     },
  unknown: { label: '未知',   icon: '—',  value: 'unknown' },
};

// 将 Date 格式化为 YYYY-MM-DD（本地时区）
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 星期标签
const WEEK_DAYS = ['周日','周一','周二','周三','周四','周五','周六'];
function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return WEEK_DAYS[d.getDay()];
}

exports.main = async (event, context) => {
  const { lat, lon } = event;
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 缓存 key（0.5° 精度）
  const sLat = (Math.round(lat / 0.5) * 0.5).toFixed(1);
  const sLon = (Math.round(lon / 0.5) * 0.5).toFixed(1);
  const cacheKey = `marine14_${sLat}_${sLon}`;

  try {
    // ── 查云端缓存 ─────────────────────────────────────────────
    const cached = await cacheGet(db, cacheKey);
    if (cached) {
      return { success: true, data: cached, _fromCache: true };
    }

    // ── 请求 Open-Meteo（过去7天 + 未来7天）──────────────────
    const hourlyVars = [
      'wave_height','wave_direction','wave_period',
      'wind_wave_height','wind_wave_direction','wind_wave_period',
      'swell_wave_height','swell_wave_direction','swell_wave_period',
      'sea_level_height_msl','sea_surface_temperature',
      'ocean_current_velocity','ocean_current_direction',
    ].join(',');

    const currentVars = [
      'wave_height','wave_direction','wave_period',
      'wind_wave_height','swell_wave_height',
      'sea_level_height_msl','sea_surface_temperature',
      'ocean_current_velocity','ocean_current_direction',
    ].join(',');

    const dailyVars = [
      'wave_height_max','wave_direction_dominant',
      'wave_period_max','swell_wave_height_max',
    ].join(',');

    // past_days=7 + forecast_days=7 = 共14天逐小时数据（168小时）
    const url = `https://marine-api.open-meteo.com/v1/marine` +
      `?latitude=${lat}&longitude=${lon}` +
      `&hourly=${hourlyVars}` +
      `&current=${currentVars}` +
      `&daily=${dailyVars}` +
      `&timezone=Asia/Shanghai` +
      `&past_days=7` +
      `&forecast_days=7` +
      `&cell_selection=sea`;

    const t0 = Date.now();
    const resp = await fetch(url, { timeout: 15000 });
    const apiData = await resp.json();
    const latencyMs = Date.now() - t0;

    logApiUsage(db, {
      openid: OPENID, apiGroup: 'open_meteo', apiName: 'marine',
      endpoint: 'https://marine-api.open-meteo.com/v1/marine',
      success: !!apiData.hourly, latencyMs,
      error: !apiData.hourly ? 'hourly 字段为空' : null,
    });

    if (!apiData.hourly) {
      return { success: false, error: 'API 返回数据为空' };
    }

    const H      = apiData.hourly;
    const times  = H.time;                    // ISO 字符串数组，共 14×24=336 条
    const levels = H.sea_level_height_msl;

    // ── 当前时刻索引 ──────────────────────────────────────────
    const now     = new Date();
    const todayStr = toDateKey(now);
    const nowHour  = `${todayStr}T${String(now.getHours()).padStart(2,'0')}:00`;
    const curIdx   = Math.max(0, times.findIndex(t => t === nowHour));

    // ── 当前实况 ──────────────────────────────────────────────
    const C = apiData.current || {};
    const tideStateKey = getTideState(levels, curIdx);
    const currentData  = {
      tideState:           TIDE_STATE_MAP[tideStateKey],
      seaLevelMSL:         C.sea_level_height_msl    != null ? parseFloat(C.sea_level_height_msl.toFixed(2))    : null,
      waveHeight:          C.wave_height              != null ? parseFloat(C.wave_height.toFixed(2))             : null,
      waveDirection:       C.wave_direction           != null ? Math.round(C.wave_direction)                     : null,
      waveDirectionStr:    degToDirection(C.wave_direction),
      wavePeriod:          C.wave_period              != null ? parseFloat(C.wave_period.toFixed(1))             : null,
      waveDesc:            waveDesc(C.wave_height),
      windWaveHeight:      C.wind_wave_height         != null ? parseFloat(C.wind_wave_height.toFixed(2))        : null,
      swellWaveHeight:     C.swell_wave_height        != null ? parseFloat(C.swell_wave_height.toFixed(2))       : null,
      sst:                 C.sea_surface_temperature  != null ? parseFloat(C.sea_surface_temperature.toFixed(1)) : null,
      currentVelocity:     C.ocean_current_velocity   != null ? parseFloat(C.ocean_current_velocity.toFixed(1))  : null,
      currentDirection:    C.ocean_current_direction  != null ? Math.round(C.ocean_current_direction)            : null,
      currentDirectionStr: degToDirection(C.ocean_current_direction),
    };

    // ── 按天分组逐小时数据 ────────────────────────────────────
    // 构建 dateKey → { tideChart, hourly, extremes } 映射
    const dayMap = {};  // key: "YYYY-MM-DD"

    times.forEach((timeStr, i) => {
      const dateKey = timeStr.slice(0, 10);  // "YYYY-MM-DD"
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          times:  [],
          levels: [],
          waves:  [],
          swells: [],
          ssts:   [],
          currents: [],
        };
      }
      const d = dayMap[dateKey];
      d.times.push(timeStr.slice(11, 16));   // "HH:MM"
      d.levels.push(levels[i] != null ? parseFloat(levels[i].toFixed(2)) : null);
      d.waves.push(H.wave_height?.[i]            != null ? parseFloat(H.wave_height[i].toFixed(2))            : null);
      d.swells.push(H.swell_wave_height?.[i]     != null ? parseFloat(H.swell_wave_height[i].toFixed(2))      : null);
      d.ssts.push(H.sea_surface_temperature?.[i] != null ? parseFloat(H.sea_surface_temperature[i].toFixed(1)) : null);
      d.currents.push(H.ocean_current_velocity?.[i] != null ? parseFloat(H.ocean_current_velocity[i].toFixed(1)) : null);
    });

    // ── 生成 14 天日历数组（-7 到 +6）──────────────────────────
    const D = apiData.daily || {};
    const dailyDates = D.time || [];

    // 从 dayMap 中按 dailyDates 顺序整理，确保顺序正确
    const allDays = dailyDates.map((dateStr, i) => {
      const dayData = dayMap[dateStr] || { times: [], levels: [], waves: [], swells: [], ssts: [], currents: [] };
      const isPast    = dateStr < todayStr;
      const isToday   = dateStr === todayStr;
      const isFuture  = dateStr > todayStr;

      // 潮位图数据（24个点）
      const tideChart = dayData.times.map((t, j) => ({
        timeStr: t,
        level:   dayData.levels[j],
      }));

      // 高低潮极值
      const extremes = extractExtremes(dayData.times, dayData.levels);

      // 逐小时浪况（横向趋势图用）
      const hourly = dayData.times.map((t, j) => ({
        timeStr:      t,
        waveHeight:   dayData.waves[j],
        swellHeight:  dayData.swells[j],
        tideLevel:    dayData.levels[j],
        sst:          dayData.ssts[j],
        currentSpeed: dayData.currents[j],
      }));

      // 日统计
      const validLevels = dayData.levels.filter(v => v != null);
      const validWaves  = dayData.waves.filter(v => v != null);

      // 日期标签
      const d = new Date(dateStr + 'T12:00:00');
      const monthDay = `${d.getMonth()+1}/${d.getDate()}`;
      let dateLabel;
      if (isToday)        dateLabel = '今天';
      else if (dateStr === new Date(new Date().setDate(now.getDate()-1)).toISOString().slice(0,10)) dateLabel = '昨天';
      else if (dateStr === new Date(new Date().setDate(now.getDate()+1)).toISOString().slice(0,10)) dateLabel = '明天';
      else                dateLabel = monthDay;

      return {
        date:       dateStr,
        dateLabel,
        weekLabel:  weekLabel(dateStr),
        isPast,
        isToday,
        isFuture,
        // 日级统计
        waveHeightMax:  D.wave_height_max?.[i]        != null ? parseFloat(D.wave_height_max[i].toFixed(2))        : null,
        waveDesc:       waveDesc(D.wave_height_max?.[i]),
        waveDirStr:     degToDirection(D.wave_direction_dominant?.[i]),
        wavePeriodMax:  D.wave_period_max?.[i]        != null ? parseFloat(D.wave_period_max[i].toFixed(1))        : null,
        swellHeightMax: D.swell_wave_height_max?.[i]  != null ? parseFloat(D.swell_wave_height_max[i].toFixed(2))  : null,
        tideLevelMax:   validLevels.length ? parseFloat(Math.max(...validLevels).toFixed(2)) : null,
        tideLevelMin:   validLevels.length ? parseFloat(Math.min(...validLevels).toFixed(2)) : null,
        // 图表数据（按需加载，打包在日历里）
        tideChart,
        extremes,
        hourly,
      };
    });

    // 今天在数组中的索引
    const todayIdx = allDays.findIndex(d => d.isToday);

    // ── 兼容旧版字段（today/tomorrow）────────────────────────
    const tideChart24h = allDays[todayIdx]?.tideChart || [];
    const todayExtremes    = allDays[todayIdx]?.extremes  || [];
    const tomorrowExtremes = allDays[todayIdx + 1]?.extremes || [];
    const hourlyForecast48h = [
      ...(allDays[todayIdx]?.hourly || []),
      ...(allDays[todayIdx + 1]?.hourly || []),
    ];

    const result = {
      currentData,
      // 旧版兼容字段（区块1/2/3/4 继续使用）
      tideChart24h,
      todayExtremes,
      tomorrowExtremes,
      hourlyForecast48h,
      // 新版：14天完整数据（区块5日历切换用）
      allDays,
      todayIdx,
      // 日级概览（仅未来7天，兼容旧版区块5）
      dailyForecast: allDays.filter(d => !d.isPast).map(d => ({
        date:           d.date,
        dateLabel:      d.dateLabel,
        waveHeightMax:  d.waveHeightMax,
        waveDesc:       d.waveDesc,
        waveDirStr:     d.waveDirStr,
        wavePeriodMax:  d.wavePeriodMax,
        swellHeightMax: d.swellHeightMax,
      })),
      meta: {
        lat: apiData.latitude, lon: apiData.longitude,
        timezone: apiData.timezone, generatedAt: new Date().toISOString(),
        totalDays: allDays.length,
      },
    };

    cacheSet(db, cacheKey, result, CACHE_TTL_MS);
    return { success: true, data: result, _fromCache: false };

  } catch (err) {
    console.error('getMarineData error:', err);
    try {
      logApiUsage(cloud.database(), {
        openid: OPENID || 'anonymous', apiGroup: 'open_meteo', apiName: 'marine',
        endpoint: 'https://marine-api.open-meteo.com/v1/marine',
        success: false, error: String(err),
      });
    } catch (_) {}
    return { success: false, error: String(err) };
  }
};
