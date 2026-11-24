// utils/tideUtils.js — 潮汐数据口径统一工具
// 潮型分档在两处页面（潮汐页 / 天气详情页）必须完全一致，抽到这里避免漂移。

// 区分验潮站（当地基准面）与模型（MSL）数据源
function tideSourceOf(day) {
  return String((day && day.tideSource) || 'model').indexOf('qweather') === 0 ? 'station' : 'model';
}

/**
 * 计算某天的潮型
 * - 验潮站：按当地基准面的绝对潮差分档（厦门：<4m 小潮，4~5m 中潮，>5m 大潮）
 * - 模型：基准面不同，只能在同一数据源的日内做相对比较
 * @param {Array} allDays 全部日期
 * @param {number} todayIdx 目标日期下标
 * @returns {{label:string, range:number}|null}
 */
function getTideType(allDays, todayIdx) {
  if (!Array.isArray(allDays)) return null;
  const today = allDays[todayIdx];
  if (!today || today.tideLevelMax == null || today.tideLevelMin == null) return null;
  const range = today.tideLevelMax - today.tideLevelMin;
  const rounded = parseFloat(range.toFixed(1));

  if (tideSourceOf(today) === 'station') {
    const label = range > 5 ? '大潮' : range >= 4 ? '中潮' : '小潮';
    return { label, range: rounded };
  }

  const sameSrc = allDays.filter(d =>
    tideSourceOf(d) === 'model' && d.tideLevelMax != null && d.tideLevelMin != null
  );
  if (sameSrc.length < 5) return { label: '—', range: rounded };
  const ranges = sameSrc.map(d => d.tideLevelMax - d.tideLevelMin);
  const max = Math.max(...ranges);
  const min = Math.min(...ranges);
  const ratio = max > min ? (range - min) / (max - min) : 0.5;
  const label = ratio >= 0.66 ? '大潮' : ratio <= 0.33 ? '小潮' : '中潮';
  return { label, range: rounded };
}

/**
 * 给日历中的每一天补上潮型标签（用于日历格展示）
 * @returns {Array} 新数组（不修改原对象）
 */
function annotateDayTideTypes(allDays) {
  if (!Array.isArray(allDays)) return [];
  return allDays.map((d, i) => {
    const type = getTideType(allDays, i);
    return {
      ...d,
      tideTypeLabel: type ? type.label : '',
      tideRangeValue: type ? type.range : null,
    };
  });
}

module.exports = { tideSourceOf, getTideType, annotateDayTideTypes };
