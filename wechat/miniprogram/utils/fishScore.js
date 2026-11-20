// utils/fishScore.js — 逐小时鱼口评分算法
// 综合：潮汐节律 + 气压 + 水温 + 浪高 + 天气
// 返回每小时 0-10 分，并提取最佳垂钓时间窗口

// ── 评分权重常数 ─────────────────────────────────────────────
const W = {
  TIDE:     4,   // 潮汐节律（最重要）
  PRESSURE: 2,   // 气压
  SST:      2,   // 水温
  WAVE:     2,   // 浪高
  WEATHER:  1,   // 天气代码（次要，天气已被气压反映）
};
const MAX_RAW = W.TIDE + W.PRESSURE + W.SST + W.WAVE + W.WEATHER; // = 11

// ── 单小时评分 ───────────────────────────────────────────────
/**
 * @param {object} h - 当前小时的数据
 * @param {string}  h.tideState   - 'rising'|'falling'|'high'|'low'|'unknown'
 * @param {number}  h.tideLevel   - 当前潮高（MSL，m）
 * @param {number}  h.nextTideLevel - 下一小时潮高（用于判断涨退速率）
 * @param {number}  h.pressure    - 气压（hPa）
 * @param {number}  h.sst         - 海面水温（°C）
 * @param {number}  h.waveHeight  - 浪高（m）
 * @param {number}  h.wmoScore    - 天气代码得分（-3~1，来自 getWeatherForecast）
 * @param {boolean} h.isNight     - 是否夜间（20:00~05:00，部分鱼种夜钓更佳）
 * @returns {number} 0-10 的评分
 */
function scoreHour(h) {
  let raw = 0;

  // ── 1. 潮汐得分（0~4）──────────────────────────────────────
  // 涨潮期前后：鱼随水流进食，活性最高
  // 退潮中段：水流带饵料，次优
  // 高低平潮：水体静止，鱼口停滞
  const tideScore = (() => {
    const state = h.tideState || 'unknown';
    // 涨退速率（m/h），用于判断是否处于高速涨退期
    const rate = h.nextTideLevel != null && h.tideLevel != null
      ? h.nextTideLevel - h.tideLevel : 0;
    const absRate = Math.abs(rate);

    if (state === 'rising') {
      // 涨潮：速率越快鱼口越活跃
      if (absRate > 0.3) return 4.0;
      if (absRate > 0.15) return 3.5;
      return 3.0;
    }
    if (state === 'falling') {
      // 退潮：活跃度略低于涨潮
      if (absRate > 0.3) return 3.5;
      if (absRate > 0.15) return 3.0;
      return 2.5;
    }
    if (state === 'high') return 0.5;  // 高平潮
    if (state === 'low')  return 0.5;  // 低平潮
    return 1.0;  // 未知
  })();
  raw += Math.min(tideScore, W.TIDE);

  // ── 2. 气压得分（0~2）──────────────────────────────────────
  // 高气压：气体溶解度高，水中含氧量高，鱼活跃
  // 气压下降（暴风前）：鱼躲底，口差
  // 气压上升（雨后晴）：极佳时机
  const pressureScore = (() => {
    const p = h.pressure;
    if (p == null) return 1;
    if (p >= 1020)      return 2.0;   // 高压，极佳
    if (p >= 1013)      return 1.5;   // 标准偏高
    if (p >= 1005)      return 1.0;   // 正常
    if (p >= 998)       return 0.3;   // 偏低，较差
    return -0.5;                       // <998，台风/暴雨前，大扣分
  })();
  raw += Math.max(-W.PRESSURE, Math.min(pressureScore, W.PRESSURE));

  // ── 3. 水温得分（0~2）──────────────────────────────────────
  const sstScore = (() => {
    const t = h.sst;
    if (t == null) return 1;
    if (t >= 20 && t <= 26) return 2.0;   // 黄金区间
    if (t >= 18 && t <= 28) return 1.5;   // 次优
    if (t >= 15 && t <= 30) return 1.0;   // 可接受
    if (t >= 10 && t <= 32) return 0.5;   // 边缘
    return 0;                              // 极端温度
  })();
  raw += sstScore;

  // ── 4. 浪高得分（0~2）──────────────────────────────────────
  const waveScore = (() => {
    const w = h.waveHeight;
    if (w == null) return 1;
    if (w >= 0.3 && w <= 0.8)  return 2.0;   // 最佳：轻浪
    if (w < 0.3)               return 1.5;   // 无浪，略差（缺少水流）
    if (w <= 1.2)              return 1.0;   // 中等
    if (w <= 1.8)              return 0.3;   // 偏大
    return 0;                                // 危险
  })();
  raw += waveScore;

  // ── 5. 天气得分（-3~1）─────────────────────────────────────
  raw += Math.max(-W.WEATHER * 3, Math.min(h.wmoScore || 0, W.WEATHER));

  // ── 归一化到 0-10 ───────────────────────────────────────────
  // raw 理论范围约 -2 ~ 11，映射到 0-10
  const normalized = ((raw + 2) / (MAX_RAW + 2)) * 10;
  return Math.max(0, Math.min(10, parseFloat(normalized.toFixed(1))));
}

// ── 等级标签 ──────────────────────────────────────────────────
function scoreToGrade(score) {
  if (score >= 8.0) return { grade: 'excellent', label: '极佳',  color: '#1a7f5a', emoji: '🔥' };
  if (score >= 6.5) return { grade: 'good',      label: '较好',  color: '#2dce89', emoji: '✅' };
  if (score >= 5.0) return { grade: 'ok',        label: '一般',  color: '#e6a817', emoji: '🌤' };
  if (score >= 3.5) return { grade: 'poor',      label: '较差',  color: '#f5a623', emoji: '⚠️' };
  return               { grade: 'bad',       label: '不宜',  color: '#e85555', emoji: '❌' };
}

// ── 计算一天的逐小时评分 + 提取最佳时段 ──────────────────────
/**
 * @param {object[]} marineHourly  - allDays[n].hourly（24条，含 waveHeight/sst/tideLevel）
 * @param {object[]} atmosHourly   - getWeatherForecast 返回的当天逐小时（24条，含 pressure/wmoScore）
 * @param {string}   tideStateByHour - 可选，逐小时潮汐状态数组（从 tideChart 推算）
 * @returns {{ scores, heatmap, bestWindows, dayGrade }}
 */
function calcDayScores(marineHourly, atmosHourly) {
  if (!marineHourly || marineHourly.length === 0) {
    return { scores: [], heatmap: [], bestWindows: [], dayGrade: null };
  }

  const scores = [];

  marineHourly.forEach((mh, i) => {
    const ah = atmosHourly?.[i] || {};

    // 从相邻小时推算涨退速率
    const nextMh = marineHourly[i + 1];

    // 简单推算 tideState（用水位差判断）
    let tideState = 'unknown';
    if (mh.tideLevel != null && nextMh?.tideLevel != null) {
      const diff = nextMh.tideLevel - mh.tideLevel;
      if (diff > 0.08)       tideState = 'rising';
      else if (diff < -0.08) tideState = 'falling';
      else                   tideState = mh.tideLevel > 0 ? 'high' : 'low';
    }

    const score = scoreHour({
      tideState,
      tideLevel:     mh.tideLevel,
      nextTideLevel: nextMh?.tideLevel ?? null,
      pressure:      ah.pressure     ?? null,
      sst:           mh.sst          ?? null,
      waveHeight:    mh.waveHeight   ?? null,
      wmoScore:      ah.wmoScore     ?? 0,
    });

    const grade = scoreToGrade(score);
    scores.push({
      hour:      i,
      timeStr:   mh.timeStr || `${String(i).padStart(2,'0')}:00`,
      score,
      grade:     grade.grade,
      label:     grade.label,
      color:     grade.color,
      emoji:     grade.emoji,
      pressure:  ah.pressure ?? null,
      wmoLabel:  ah.wmoLabel ?? '',
      tideState,
    });
  });

  // ── 热力图（每小时宽度条，用于 WXML 渲染）─────────────────
  const heatmap = scores.map(s => ({
    ...s,
    // 高度百分比（5~100%）
    heightPct: Math.max(5, Math.round(s.score * 10)),
  }));

  // ── 提取最佳垂钓窗口（连续 score ≥ 6.5 的时段）────────────
  const bestWindows = [];
  let windowStart = null;
  scores.forEach((s, i) => {
    if (s.score >= 6.5) {
      if (windowStart === null) windowStart = i;
      if (i === scores.length - 1 || scores[i + 1].score < 6.5) {
        // 时段结束
        const duration = i - windowStart + 1;
        if (duration >= 1) {  // 至少1小时
          const avgScore = scores.slice(windowStart, i + 1)
            .reduce((sum, x) => sum + x.score, 0) / duration;
          bestWindows.push({
            startHour:  windowStart,
            endHour:    i,
            startTime:  scores[windowStart].timeStr,
            endTime:    `${String(i + 1).padStart(2,'0')}:00`,
            duration,
            avgScore:   parseFloat(avgScore.toFixed(1)),
            grade:      scoreToGrade(avgScore).grade,
            label:      scoreToGrade(avgScore).label,
            emoji:      scoreToGrade(avgScore).emoji,
            // 概括原因
            reason:     _buildReason(scores.slice(windowStart, i + 1)),
          });
        }
        windowStart = null;
      }
    } else {
      windowStart = null;
    }
  });

  // 按平均分降序，取前3
  bestWindows.sort((a, b) => b.avgScore - a.avgScore);
  const topWindows = bestWindows.slice(0, 3);

  // 全天综合评分（日平均）
  const dayAvg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  const dayGrade = scoreToGrade(dayAvg);

  return {
    scores,
    heatmap,
    bestWindows: topWindows,
    dayGrade: { ...dayGrade, avgScore: parseFloat(dayAvg.toFixed(1)) },
  };
}

// ── 构造推荐理由文字 ─────────────────────────────────────────
function _buildReason(windowScores) {
  const reasons = [];
  const first = windowScores[0] || {};

  if (first.tideState === 'rising')  reasons.push('涨潮期');
  if (first.tideState === 'falling') reasons.push('退潮期');

  const avgPressure = windowScores
    .filter(s => s.pressure != null)
    .reduce((sum, s, _, arr) => sum + s.pressure / arr.length, 0);
  if (avgPressure >= 1013) reasons.push('气压高');
  else if (avgPressure < 1000 && avgPressure > 0) reasons.push('气压低');

  const goodWeather = windowScores.filter(s => s.wmoLabel && !s.wmoLabel.includes('雨') && !s.wmoLabel.includes('雪'));
  if (goodWeather.length > windowScores.length * 0.7) {
    reasons.push(first.wmoLabel || '天气晴好');
  }

  return reasons.length ? reasons.join(' · ') : '综合条件较好';
}

module.exports = { scoreHour, scoreToGrade, calcDayScores };
