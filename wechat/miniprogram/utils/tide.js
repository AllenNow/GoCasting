// utils/tide.js — 潮汐算法（统一来源，weather 和 go-score 共享）
// 厦门港谐波参数 (M2/S2/K1/O1)
const TIDE_PARAMS = {
  M2: { amp: 2.15, phase: 215.0, speed: 28.9841042 },
  S2: { amp: 0.78, phase: 248.0, speed: 30.0 },
  K1: { amp: 0.62, phase: 185.0, speed: 15.0410686 },
  O1: { amp: 0.45, phase: 168.0, speed: 13.9430356 },
};

/**
 * 预测指定小时偏移量的潮高（米）
 * @param {number} hourOffset 距当前的小时偏移
 * @returns {number} 潮高（米）
 */
function predictTide(hourOffset) {
  if (hourOffset === undefined) hourOffset = 0;
  const t = (Date.now() / 3600000) + hourOffset;
  return Object.values(TIDE_PARAMS).reduce(function(h, c) {
    return h + c.amp * Math.cos((c.speed * t - c.phase) * Math.PI / 180);
  }, 0);
}

/**
 * 计算指定偏移的潮汐状态
 * @param {number} hourOffset
 * @returns {'rising'|'falling'|'high'|'low'}
 */
function getTideState(hourOffset) {
  if (hourOffset === undefined) hourOffset = 0;
  const h0 = predictTide(hourOffset);
  const h1 = predictTide(hourOffset + 0.5);
  if (h1 > h0 + 0.05) return 'rising';
  if (h1 < h0 - 0.05) return 'falling';
  return h0 > 1.5 ? 'high' : 'low';
}

/**
 * 潮汐状态转中文标签和图标
 */
const TIDE_LABEL_MAP = {
  rising:  { label: '涨潮', icon: '🌊', value: 'rising' },
  falling: { label: '退潮', icon: '↘️', value: 'falling' },
  high:    { label: '高潮', icon: '⬆️', value: 'high' },
  low:     { label: '低潮', icon: '⬇️', value: 'low' },
};

function getTideDisplay(state) {
  return TIDE_LABEL_MAP[state] || TIDE_LABEL_MAP.low;
}

/**
 * 生成未来 N 小时潮高数据
 * @param {number} hours 小时数，默认 12
 */
function buildTideChart(hours) {
  if (!hours) hours = 12;
  var points = [];
  for (var i = 0; i <= hours; i++) {
    points.push({ hour: i, height: parseFloat(predictTide(i).toFixed(2)) });
  }
  return points;
}

module.exports = { predictTide, getTideState, getTideDisplay, buildTideChart, TIDE_PARAMS };
