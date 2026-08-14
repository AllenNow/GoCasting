// cloudfunctions/searchPlace/index.js
// 高德 POI 搜索：关键词 → 地点列表（含坐标）
// 同时支持：城市名纯文本搜索 + 行政区划搜索
// 结果缓存 24 小时（POI 数据变化极慢）

const cloud = require('wx-server-sdk');
const fetch  = require('node-fetch');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AMAP_KEY   = 'b5fddea474402d2c2e263595eee40006';
const CACHE_TTL  = 24 * 60 * 60 * 1000;  // 24 小时

// ── 云端缓存读写（复用 api_cache 集合）──────────────────────
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
      data: {
        _id: key, data,
        expireAt: new Date(Date.now() + ttlMs).toISOString(),
        cachedAt: db.serverDate(),
      },
    });
  } catch (e) {}
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

  const kw       = keyword.trim().slice(0, 50);  // 防止过长
  const cityParam = city ? `&city=${encodeURIComponent(city)}&citylimit=false` : '';
  const cacheKey  = `place_${kw}_${city || 'all'}`;
  const db        = cloud.database();

  // ── 查缓存 ────────────────────────────────────────────────
  const cached = await cacheGet(db, cacheKey);
  if (cached) return { success: true, data: cached, _fromCache: true };

  try {
    // ── 并行：POI 关键词搜索 + 行政区划搜索 ─────────────────
    // POI 搜索：找具体地点（海滩、钓鱼场、港口等）
    const poiUrl  = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(kw)}&types=&output=json&offset=10&page=1${cityParam}&key=${AMAP_KEY}`;
    // 行政区划搜索：找城市/区县
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
        // 过滤掉与行政区划重复的
        const isDup = results.some(r => Math.abs(r.lat - coords.lat) < 0.01 && Math.abs(r.lon - coords.lon) < 0.01);
        if (isDup) return;

        // 根据 POI 类型给 icon
        const typeCode = p.typecode || '';
        let typeIcon = '📍';
        if (typeCode.startsWith('190') || p.name.includes('海') || p.name.includes('港')) typeIcon = '🌊';
        else if (typeCode.startsWith('060')) typeIcon = '🏖️';  // 景点
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

    if (!results.length) {
      return { success: true, data: { results: [], keyword: kw } };
    }

    const data = { results: results.slice(0, 10), keyword: kw };
    cacheSet(db, cacheKey, data, CACHE_TTL);
    return { success: true, data };

  } catch (err) {
    console.error('searchPlace error:', err);
    return { success: false, error: String(err) };
  }
};
