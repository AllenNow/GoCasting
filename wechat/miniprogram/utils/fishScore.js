// utils/fishScore.js — 逐小时鱼口评分算法 (ES5 兼容版)
// 综合：潮汐节律 + 气压 + 水温 + 浪高 + 天气
// 返回每小时 0-10 分，并提取最佳垂钓时间窗口

// ── 评分权重常数 ─────────────────────────────────────────────
var W = {
  TIDE:     4,   // 潮汐节律（最重要）
  PRESSURE: 2,   // 气压
  SST:      2,   // 水温
  WAVE:     2,   // 浪高
  WEATHER:  1,   // 天气代码（次要，天气已被气压反映）
};
var MAX_RAW = W.TIDE + W.PRESSURE + W.SST + W.WAVE + W.WEATHER; // = 11

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
  var raw = 0;

  // ── 1. 潮汐得分（0~4）──────────────────────────────────────
  var tideScore = (function() {
    var state = h.tideState || 'unknown';
    // 涨退速率（m/h），用于判断是否处于高速涨退期
    var rate = (h.nextTideLevel != null && h.tideLevel != null)
      ? h.nextTideLevel - h.tideLevel : 0;
    var absRate = Math.abs(rate);

    if (state === 'rising') {
      if (absRate > 0.3) return 4.0;
      if (absRate > 0.15) return 3.5;
      return 3.0;
    }
    if (state === 'falling') {
      if (absRate > 0.3) return 3.5;
      if (absRate > 0.15) return 3.0;
      return 2.5;
    }
    if (state === 'high') return 0.5;
    if (state === 'low')  return 0.5;
    return 1.0;
  })();
  raw += Math.min(tideScore, W.TIDE);

  // ── 2. 气压得分（0~2）──────────────────────────────────────
  var pressureScore = (function() {
    var p = h.pressure;
    if (p == null) return 1;
    if (p >= 1020)      return 2.0;
    if (p >= 1013)      return 1.5;
    if (p >= 1005)      return 1.0;
    if (p >= 998)       return 0.3;
    return -0.5;
  })();
  raw += Math.max(-W.PRESSURE, Math.min(pressureScore, W.PRESSURE));

  // ── 3. 水温得分（0~2）──────────────────────────────────────
  var sstScore = (function() {
    var t = h.sst;
    if (t == null) return 1;
    if (t >= 20 && t <= 26) return 2.0;
    if (t >= 18 && t <= 28) return 1.5;
    if (t >= 15 && t <= 30) return 1.0;
    if (t >= 10 && t <= 32) return 0.5;
    return 0;
  })();
  raw += sstScore;

  // ── 4. 浪高得分（0~2）──────────────────────────────────────
  var waveScore = (function() {
    var w = h.waveHeight;
    if (w == null) return 1;
    if (w >= 0.3 && w <= 0.8)  return 2.0;
    if (w < 0.3)               return 1.5;
    if (w <= 1.2)              return 1.0;
    if (w <= 1.8)              return 0.3;
    return 0;
  })();
  raw += waveScore;

  // ── 5. 天气得分（-3~1）─────────────────────────────────────
  raw += Math.max(-W.WEATHER * 3, Math.min(h.wmoScore || 0, W.WEATHER));

  // ── 归一化到 0-10 ───────────────────────────────────────────
  var normalized = ((raw + 2) / (MAX_RAW + 2)) * 10;
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

  var scores = [];

  for (var i = 0; i < marineHourly.length; i++) {
    var mh = marineHourly[i];
    var ah = (atmosHourly && atmosHourly[i]) ? atmosHourly[i] : {};
    var nextMh = marineHourly[i + 1];

    // 简单推算 tideState（用水位差判断）
    var tideState = 'unknown';
    if (mh.tideLevel != null && nextMh && nextMh.tideLevel != null) {
      var diff = nextMh.tideLevel - mh.tideLevel;
      if (diff > 0.08)       tideState = 'rising';
      else if (diff < -0.08) tideState = 'falling';
      else                   tideState = mh.tideLevel > 0 ? 'high' : 'low';
    }

    var score = scoreHour({
      tideState: tideState,
      tideLevel:     mh.tideLevel,
      nextTideLevel: nextMh ? nextMh.tideLevel : null,
      pressure:      ah.pressure != null ? ah.pressure : null,
      sst:           mh.sst != null ? mh.sst : null,
      waveHeight:    mh.waveHeight != null ? mh.waveHeight : null,
      wmoScore:      ah.wmoScore != null ? ah.wmoScore : 0,
    });

    var grade = scoreToGrade(score);
    scores.push({
      hour:      i,
      timeStr:   mh.timeStr || (String(i).padStart(2,'0') + ':00'),
      score:     score,
      grade:     grade.grade,
      label:     grade.label,
      color:     grade.color,
      emoji:     grade.emoji,
      pressure:  ah.pressure != null ? ah.pressure : null,
      wmoLabel:  ah.wmoLabel || '',
      tideState: tideState,
    });
  }

  // ── 热力图（每小时宽度条，用于 WXML 渲染）─────────────────
  var heatmap = [];
  for (var j = 0; j < scores.length; j++) {
    var s = scores[j];
    heatmap.push({
      hour: s.hour,
      timeStr: s.timeStr,
      score: s.score,
      grade: s.grade,
      label: s.label,
      color: s.color,
      emoji: s.emoji,
      pressure: s.pressure,
      wmoLabel: s.wmoLabel,
      tideState: s.tideState,
      heightPct: Math.max(5, Math.round(s.score * 10)),
    });
  }

  // ── 提取最佳垂钓窗口（连续 score ≥ 6.5 的时段）────────────
  var bestWindows = [];
  var windowStart = null;
  
  for (var k = 0; k < scores.length; k++) {
    var sc = scores[k];
    if (sc.score >= 6.5) {
      if (windowStart === null) windowStart = k;
      if (k === scores.length - 1 || scores[k + 1].score < 6.5) {
        // 时段结束
        var duration = k - windowStart + 1;
        if (duration >= 1) {
          var sum = 0;
          for (var m = windowStart; m <= k; m++) {
            sum += scores[m].score;
          }
          var avgScore = sum / duration;
          var windowScores = scores.slice(windowStart, k + 1);
          bestWindows.push({
            startHour:  windowStart,
            endHour:    k,
            startTime:  scores[windowStart].timeStr,
            endTime:    String(k + 1).padStart(2,'0') + ':00',
            duration:   duration,
            avgScore:   parseFloat(avgScore.toFixed(1)),
            grade:      scoreToGrade(avgScore).grade,
            label:      scoreToGrade(avgScore).label,
            emoji:      scoreToGrade(avgScore).emoji,
            reason:     _buildReason(windowScores),
          });
        }
        windowStart = null;
      }
    } else {
      windowStart = null;
    }
  }

  // 按平均分降序，取前3
  bestWindows.sort(function(a, b) { return b.avgScore - a.avgScore; });
  var topWindows = bestWindows.slice(0, 3);

  // 全天综合评分（日平均）
  var daySum = 0;
  for (var n = 0; n < scores.length; n++) {
    daySum += scores[n].score;
  }
  var dayAvg = daySum / scores.length;
  var dayGradeObj = scoreToGrade(dayAvg);

  return {
    scores: scores,
    heatmap: heatmap,
    bestWindows: topWindows,
    dayGrade: { 
      grade: dayGradeObj.grade, 
      label: dayGradeObj.label, 
      color: dayGradeObj.color, 
      emoji: dayGradeObj.emoji, 
      avgScore: parseFloat(dayAvg.toFixed(1)) 
    },
  };
}

// ── 构造推荐理由文字 ─────────────────────────────────────────
function _buildReason(windowScores) {
  var reasons = [];
  var first = windowScores[0] || {};

  if (first.tideState === 'rising')  reasons.push('涨潮期');
  if (first.tideState === 'falling') reasons.push('退潮期');

  var pressureCount = 0;
  var pressureSum = 0;
  for (var i = 0; i < windowScores.length; i++) {
    if (windowScores[i].pressure != null) {
      pressureSum += windowScores[i].pressure;
      pressureCount++;
    }
  }
  var avgPressure = pressureCount > 0 ? pressureSum / pressureCount : 0;
  if (avgPressure >= 1013) reasons.push('气压高');
  else if (avgPressure < 1000 && avgPressure > 0) reasons.push('气压低');

  var goodWeatherCount = 0;
  for (var j = 0; j < windowScores.length; j++) {
    var wmo = windowScores[j].wmoLabel;
    if (wmo && wmo.indexOf('雨') === -1 && wmo.indexOf('雪') === -1) {
      goodWeatherCount++;
    }
  }
  if (goodWeatherCount > windowScores.length * 0.7) {
    reasons.push(first.wmoLabel || '天气晴好');
  }

  return reasons.length ? reasons.join(' · ') : '综合条件较好';
}

module.exports = { scoreHour: scoreHour, scoreToGrade: scoreToGrade, calcDayScores: calcDayScores };
