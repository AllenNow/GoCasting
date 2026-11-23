// utils/goScore.js — 出钓指数算法（连续因子版）
// 满分 10 分：潮汐 3.5 + 天气/海况 2.5 + 月相 1.5 + 时段 2.5
// 所有入口（首页、我的、评分详情）共用本模块，保证口径一致

const MOON_CYCLE = 29.53058867;
const RAD = Math.PI / 180;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ── 月相：返回 0~1 相位（0=新月，0.5=满月）与照度 ──────────
function moonInfo(date) {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate() + (d.getHours() + d.getMinutes() / 60) / 24;
  const jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) +
    Math.floor(275 * month / 9) + day + 1721013.5;
  const cycle = (jd - 2451549.5) / MOON_CYCLE;
  const phase = cycle - Math.floor(cycle);
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  let label = '残月';
  let icon = '🌘';
  if (phase < 0.03 || phase > 0.97) { label = '新月'; icon = '🌑'; }
  else if (phase < 0.22) { label = '峨眉月'; icon = '🌒'; }
  else if (phase < 0.28) { label = '上弦月'; icon = '🌓'; }
  else if (phase < 0.47) { label = '渐盈凸月'; icon = '🌔'; }
  else if (phase < 0.53) { label = '满月'; icon = '🌕'; }
  else if (phase < 0.72) { label = '渐亏凸月'; icon = '🌖'; }
  else if (phase < 0.78) { label = '下弦月'; icon = '🌗'; }

  // 新月/满月潮汐振幅最大，鱼口相对更好；连续过渡，避免档位跳变
  const score = clamp(0.5 + 1.0 * Math.abs(Math.cos(2 * Math.PI * phase)), 0.5, 1.5);
  return { phase, illum, label, icon, score };
}

// ── 潮汐：连续潮速 + 潮位位置 ─────────────────────────────
function tideStats(series, index) {
  const list = (series || []).filter(p => p && p.level != null);
  if (!list.length) {
    return { state: 'unknown', label: '暂无潮汐', icon: '🌊', score: 1.8, rate: 0, desc: '缺潮汐数据' };
  }
  const i = clamp(index, 0, list.length - 1);
  const cur = list[i].level;
  const prev = list[Math.max(0, i - 1)].level;
  const next = list[Math.min(list.length - 1, i + 1)].level;
  const span = Math.max(1, list.length - 1);
  const rate = i === 0 ? (next - cur) : i === list.length - 1 ? (cur - prev) : (next - prev) / 2;
  const levels = list.map(p => p.level);
  const min = Math.min.apply(null, levels);
  const max = Math.max.apply(null, levels);
  const pos = max > min ? (cur - min) / (max - min) : 0.5;

  let state = 'rising';
  let label = '涨潮';
  let icon = '🌊';
  if (rate > 0.03) { state = 'rising'; label = '涨潮'; icon = '🌊'; }
  else if (rate < -0.03) { state = 'falling'; label = '退潮'; icon = '↘️'; }
  else if (pos >= 0.5) { state = 'high'; label = '高平潮'; icon = '⬆️'; }
  else { state = 'low'; label = '低平潮'; icon = '⬇️'; }

  // 潮速越快、越接近半潮位，鱼口越好；平潮扣分
  const speedScore = Math.min(1, Math.abs(rate) / 0.7);
  const posScore = 1 - Math.abs(2 * pos - 1);
  const score = clamp(0.5 + 2.1 * speedScore + 0.9 * posScore, 0.4, 3.5);
  const desc = `${label} · 潮速 ${Math.abs(rate).toFixed(2)}m/h`;

  return { state, label, icon, score, rate, pos, desc, cur, min, max, index: i };
}

// ── 天气 + 海况 ───────────────────────────────────────────
function weatherScore(weather, waveHeight) {
  if (!weather) return { score: 1.6, desc: '天气未获取' };
  const desc = weather.desc || '';
  const wind = Number(weather.wind_speed) || 0;
  const temp = Number(weather.temp);
  let s = 2.5;

  if (desc.indexOf('雷') >= 0) s -= 1.9;
  else if (desc.indexOf('暴雨') >= 0) s -= 1.6;
  else if (desc.indexOf('大雨') >= 0) s -= 1.2;
  else if (desc.indexOf('中雨') >= 0) s -= 0.8;
  else if (desc.indexOf('小雨') >= 0 || desc.indexOf('阵雨') >= 0) s -= 0.4;

  if (wind >= 10) s -= 0.8;
  else if (wind >= 7) s -= 0.45;
  else if (wind >= 5) s -= 0.2;

  if (temp < 5 || temp > 33) s -= 0.45;
  else if (temp < 10 || temp > 30) s -= 0.2;

  if (waveHeight != null) {
    if (waveHeight >= 1.5) s -= 1.0;
    else if (waveHeight >= 1.0) s -= 0.6;
    else if (waveHeight >= 0.6) s -= 0.2;
  }

  const parts = [];
  if (desc) parts.push(desc);
  if (weather.temp != null) parts.push(weather.temp + '°C');
  if (wind) parts.push('风' + wind + 'm/s');
  if (waveHeight != null) parts.push('浪' + waveHeight + 'm');

  return { score: clamp(s, 0.2, 2.5), desc: parts.join(' ') || '天气一般' };
}

// ── 时段：黎明/黄昏双峰 ──────────────────────────────────
function timeScore(hour) {
  const h = hour + 0.5;
  const dawn = Math.exp(-Math.pow(h - 6.0, 2) / 8);
  const dusk = Math.exp(-Math.pow(h - 18.5, 2) / 8);
  const noon = Math.exp(-Math.pow(h - 12, 2) / 20);
  return clamp(0.6 + 1.15 * Math.max(dawn, dusk) + 0.35 * noon, 0.5, 2.5);
}

function levelOf(score) {
  if (score >= 8) return { label: '绝佳出钓！', color: '#1a7f5a', short: '绝佳' };
  if (score >= 6) return { label: '适合出钓', color: '#52a875', short: '适合' };
  if (score >= 4) return { label: '一般，可尝试', color: '#f0a500', short: '一般' };
  return { label: '不建议出钓', color: '#e85555', short: '不宜' };
}

// ── 单次评分 ─────────────────────────────────────────────
// ctx: { tideSeries, hour, weather, waveHeight, date }
function calcScore(ctx) {
  const hour = ctx.hour != null ? ctx.hour : new Date().getHours();
  const tideIndex = ctx.tideIndex != null ? ctx.tideIndex : (hour % 24);
  const tide = tideStats(ctx.tideSeries, tideIndex);
  const weather = weatherScore(ctx.weather, ctx.waveHeight);
  const moon = moonInfo(ctx.date || new Date());
  const time = timeScore(hour);

  const total = clamp(tide.score + weather.score + moon.score + time, 0, 10);
  const score = Math.round(total * 10) / 10;
  const level = levelOf(score);

  const star = (v, max) => clamp(Math.round(v / max * 3), 1, 3);
  const factors = [
    { key: 'tide', icon: tide.icon, label: '潮汐', desc: tide.desc, stars: star(tide.score, 3.5), weight: '35%' },
    { key: 'weather', icon: weather.score >= 2 ? '☀️' : weather.score >= 1.2 ? '⛅' : '🌧️', label: '天气海况', desc: weather.desc, stars: star(weather.score, 2.5), weight: '25%' },
    { key: 'moon', icon: moon.icon, label: '月相', desc: moon.label, stars: star(moon.score, 1.5), weight: '15%' },
    { key: 'time', icon: hour >= 5 && hour <= 8 ? '🌅' : hour >= 17 && hour <= 20 ? '🌇' : '🕒', label: '时段', desc: `${String(hour).padStart(2, '0')}:00`, stars: star(time, 2.5), weight: '25%' },
  ];

  return { score, level, factors, tide, moon, timeScore: time, weatherScore: weather.score };
}

// ── 未来 24 小时评分 + 最佳时段 ─────────────────────────
// ctx: { tideSeries(48点，今天+明天), startHour, weather, waveHeight }
function buildTimeline(ctx) {
  const startHour = ctx.startHour != null ? ctx.startHour : new Date().getHours();
  const baseDate = ctx.date || new Date();
  const rows = [];
  for (let i = 0; i < 24; i++) {
    const hour = (startHour + i) % 24;
    const d = new Date(baseDate.getTime() + i * 3600000);
    const r = calcScore({
      tideSeries: ctx.tideSeries,
      hour,
      tideIndex: startHour + i,       // 48h 潮汐序列的绝对索引
      weather: ctx.weather,
      waveHeight: ctx.waveHeight,
      date: d,
    });
    rows.push({
      hour: `${String(hour).padStart(2, '0')}:00`,
      hourLabel: String(hour).padStart(2, '0'),
      score: r.score,
      tideIcon: r.tide.icon,
      offset: i,
    });
  }
  return rows;
}

// 取 24h 中互不重叠的前 3 个 2 小时窗口
function findBestSlots(rows) {
  const windows = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    windows.push({
      start: i,
      score: Math.round((rows[i].score + rows[i + 1].score) / 2 * 10) / 10,
    });
  }
  windows.sort((a, b) => b.score - a.score);
  const picked = [];
  windows.forEach(w => {
    if (picked.length >= 3) return;
    const overlap = picked.some(p => Math.abs(p.start - w.start) < 2);
    if (!overlap) picked.push(w);
  });
  return picked
    .sort((a, b) => a.start - b.start)
    .map(w => ({
      hour: `${rows[w.start].hourLabel}-${String((Number(rows[w.start + 1].hourLabel) + 1) % 24).padStart(2, '0')}`,
      score: w.score,
      tideIcon: rows[w.start].tideIcon,
      offset: w.start,
    }));
}

// 把两天的逐小时潮位拼成 48 点（index 0 = 今天 00:00）
function mergeTideSeries(todayChart, tomorrowChart) {
  const a = (todayChart || []).filter(p => p && p.level != null);
  const b = (tomorrowChart || []).filter(p => p && p.level != null);
  return a.concat(b);
}

module.exports = {
  moonInfo,
  tideStats,
  weatherScore,
  timeScore,
  levelOf,
  calcScore,
  buildTimeline,
  findBestSlots,
  mergeTideSeries,
};
