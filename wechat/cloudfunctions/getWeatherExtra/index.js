// cloudfunctions/getWeatherExtra/index.js
// 和风天气扩展数据（按变化频率拆成三份缓存）：
//   天文 API  → 日出日落、月升月落、月相（12 小时）
//   生活指数  → 钓鱼指数（6 小时）
//   预警 + 分钟级降水（10 分钟，分钟降水按需请求）
// 任一子接口失败都不影响其它数据；未配置凭据时返回 source:'none'，由前端降级为本地算法。

const cloud = require('wx-server-sdk');
const { logApiUsage } = require('./logApiUsage');
const { readConfig, apiGet } = require('./qweather');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 按数据变化频率分层的 TTL
const ASTRO_TTL_MS   = 12 * 60 * 60 * 1000;   // 12 小时：日出日落/月相按天变
const ASTRO_SOFT_MS  = 11 * 60 * 60 * 1000;
const INDEX_TTL_MS   = 6 * 60 * 60 * 1000;    // 6 小时：生活指数按天变
const INDEX_SOFT_MS  = 5 * 60 * 60 * 1000;
const NOW_TTL_MS     = 10 * 60 * 1000;        // 10 分钟：预警/分钟降水变化快
const NOW_SOFT_MS    = 8 * 60 * 1000;

// ── 云端缓存：软过期 + 单飞锁 ───────────────────────────────
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
      // 业务数据内不能再带 _id，否则云数据库会报 -501007
      data: {
        data,
        cachedAt: new Date(now).toISOString(),
        softExpireAt: new Date(now + soft + jitter).toISOString(),
        expireAt: new Date(now + ttlMs + jitter).toISOString(),
      },
    });
    return new Date(now).toISOString();
  } catch (e) {
    console.warn('[cache] extra 写入失败:', e.message);
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

// ── 工具 ─────────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, '0');

// "2026-11-20T06:23+08:00" → "06:23"
function fxTimeToHHMM(fxTime) {
  if (typeof fxTime !== 'string' || fxTime.length < 16) return null;
  return fxTime.slice(11, 16);
}

function dateKey(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

const WARN_COLORS = {
  Blue:   { colorClass: 'blue',   icon: '🔵' },
  Yellow: { colorClass: 'yellow', icon: '🟡' },
  Orange: { colorClass: 'orange', icon: '🟠' },
  Red:    { colorClass: 'red',    icon: '🔴' },
};

function normalizeSun(json) {
  if (!json) return null;
  const sunrise = fxTimeToHHMM(json.sunrise);
  const sunset  = fxTimeToHHMM(json.sunset);
  if (!sunrise && !sunset) return null;
  return { sunrise, sunset };
}

function normalizeMoon(json) {
  if (!json) return null;
  const phase = Array.isArray(json.moonPhase) && json.moonPhase.length
    ? json.moonPhase[0] : null;
  const moonrise = fxTimeToHHMM(json.moonrise);
  const moonset  = fxTimeToHHMM(json.moonset);
  if (!moonrise && !moonset && !phase) return null;
  return {
    moonrise,
    moonset,
    phase: phase ? {
      value: phase.value != null ? parseFloat(phase.value) : null,
      name:  phase.name || null,
      icon:  phase.icon || null,
      illum: phase.illum != null ? parseFloat(phase.illum) : null,
    } : null,
  };
}

function normalizeFishing(json) {
  const d = json && Array.isArray(json.daily) ? json.daily[0] : null;
  if (!d) return null;
  return {
    level:    d.level || null,
    category: d.category || null,
    text:     d.text || null,
  };
}

function normalizeWarnings(json) {
  if (!json || !Array.isArray(json.warning)) return [];
  return json.warning
    .filter(w => !w.status || w.status === 'active' || w.status === 'update')
    .slice(0, 3)
    .map(w => {
      const rawColor = w.severityColor || '';
      const colorKey = rawColor.charAt(0).toUpperCase() + rawColor.slice(1).toLowerCase();
      const c = WARN_COLORS[colorKey] || WARN_COLORS.Yellow;
      return {
        id:        w.id || '',
        title:     w.title || `${w.typeName || ''}预警`,
        typeName:  w.typeName || '',
        level:     w.level || '',
        severity:  w.severity || '',
        colorClass: c.colorClass,
        icon:      c.icon,
        text:      w.text || '',
        pubTime:   fxTimeToHHMM(w.pubTime),
      };
    });
}

function normalizeMinutely(json) {
  if (!json || !json.summary) return null;
  const list = Array.isArray(json.minutely) ? json.minutely : [];
  let nextRainMin = null;
  for (let i = 0; i < list.length; i++) {
    if (parseFloat(list[i].precip) > 0) { nextRainMin = i * 5; break; }
  }
  return {
    summary: json.summary,
    hasRain: nextRainMin != null,
    nextRainMin,
  };
}

exports.main = async (event, context) => {
  const { lat, lon } = event || {};
  const needRain = event && (event.needRain === true || event.needRain === 'true');
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return { success: false, error: '缺少坐标参数' };
  }

  // 0.1° 网格（≈11km），同城用户共享缓存
  const sLat = (Math.round(lat / 0.1) * 0.1).toFixed(1);
  const sLon = (Math.round(lon / 0.1) * 0.1).toFixed(1);
  const astroKey = `wextra_astro_${sLat}_${sLon}`;
  const indexKey = `wextra_idx_${sLat}_${sLon}`;
  // 有降水时才请求分钟级，缓存 key 区分，避免“晴天缓存”挡住雨天数据
  const nowKey = `wextra_now_${needRain ? 'rain' : 'dry'}_${sLat}_${sLon}`;

  const cfg = readConfig();
  if (!cfg) {
    // 未配置凭据：不写缓存，配置后立即生效
    return { success: true, data: { source: 'none', reason: '未配置和风天气凭据' } };
  }

  // 和风 v7 接口要求经度,纬度最多两位小数（分钟级降水等接口超精度会报参数错误）
  const loc = `${lon.toFixed(2)},${lat.toFixed(2)}`;
  const today = dateKey(new Date());

  try {
    // ── 天文：12 小时缓存 ────────────────────────────────────
    const astro = await withCache(db, astroKey, ASTRO_TTL_MS, ASTRO_SOFT_MS, async () => {
      const t0 = Date.now();
      const [sunRes, moonRes] = await Promise.allSettled([
        apiGet(cfg, `/v7/astronomy/sun?location=${loc}&date=${today}`),
        apiGet(cfg, `/v7/astronomy/moon?location=${loc}&date=${today}`),
      ]);
      const latencyMs = Date.now() - t0;
      const sun  = sunRes.status === 'fulfilled' ? normalizeSun(sunRes.value) : null;
      const moon = moonRes.status === 'fulfilled' ? normalizeMoon(moonRes.value) : null;

      logApiUsage(db, {
        openid: OPENID, apiGroup: 'qweather', apiName: 'extra_astro',
        endpoint: `${cfg.host}/v7/astronomy`,
        success: !!(sun || moon), latencyMs,
        error: (sun || moon) ? null : '天文接口失败',
      });

      if (!sun && !moon) return null;   // 失败不缓存，下次继续尝试
      return { sun, moon, fetchedAt: new Date().toISOString() };
    });

    // ── 生活指数：6 小时缓存 ────────────────────────────────
    const index = await withCache(db, indexKey, INDEX_TTL_MS, INDEX_SOFT_MS, async () => {
      const t0 = Date.now();
      try {
        const json = await apiGet(cfg, `/v7/indices/1d?type=4&location=${loc}`);
        const fishing = normalizeFishing(json);
        logApiUsage(db, {
          openid: OPENID, apiGroup: 'qweather', apiName: 'extra_indices',
          endpoint: `${cfg.host}/v7/indices/1d?type=4`,
          success: !!fishing, latencyMs: Date.now() - t0,
          error: fishing ? null : '指数返回为空',
        });
        if (!fishing) return null;
        return { fishing, fetchedAt: new Date().toISOString() };
      } catch (e) {
        logApiUsage(db, {
          openid: OPENID, apiGroup: 'qweather', apiName: 'extra_indices',
          endpoint: `${cfg.host}/v7/indices/1d?type=4`,
          success: false, latencyMs: Date.now() - t0, error: String(e),
        });
        return null;
      }
    });

    // ── 预警 + 分钟降水：10 分钟缓存 ─────────────────────────
    const now = await withCache(db, nowKey, NOW_TTL_MS, NOW_SOFT_MS, async () => {
      const t0 = Date.now();
      const reqs = [apiGet(cfg, `/v7/warning/now?location=${loc}&lang=zh`)];
      if (needRain) reqs.push(apiGet(cfg, `/v7/minutely/5m?location=${loc}`));

      const settled = await Promise.allSettled(reqs);
      const warnRes = settled[0];
      const warnings = warnRes.status === 'fulfilled' ? normalizeWarnings(warnRes.value) : [];
      const minutely = needRain && settled[1] && settled[1].status === 'fulfilled'
        ? normalizeMinutely(settled[1].value) : null;

      logApiUsage(db, {
        openid: OPENID, apiGroup: 'qweather', apiName: 'extra_warning',
        endpoint: `${cfg.host}/v7/warning/now`,
        success: warnRes.status === 'fulfilled', latencyMs: Date.now() - t0,
        error: warnRes.status === 'fulfilled' ? null : '预警接口失败',
      });
      if (needRain) {
        logApiUsage(db, {
          openid: OPENID, apiGroup: 'qweather', apiName: 'extra_minutely',
          endpoint: `${cfg.host}/v7/minutely/5m`,
          success: settled[1] && settled[1].status === 'fulfilled',
          latencyMs: Date.now() - t0,
          error: settled[1] && settled[1].status === 'fulfilled' ? null : '分钟降水接口失败',
        });
      }

      // 预警接口失败时不写缓存，避免把“无预警”错误固化 10 分钟
      if (warnRes.status !== 'fulfilled') return null;
      return {
        warnings,
        minutely,
        minutelyRequested: needRain,
        fetchedAt: new Date().toISOString(),
      };
    });

    const sun      = astro.data ? astro.data.sun : null;
    const moon     = astro.data ? astro.data.moon : null;
    const fishing  = index.data ? index.data.fishing : null;
    const warnings = now.data ? now.data.warnings : [];
    const minutely = now.data ? now.data.minutely : null;

    const result = {
      source: (sun || moon || fishing) ? 'qweather' : 'none',
      sun,
      moon,
      fishing,
      warnings,
      minutely,
      minutelyRequested: needRain,
      fetchedAt: new Date().toISOString(),
      // 各模块的缓存时间，客户端用于展示“更新于”
      cachedAt: {
        astro:   astro.cachedAt,
        indices: index.cachedAt,
        now:     now.cachedAt,
      },
    };

    return {
      success: true,
      data: result,
      _fromCache: astro.fromCache && index.fromCache && now.fromCache,
      _cache: {
        astro:   astro.fromCache,
        indices: index.fromCache,
        now:     now.fromCache,
      },
    };
  } catch (err) {
    console.error('getWeatherExtra error:', err);
    return { success: false, error: String(err) };
  }
};
