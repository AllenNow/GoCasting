// utils/apiCache.js — 客户端本地缓存工具
// 基于 wx.Storage，支持 TTL 过期、坐标归一化、命中率统计
// 所有操作同步执行，不阻塞主流程

const CACHE_PREFIX = 'apicache_';

// ── TTL 配置（毫秒）─────────────────────────────────────────
// 与云端缓存对齐：客户端 TTL 不小于云端 TTL，避免“本地过期后
// 调云函数又拿到同一份云端缓存”的无谓调用。
const TTL = {
  regeo:            30 * 24 * 60 * 60 * 1000,  // 30天（城市名几乎不变）
  weather_live:     15 * 60 * 1000,             // 15分钟（与 getWeather 对齐）
  weather_forecast:  3 * 60 * 60 * 1000,        // 3小时
  marine:           60 * 60 * 1000,             // 1小时（潮汐逐小时更新）
  atmos:            60 * 60 * 1000,             // 1小时（气压/鱼口，与云端对齐）
  astro:            12 * 60 * 60 * 1000,        // 12小时（日出日落/月相按天变）
  indices:           6 * 60 * 60 * 1000,        // 6小时（钓鱼指数按天变）
  extra_now:        10 * 60 * 1000,             // 10分钟（预警/分钟降水）
  extra:            15 * 60 * 1000,             // 兼容旧版聚合缓存
};

// ── 坐标归一化：减少缓存 key 碎片 ────────────────────────────
// regeo/weather/atmos/astro/indices：0.1°（≈11km），与云端一致
// marine：0.5°（≈55km），海洋数据大范围均匀
const GEO_PRECISION = {
  regeo:     0.1,
  marine:    0.5,
  weather:   0.1,
  atmos:     0.1,
  astro:     0.1,
  indices:   0.1,
  extra_now: 0.1,
};

/**
 * 把浮点坐标归一化到指定精度网格
 * @param {number} val - 原始坐标值
 * @param {number} precision - 精度（如 0.1、0.5）
 * @returns {number} 归一化后的值
 */
function snapCoord(val, precision) {
  return Math.round(val / precision) * precision;
}

/**
 * 生成坐标类缓存 key
 * @param {string} apiName - 接口名
 * @param {number} lat
 * @param {number} lon
 * @returns {string} 缓存 key
 */
function geoKey(apiName, lat, lon) {
  const prec = GEO_PRECISION[apiName] || 0.1;
  const sLat = snapCoord(lat, prec).toFixed(1);
  const sLon = snapCoord(lon, prec).toFixed(1);
  return `${CACHE_PREFIX}${apiName}_${sLat}_${sLon}`;
}

/**
 * 生成 adcode 类缓存 key（高德天气用）
 * @param {string} apiName
 * @param {string} adcode
 */
function adcodeKey(apiName, adcode) {
  return `${CACHE_PREFIX}${apiName}_${adcode}`;
}

// ── 读缓存（带元信息）───────────────────────────────────────
/**
 * 读取缓存条目，同时返回写入时间，供 UI 展示“更新于”
 * @param {string} key
 * @returns {{data:any, cachedAt:number|null, expireAt:number|null}|null}
 */
function getEntry(key) {
  try {
    const raw = wx.getStorageSync(key);
    if (!raw) return null;
    const entry = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!entry || !entry.expireAt) return null;
    if (Date.now() > entry.expireAt) {
      // 过期，异步删除（不阻塞）
      wx.removeStorage({ key });
      return null;
    }
    return {
      data: entry.data,
      cachedAt: entry.cachedAt || null,
      expireAt: entry.expireAt,
    };
  } catch (e) {
    return null;
  }
}

/**
 * 读取缓存数据
 * @param {string} key
 * @returns {any|null} 有效则返回 data，过期或不存在返回 null
 */
function get(key) {
  const entry = getEntry(key);
  return entry ? entry.data : null;
}

// ── 写缓存 ──────────────────────────────────────────────────
/**
 * 写入缓存条目
 * @param {string} key
 * @param {any}    data
 * @param {number} ttlMs - 生存时间（毫秒）
 */
function set(key, data, ttlMs) {
  const now = Date.now();
  try {
    wx.setStorageSync(key, {
      data,
      expireAt: now + ttlMs,
      cachedAt: now,
    });
  } catch (e) {
    // Storage 写满时静默忽略
    console.warn('[apiCache] 写入失败:', key, e.message);
  }
}

// ── 删除单个缓存 ────────────────────────────────────────────
function remove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {}
}

// ── 强制失效（仅用于彻底重置，如切换账号）──────────────────
/**
 * 清除所有 apiCache 相关的缓存键（含旧版 atmos_ 前缀）
 */
function invalidateAll() {
  try {
    const info = wx.getStorageInfoSync();
    const keys  = (info.keys || []).filter(
      k => k.startsWith(CACHE_PREFIX) || k.startsWith('atmos_')
    );
    keys.forEach(k => wx.removeStorageSync(k));
    console.log(`[apiCache] 已清除 ${keys.length} 条缓存`);
  } catch (e) {
    console.warn('[apiCache] 清除失败:', e.message);
  }
}

/**
 * 清除指定 apiName 相关缓存
 * @param {string} apiName
 */
function invalidateByName(apiName) {
  try {
    const info = wx.getStorageInfoSync();
    const prefix = `${CACHE_PREFIX}${apiName}_`;
    const keys  = (info.keys || []).filter(k => k.startsWith(prefix));
    keys.forEach(k => wx.removeStorageSync(k));
  } catch (e) {}
}

// ── 缓存状态查询（给 UI 展示用）─────────────────────────────
/**
 * 返回当前所有 apiCache 条目的摘要信息
 * @returns {{ key, apiName, cachedAt, cachedAtMs, expireAt, remainMs, expired }[]}
 */
function getStats() {
  try {
    const info = wx.getStorageInfoSync();
    const keys  = (info.keys || []).filter(
      k => k.startsWith(CACHE_PREFIX) || k.startsWith('atmos_')
    );
    const now   = Date.now();
    return keys.map(k => {
      try {
        const entry = wx.getStorageSync(k);
        const e = typeof entry === 'string' ? JSON.parse(entry) : entry;
        const cachedAtMs = e?.cachedAt || null;
        return {
          key:        k.replace(CACHE_PREFIX, ''),
          cachedAt:   cachedAtMs ? new Date(cachedAtMs).toLocaleTimeString() : '—',
          cachedAtMs,
          expireAt:   e?.expireAt ? new Date(e.expireAt).toLocaleTimeString() : '—',
          remainMs:   e?.expireAt ? Math.max(0, e.expireAt - now) : 0,
          expired:    e?.expireAt ? now > e.expireAt : true,
        };
      } catch (_) {
        return { key: k, expired: true };
      }
    });
  } catch (e) {
    return [];
  }
}

module.exports = {
  TTL,
  get,
  getEntry,
  set,
  remove,
  geoKey,
  adcodeKey,
  invalidateAll,
  invalidateByName,
  getStats,
};
