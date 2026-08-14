// utils/savedPlaces.js — 常用地点本地 Storage 管理
// 最多保存 5 个收藏地点，数据结构：{ id, name, address, lat, lon, typeIcon, savedAt }

const STORAGE_KEY = 'saved_places_v1';
const MAX_COUNT   = 5;

// ── 读取所有收藏 ─────────────────────────────────────────────
function getAll() {
  try {
    const raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw) return [];
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// ── 保存（写回全量）─────────────────────────────────────────
function _save(list) {
  try {
    wx.setStorageSync(STORAGE_KEY, list);
  } catch (e) {
    console.warn('[savedPlaces] 写入失败:', e.message);
  }
}

// ── 添加收藏 ─────────────────────────────────────────────────
// 若同名同坐标已存在则更新 savedAt；若已满则替换最旧的
function add(place) {
  const list = getAll();
  // 去重：经纬度相近（±0.01°）或同名
  const dupIdx = list.findIndex(p =>
    p.name === place.name ||
    (Math.abs(p.lat - place.lat) < 0.01 && Math.abs(p.lon - place.lon) < 0.01)
  );

  const entry = {
    id:       place.id || `place_${Date.now()}`,
    name:     place.name,
    address:  place.address || '',
    lat:      place.lat,
    lon:      place.lon,
    typeIcon: place.typeIcon || '📍',
    savedAt:  Date.now(),
  };

  if (dupIdx >= 0) {
    // 已存在：更新
    list[dupIdx] = entry;
  } else if (list.length >= MAX_COUNT) {
    // 已满：替换最旧的
    const oldestIdx = list.reduce((minIdx, p, i, arr) =>
      p.savedAt < arr[minIdx].savedAt ? i : minIdx, 0);
    list[oldestIdx] = entry;
  } else {
    list.push(entry);
  }

  _save(list);
  return list;
}

// ── 删除收藏 ─────────────────────────────────────────────────
function remove(id) {
  const list = getAll().filter(p => p.id !== id);
  _save(list);
  return list;
}

// ── 判断某地点是否已收藏 ─────────────────────────────────────
function isSaved(place) {
  const list = getAll();
  return list.some(p =>
    p.name === place.name ||
    (Math.abs(p.lat - place.lat) < 0.01 && Math.abs(p.lon - place.lon) < 0.01)
  );
}

// ── 获取收藏 ID（用于删除）──────────────────────────────────
function getSavedId(place) {
  const list = getAll();
  const match = list.find(p =>
    p.name === place.name ||
    (Math.abs(p.lat - place.lat) < 0.01 && Math.abs(p.lon - place.lon) < 0.01)
  );
  return match ? match.id : null;
}

module.exports = { getAll, add, remove, isSaved, getSavedId, MAX_COUNT };
