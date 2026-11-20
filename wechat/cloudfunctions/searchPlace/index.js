// cloudfunctions/searchPlace/index.js
// 高德 POI 搜索：关键词 → 地点列表（含坐标）
// 同时支持：城市名纯文本搜索 + 行政区划搜索
// 结果缓存 24 小时（POI 数据变化极慢）

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AMAP_KEY   = process.env.AMAP_KEY || 'b5fddea474402d2c2e263595eee40006';
const CACHE_TTL  = 24 * 60 * 60 * 1000;  // 24 小时
const SOFT_TTL   = 12 * 60 * 60 * 1000;  // 12 小时后允许后台刷新

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
      data: {
        data,
        cachedAt: new Date(now).toISOString(),
        softExpireAt: new Date(now + soft + jitter).toISOString(),
        expireAt: new Date(now + ttlMs + jitter).toISOString(),
      },
    });
    return new Date(now).toISOString();
  } catch (e) {
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

// 高德坐标（GCJ-02 "经度,纬度"）→ { lat, lon }
function parseLocation(locationStr) {
  if (!locationStr) return null;
  const [lon, lat] = locationStr.split(',').map(Number);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat: parseFloat(lat.toFixed(5)), lon: parseFloat(lon.toFixed(5)) };
}

exports.main = async (event, context) => {
  const { keyword, city } = event;  // city 可选，限制搜索城市
  if (!keyword || !keyword.trim()) {
    return { success: false, error: '关键词不能为空' };
  }

  const kw        = keyword.trim().slice(0, 50);  // 防止过长
  const cityParam = city ? `&city=${encodeURIComponent(city)}&citylimit=false` : '';
  const cacheKey  = `place_${kw}_${city || 'all'}`;
  const db        = cloud.database();

  try {
    const out = await withCache(db, cacheKey, CACHE_TTL, SOFT_TTL, async () => {
      // ── 并行：POI 关键词搜索 + 行政区划搜索 ─────────────────
      const poiUrl  = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(kw)}&types=&output=json&offset=10&page=1${cityParam}&key=${AMAP_KEY}`;
      const distUrl = `https://restapi.amap.com/v3/config/district?keywords=${encodeURIComponent(kw)}&subdistrict=0&extensions=base&key=${AMAP_KEY}`;

      const [poiRes, distRes] = await Promise.allSettled([
        fetch(poiUrl).then(r => r.json()),
        fetch(distUrl).then(r => r.json()),
      ]);

      const results = [];

      // 处理行政区划（优先：城市/区县直接命中）
      if (distRes.status === 'fulfilled' && distRes.value?.districts) {
        distRes.value.districts.slice(0, 3).forEach(d => {
          if (!d.center) return;
          const coords = parseLocation(d.center);
          if (!coords) return;
          results.push({
            id:       `dist_${d.adcode}`,
            name:     d.name,
            address:  d.name,
            type:     'district',
            typeIcon: '🏙️',
            lat:      coords.lat,
            lon:      coords.lon,
            adcode:   d.adcode,
          });
        });
      }

      // 处理 POI 结果
      if (poiRes.status === 'fulfilled' && poiRes.value?.pois) {
        poiRes.value.pois.slice(0, 8).forEach(p => {
          if (!p.location) return;
          const coords = parseLocation(p.location);
          if (!coords) return;
          const isDup = results.some(r => Math.abs(r.lat - coords.lat) < 0.01 && Math.abs(r.lon - coords.lon) < 0.01);
          if (isDup) return;

          const typeCode = p.typecode || '';
          let typeIcon = '📍';
          if (typeCode.startsWith('190') || p.name.includes('海') || p.name.includes('港')) typeIcon = '🌊';
          else if (typeCode.startsWith('060')) typeIcon = '🏖️';
          else if (p.name.includes('钓')) typeIcon = '🎣';

          results.push({
            id:       `poi_${p.id}`,
            name:     p.name,
            address:  p.pname + (p.cityname !== p.pname ? p.cityname : '') + p.adname,
            type:     'poi',
            typeIcon,
            lat:      coords.lat,
            lon:      coords.lon,
            adcode:   p.adcode,
          });
        });
      }

      if (!results.length) return null;
      return { results: results.slice(0, 10), keyword: kw };
    });

    if (!out.data) {
      return { success: true, data: { results: [], keyword: kw }, _fromCache: false };
    }
    return {
      success: true,
      data: out.data,
      _fromCache: out.fromCache,
      _cachedAt: out.cachedAt,
    };

  } catch (err) {
    console.error('searchPlace error:', err);
    return { success: false, error: String(err) };
  }
};
