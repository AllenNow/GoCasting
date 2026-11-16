// utils/savedPlaces.js — 常用地点本地 Storage 管理 (ES5 兼容版)
// 最多保存 5 个收藏地点，数据结构：{ id, name, address, lat, lon, typeIcon, savedAt }

var STORAGE_KEY = 'saved_places_v1';
var MAX_COUNT   = 5;

// ── 读取所有收藏 ─────────────────────────────────────────────
function getAll() {
  try {
    var raw = wx.getStorageSync(STORAGE_KEY);
    if (!raw) return [];
    var list = typeof raw === 'string' ? JSON.parse(raw) : raw;
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

// ── 查找重复索引 ─────────────────────────────────────────────
function _findDupIndex(list, place) {
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (p.name === place.name ||
        (Math.abs(p.lat - place.lat) < 0.01 && Math.abs(p.lon - place.lon) < 0.01)) {
      return i;
    }
  }
  return -1;
}

// ── 查找最旧索引 ─────────────────────────────────────────────
function _findOldestIndex(list) {
  var minIdx = 0;
  for (var i = 1; i < list.length; i++) {
    if (list[i].savedAt < list[minIdx].savedAt) {
      minIdx = i;
    }
  }
  return minIdx;
}

// ── 添加收藏 ─────────────────────────────────────────────────
// 若同名同坐标已存在则更新 savedAt；若已满则替换最旧的
function add(place) {
  var list = getAll();
  var dupIdx = _findDupIndex(list, place);

  var entry = {
    id:       place.id || ('place_' + Date.now()),
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
    var oldestIdx = _findOldestIndex(list);
    list[oldestIdx] = entry;
  } else {
    list.push(entry);
  }

  _save(list);
  return list;
}

// ── 删除收藏 ─────────────────────────────────────────────────
function remove(id) {
  var list = getAll();
  var filtered = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) {
      filtered.push(list[i]);
    }
  }
  _save(filtered);
  return filtered;
}

// ── 判断某地点是否已收藏 ─────────────────────────────────────
function isSaved(place) {
  var list = getAll();
  return _findDupIndex(list, place) !== -1;
}

// ── 获取收藏 ID（用于删除）──────────────────────────────────
function getSavedId(place) {
  var list = getAll();
  var idx = _findDupIndex(list, place);
  return idx !== -1 ? list[idx].id : null;
}

module.exports = { 
  getAll: getAll, 
  add: add, 
  remove: remove, 
  isSaved: isSaved, 
  getSavedId: getSavedId, 
  MAX_COUNT: MAX_COUNT 
};
