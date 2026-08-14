// utils/apiCache.js — 客户端本地缓存工具
// 基于 wx.Storage，支持 TTL 过期、坐标归一化、命中率统计
// 所有操作同步执行，不阻塞主流程

const CACHE_PREFIX = 'apicache_';

// ── TTL 配置（毫秒）─────────────────────────────────────────
const TTL = {
  regeo:            30 * 24 * 60 * 60 * 1000,  // 30天（城市名几乎不变）
  weather_live:     20 * 60 * 1000,             // 20分钟
  weather_forecast:  3 * 60 * 60 * 1000,        // 3小时
  marine:           60 * 60 * 1000,             // 1小时（潮汐逐小时更新）
};

// ── 坐标归一化：减少缓存 key 碎片 ────────────────────────────
// regeo:   精度 0.1°（≈11km），同城市完全复用
// marine:  精度 0.5°（≈55km），海洋数据大范围均匀
const GEO_PRECISION = {
  regeo:   0.1,
  marine:  0.5,
  weather: 0.1,  // weather 用 adcode，但坐标 key 同 regeo
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

// ── 读缓存 ──────────────────────────────────────────────────
/**
 * 读取并校验缓存条目
 * @param {string} key
 * @returns {any|null} 有效则返回 data，过期或不存在返回 null
 */
function get(key) {
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
    return entry.data;
  } catch (e) {
    return null;
  }
}

// ── 写缓存 ──────────────────────────────────────────────────
/**
 * 写入缓存条目
 * @param {string} key
 * @param {any}    data
 * @param {number} ttlMs - 生存时间（毫秒）
 */
function set(key, data, ttlMs) {
  try {
    wx.setStorageSync(key, {
      data,
      expireAt:  Date.now() + ttlMs,
      cachedAt:  Date.now(),
    });
  } catch (e) {
    // Storage 写满时静默忽略
    console.warn('[apiCache] 写入失败:', key, e.message);
  }
}

// ── 强制失效（手动下拉刷新时调用）──────────────────────────
/**
 * 清除所有 apiCache 相关的缓存键
 */
function invalidateAll() {
  try {
    const info = wx.getStorageInfoSync();
    const keys  = (info.keys || []).filter(k => k.startsWith(CACHE_PREFIX));
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
 * @returns {{ key, apiName, cachedAt, expireAt, remainMs, expired }[]}
 */
function getStats() {
  try {
    const info = wx.getStorageInfoSync();
    const keys  = (info.keys || []).filter(k => k.startsWith(CACHE_PREFIX));
    const now   = Date.now();
    return keys.map(k => {
      try {
        const entry = wx.getStorageSync(k);
        const e = typeof entry === 'string' ? JSON.parse(entry) : entry;
        return {
          key:       k.replace(CACHE_PREFIX, ''),
          cachedAt:  e?.cachedAt  ? new Date(e.cachedAt).toLocaleTimeString()  : '—',
          expireAt:  e?.expireAt  ? new Date(e.expireAt).toLocaleTimeString()  : '—',
          remainMs:  e?.expireAt  ? Math.max(0, e.expireAt - now) : 0,
          expired:   e?.expireAt  ? now > e.expireAt : true,
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
  set,
  geoKey,
  adcodeKey,
  invalidateAll,
  invalidateByName,
  getStats,
};
