// cloudfunctions/getMarineData/index.js
// 海洋数据：过去7天 + 未来7天，共14天逐小时
// 支持按天分组：hourlyByDay / tideChartByDay / extremesByDay
// 缓存策略：云端共享缓存（api_cache，TTL 1小时）

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
const { logApiUsage } = require('./logApiUsage');
const { enhanceTide, setUsageReporter } = require('./qweather-tide');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const CACHE_TTL_MS  = 60 * 60 * 1000;   // 1小时
const SOFT_TTL_MS   = 45 * 60 * 1000;   // 45分钟后允许后台刷新

// ── 云端缓存：软过期 + 单飞锁 ───────────────────────────────
// 硬过期前先软过期：命中软过期时只允许一个实例回源，其余实例继续用旧数据，
// 避免大量并发同时击穿缓存（海况/潮汐为计费接口，尤其重要）。
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
    console.warn('[cache] marine 写入失败:', e.message);
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
// times 既可能是 ISO 字符串（"2026-11-20T03:00"），也可能是已截断的 "03:00"
function toHHMM(t) {
  if (typeof t !== 'string') return t;
  return t.length >= 16 ? t.slice(11, 16) : t;
}

function extractExtremes(times, levels) {
  const extremes = [];
  for (let i = 1; i < levels.length - 1; i++) {
    if (levels[i] == null || levels[i-1] == null || levels[i+1] == null) continue;
    const isHigh = levels[i] > levels[i-1] && levels[i] > levels[i+1];
    const isLow  = levels[i] < levels[i-1] && levels[i] < levels[i+1];
    if (isHigh || isLow) {
      extremes.push({
        type: isHigh ? 'high' : 'low',
        timeStr: toHHMM(times[i]),
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

// 云函数运行时区为 UTC：显式换算北京时间（UTC+8），避免潮汐按小时索引时错 8 小时
const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
function bjDate(date) {
  return new Date((date ? date.getTime() : Date.now()) + BJ_OFFSET_MS);
}

// 将 Date 格式化为北京时间的 YYYY-MM-DD
function toDateKey(date) {
  const d = bjDate(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// 北京时间的整点（0-23）
function bjHour(date) {
  return bjDate(date).getUTCHours();
}

// 相对北京时间今天的偏移天数（-1 昨天 / +1 明天）
function bjDateKeyOffset(date, days) {
  return toDateKey(new Date((date || new Date()).getTime() + days * 24 * 60 * 60 * 1000));
}

// 星期标签
const WEEK_DAYS = ['周日','周一','周二','周三','周四','周五','周六'];
function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return WEEK_DAYS[d.getDay()];
}

exports.main = async (event, context) => {
  const { lat, lon } = event;
  // 按需潮汐：默认只增强未来 7 天；客户端滑到日历远端可请求 14 天；
  // 钓点地图等只需要浪高的场景传 needTide:false，完全不触发计费的潮汐接口
  const needTide = event.needTide !== false;
  // 和风潮汐最多未来 10 天，超过的日期只能保留模型值
  const tideDays = Math.min(10, Math.max(1, parseInt(event.tideDays, 10) || 7));
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 和风潮汐/GeoAPI 用量埋点（仅统计，不影响业务逻辑）
  setUsageReporter(function (opts) {
    logApiUsage(db, {
      openid: OPENID || 'anonymous',
      apiGroup: 'qweather',
      apiName: opts.apiName,
      endpoint: opts.endpoint,
      success: opts.success,
      latencyMs: opts.latencyMs,
      error: opts.error,
    });
  });

  // 缓存 key（0.5° 精度 + 北京日期）：todayIdx/“今天”标签在生成时固化，
  // 跨天后旧缓存会整体错一天，必须按日隔离
  const sLat = (Math.round(lat / 0.5) * 0.5).toFixed(1);
  const sLon = (Math.round(lon / 0.5) * 0.5).toFixed(1);
  const cacheKey = `marine14_${sLat}_${sLon}_${toDateKey(new Date())}_${needTide ? 't' + tideDays : 'nt'}`;

  try {
    // ── 缓存优先 + 软过期单飞刷新 ──────────────────────────────
    // 海况/潮汐为计费接口：软过期后只允许一个实例回源，其余用户直接拿旧数据
    const out = await withCache(db, cacheKey, CACHE_TTL_MS, SOFT_TTL_MS, async () => {
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

    if (!apiData.hourly) return null;

    const H      = apiData.hourly;
    const times  = H.time;                    // ISO 字符串数组，共 14×24=336 条
    const levels = H.sea_level_height_msl;

    // ── 当前时刻索引 ──────────────────────────────────────────
    const now     = new Date();
    const todayStr = toDateKey(now);
    const nowHour  = `${todayStr}T${String(bjHour(now)).padStart(2,'0')}:00`;
    const curIdx   = Math.max(0, times.findIndex(t => t === nowHour));

    // ── 当前实况 ──────────────────────────────────────────────
    const C = apiData.current || {};
    const tideStateKey = getTideState(levels, curIdx);
    const currentData  = {
      tideState:           TIDE_STATE_MAP[tideStateKey],
      seaLevelMSL:         C.sea_level_height_msl    != null ? parseFloat(C.sea_level_height_msl.toFixed(2))    : null,
      // 当前潮高实际使用的基准面；和风验潮站覆盖后改为 station
      seaLevelDatum:       'msl',
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
      const monthDay = `${Number(dateStr.slice(5, 7))}/${Number(dateStr.slice(8, 10))}`;
      let dateLabel;
      if (isToday)        dateLabel = '今天';
      else if (dateStr === bjDateKeyOffset(now, -1)) dateLabel = '昨天';
      else if (dateStr === bjDateKeyOffset(now, 1))  dateLabel = '明天';
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

    // ── 和风天气潮汐覆盖（未配置凭据或失败时保留模型数据）────
    let tideMeta = { source: 'model', label: '模型推算' };
    try {
      if (needTide) {
        const qw = await enhanceTide({ db, lat, lon, allDays, todayIdx, now, days: tideDays });
        if (qw && qw.meta) {
          tideMeta = qw.meta;
          if (qw.current && qw.current.level != null) {
            currentData.seaLevelMSL = qw.current.level;
            currentData.seaLevelDatum = 'station';
            const stateKey = getTideState(qw.current.levels, qw.current.idx);
            currentData.tideState = TIDE_STATE_MAP[stateKey];
          } else if (qw.meta.source === 'qweather' &&
            String((allDays[todayIdx] && allDays[todayIdx].tideSource) || '').indexOf('qweather') === 0) {
            // 和风已生效但今天缺当前整点：仅当今天也是验潮站口径时才从当日曲线取值，
            // 否则会把模型 MSL 值误标成当地基准面
            const chart = allDays[todayIdx]?.tideChart || [];
            const h = bjHour(now);
            const levels = chart.map(p => p.level);
            let idx = chart.findIndex(p => p.timeStr === `${String(h).padStart(2, '0')}:00`);
            if (idx < 0 || levels[idx] == null) {
              let bestDist = 99;
              chart.forEach((p, i) => {
                if (p.level == null) return;
                const dist = Math.abs(parseInt(p.timeStr, 10) - h);
                if (dist < bestDist) { bestDist = dist; idx = i; }
              });
            }
            if (idx >= 0 && levels[idx] != null) {
              currentData.seaLevelMSL = levels[idx];
              currentData.seaLevelDatum = 'station';
              currentData.tideState = TIDE_STATE_MAP[getTideState(levels, idx)];
            }
          }
        }
      }
    } catch (e) {
      console.warn('[qweather-tide] skipped:', e.message);
    }

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
      // 潮汐数据来源（qweather=验潮站实测，model=模型推算）
      tideMeta,
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

    return result;
    });

    if (!out.data) return { success: false, error: 'API 返回数据为空' };
    return {
      success: true,
      data: out.data,
      _fromCache: out.fromCache,
      _stale: !!out.stale,
      _cachedAt: out.cachedAt,
    };

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
