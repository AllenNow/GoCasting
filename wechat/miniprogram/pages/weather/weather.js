// pages/weather/weather.js — 潮汐+海洋仪表板
// 功能：6区块展示 + 地点切换（搜索/定位/收藏）+ 客户端/云端双层缓存
// 新增：鱼口预测（逐小时评分热力图 + 最佳垂钓窗口）

const app = getApp();
const apiCache    = require('../../utils/apiCache');
const savedPlaces = require('../../utils/savedPlaces');
const fishScore   = require('../../utils/fishScore');
const goScoreEngine  = require('../../utils/goScore');
const goScoreService = require('../../utils/goScoreService');

// 定位不可用时的兜底地点（不写入收藏，用户可随时切换）
const DEFAULT_PLACE = {
  name: '厦门市',
  lat: 24.4798,
  lon: 118.0894,
  typeIcon: '🏙️',
  isDefault: true,
};

// ── 月相（朔望月近似算法，不依赖接口）──────────────────────
const SYNODIC_MONTH = 29.530588853;       // 朔望月天数
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC 新月

const MOON_PHASES = [
  { name: '新月', icon: '🌑' },
  { name: '娥眉月', icon: '🌒' },
  { name: '上弦月', icon: '🌓' },
  { name: '盈凸月', icon: '🌔' },
  { name: '满月', icon: '🌕' },
  { name: '亏凸月', icon: '🌖' },
  { name: '下弦月', icon: '🌗' },
  { name: '残月', icon: '🌘' },
];

function getMoonInfo(date) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  let age = days % SYNODIC_MONTH;
  if (age < 0) age += SYNODIC_MONTH;
  const phase = age / SYNODIC_MONTH;                 // 0~1
  const idx = Math.floor(((phase + 1 / 16) % 1) * 8); // 取最近的月相
  return {
    ...MOON_PHASES[idx],
    age: parseFloat(age.toFixed(1)),
    // 朔望附近潮差最大（大潮期）
    isSpring: phase < 0.07 || phase > 0.93 || Math.abs(phase - 0.5) < 0.07,
  };
}

// ── 潮型：验潮站按绝对潮差分档；模型数据基准面不同，仍在同源日内相对比较 ──
function getTideType(allDays, todayIdx) {
  const today = allDays[todayIdx];
  if (!today || today.tideLevelMax == null || today.tideLevelMin == null) return null;
  const range = today.tideLevelMax - today.tideLevelMin;
  const rounded = parseFloat(range.toFixed(1));
  // 验潮站预报与存档同属“当地基准面”，模型日基准面不同，不能与之混排
  const srcOf = d => String(d.tideSource || 'model').indexOf('qweather') === 0 ? 'station' : 'model';

  if (srcOf(today) === 'station') {
    // 厦门当地基准面：<4m 小潮，4~5m 中潮，>5m 大潮
    const label = range > 5 ? '大潮' : range >= 4 ? '中潮' : '小潮';
    return { label, range: rounded };
  }

  const sameSrc = allDays.filter(d =>
    srcOf(d) === 'model' && d.tideLevelMax != null && d.tideLevelMin != null
  );
  if (sameSrc.length < 5) return { label: '—', range: rounded };
  const ranges = sameSrc.map(d => d.tideLevelMax - d.tideLevelMin);
  const max = Math.max(...ranges);
  const min = Math.min(...ranges);
  const ratio = max > min ? (range - min) / (max - min) : 0.5;
  const label = ratio >= 0.66 ? '大潮' : ratio <= 0.33 ? '小潮' : '中潮';
  return { label, range: rounded };
}

// ── 气压与 3 小时变化趋势 ──────────────────────────────────
function getPressureInfo(atmosHourly, nowHour) {
  if (!atmosHourly || !atmosHourly.length) return { now: null, trendText: '', delta: null };
  const idx  = Math.min(nowHour, atmosHourly.length - 1);
  const prevIdx = Math.max(0, idx - 3);
  const cur  = atmosHourly[idx] || {};
  const prev = atmosHourly[prevIdx] || {};
  const now  = cur.pressure != null ? cur.pressure : null;
  if (now == null) return { now: null, trendText: '', delta: null };
  const hours = idx - prevIdx;
  if (prev.pressure == null || hours < 2) return { now, trendText: '变化 --', delta: null };
  const d = now - prev.pressure;
  let trendText = `${hours}h 持平`;
  if (d >= 1.5)       trendText = `${hours}h ↑${d.toFixed(1)}`;
  else if (d <= -1.5) trendText = `${hours}h ↓${Math.abs(d).toFixed(1)}`;
  return { now, trendText, delta: parseFloat(d.toFixed(1)) };
}

// ══════════════════════════════════════════════════════════════
// 纯函数工具
// ══════════════════════════════════════════════════════════════

// ── 下一高低潮倒计时：今天剩余极值优先，不足时顺延到明天 ──
function buildNextTide(todayExtremes, tomorrowExtremes, now) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const list = []
    .concat((todayExtremes || []).map(e => ({ ...e, dayOffset: 0 })))
    .concat((tomorrowExtremes || []).map(e => ({ ...e, dayOffset: 1 })));

  let best = null;
  list.forEach(e => {
    const m = hhmmToMin(e.timeStr);
    if (m == null) return;
    const diffMin = m + e.dayOffset * 1440 - nowMin;
    if (diffMin >= 0 && (!best || diffMin < best.diffMin)) {
      best = { ...e, diffMin };
    }
  });
  if (!best) return null;

  const isHigh = best.type === 'high';
  return {
    type:    best.type,
    label:   isHigh ? '高潮' : '低潮',
    icon:    isHigh ? '⬆️' : '⬇️',
    timeStr: best.timeStr,
    level:   best.level,
    isTomorrow: best.dayOffset === 1,
    inText:  best.diffMin < 1 ? '即将' : durationText(best.diffMin),
  };
}

// ── 数据置信度：验潮站距离越近越高；模型推算统一标为低置信 ──
function buildTideConfidence(tideMeta) {
  if (!tideMeta || !tideMeta.source || tideMeta.source === 'model') {
    return {
      level:  'low',
      tag:    '低置信',
      label:  '模型推算',
      detail: (tideMeta && tideMeta.reason) || '附近无可用验潮站',
    };
  }
  const dist = tideMeta.distanceKm;
  const level = dist == null ? 'mid' : (dist <= 50 ? 'high' : dist <= 150 ? 'mid' : 'low');
  const parts = [];
  if (dist != null) parts.push(`距 ${dist} km`);
  if (tideMeta.interpolatedDays > 0) parts.push('部分时段插值');
  return {
    level,
    tag:    level === 'high' ? '高置信' : level === 'mid' ? '中置信' : '低置信',
    label:  `${tideMeta.siteName || '验潮站'}验潮站`,
    detail: parts.join(' · '),
  };
}

// ── 本周最佳出钓日：复用逐小时鱼口算法，给出未来 7 天前三名 ──
function buildWeekBestDays(allDays, todayIdx, atmosByDay) {
  if (!Array.isArray(allDays) || todayIdx < 0) return [];
  const list = [];
  const end = Math.min(allDays.length, todayIdx + 7);
  for (let i = todayIdx; i < end; i++) {
    const day = allDays[i];
    if (!day || !Array.isArray(day.hourly) || !day.hourly.length) continue;
    const { dayGrade } = fishScore.calcDayScores(day.hourly, atmosByDay[day.date] || []);
    if (!dayGrade) continue;
    list.push({
      date:      day.date,
      dateLabel: day.dateLabel,
      weekLabel: day.weekLabel,
      avgScore:  dayGrade.avgScore,
      label:     dayGrade.label,
      color:     dayGrade.color,
      isToday:   !!day.isToday,
    });
  }
  return list.sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
}

// 图表几何：必须与 weather.wxss 中 .tide-chart-body 的高度、卡片内容宽度一致。
// 线段用「水平条 + 旋转」实现，宽高比算错会让线段端点偏离数据点，出现断开。
const CHART_H_RPX  = 230;   // .tide-chart-body height
const CHART_W_RPX  = 682;   // 750 - 卡片左右 margin 32 - padding 36
const CHART_ASPECT = CHART_H_RPX / CHART_W_RPX;
const CHART_X_PAD  = 2;     // 左右留白(%)：首尾点不贴边，避免被 overflow 裁掉

function buildChartPoints(tideChart24h) {
  if (!tideChart24h || tideChart24h.length === 0) return { points: [], segments: [], axisMin: 0, axisMax: 6 };
  const levels = tideChart24h.map(t => t.level).filter(v => v != null);
  if (!levels.length) return { points: [], segments: [], axisMin: 0, axisMax: 6 };
  const minL = Math.min(...levels), maxL = Math.max(...levels);
  // 验潮站潮高为当地潮汐基准面，Y 轴从 0 起；模型 MSL 数据含负值时才下探到负刻度
  const axisMin = minL >= 0 ? 0 : Math.floor(minL - 0.5);
  let axisMax = Math.ceil(maxL + 0.5);
  if (axisMax <= axisMin) axisMax = axisMin + 1;
  const range = axisMax - axisMin;
  const PAD = 10;
  const n = tideChart24h.length - 1;
  const points = tideChart24h.map((t, i) => ({
    x: parseFloat((CHART_X_PAD + (i / n) * (100 - CHART_X_PAD * 2)).toFixed(2)),
    y: parseFloat((PAD + (1 - (t.level - axisMin) / range) * (100 - PAD * 2)).toFixed(2)),
    timeStr: t.timeStr, level: t.level,
  }));
  const segments = points.slice(0, -1).map((p1, i) => {
    const p2 = points[i + 1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    // 线段真实长度（按宽高比换算），配合 transform-origin:left center 才能首尾相接
    const w = parseFloat(Math.hypot(dx, dy * CHART_ASPECT).toFixed(2));
    const angle = parseFloat((Math.atan2(dy * CHART_ASPECT, dx) * 180 / Math.PI).toFixed(2));
    return { x: p1.x, y: p1.y, w, angle };
  });
  return { points, segments, axisMin, axisMax, minLevel: minL, maxLevel: maxL };
}

function markExtremePoints(chartPoints, extremes) {
  return extremes.map(ext => {
    const match = chartPoints.reduce((best, pt) =>
      Math.abs(pt.level - ext.level) < Math.abs((best?.level ?? 999) - ext.level) ? pt : best, null);
    return match ? { ...ext, x: match.x, y: match.y } : null;
  }).filter(Boolean);
}

// ── 时间工具 ──────────────────────────────────────────────
function hhmmToMin(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

function minToHHMM(min) {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
}

function durationText(min) {
  if (min == null || min <= 0) return '--';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}分钟`;
  return `${h}小时${m ? m + '分' : ''}`;
}

// ── 本地日出日落（NOAA 简化式，和风天文不可用时兜底）────────
function localSunTimes(date, lat, lon) {
  const rad = d => (d * Math.PI) / 180;
  const deg = r => (r * 180) / Math.PI;
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const n = Math.floor((date.getTime() - start) / 86400000) + 1;
  const gamma = (2 * Math.PI / 365) * (n - 1 + 0.5);
  const eqtime = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const latR = rad(lat);
  const cosHa = Math.cos(rad(90.833)) / (Math.cos(latR) * Math.cos(decl))
    - Math.tan(latR) * Math.tan(decl);
  if (cosHa > 1 || cosHa < -1) return null;  // 极昼 / 极夜
  const ha = deg(Math.acos(cosHa));
  // 分钟（UTC）→ 东八区
  return {
    sunrise: minToHHMM(720 - 4 * (lon + ha) - eqtime + 480),
    sunset:  minToHHMM(720 - 4 * (lon - ha) - eqtime + 480),
  };
}

// ── 天光：日出日落、太阳位置、黄金档 ────────────────────────
function buildDaylight({ sun, now, lat, lon }) {
  let s = sun;
  let fallback = false;
  if (!s || !s.sunrise || !s.sunset) {
    s = localSunTimes(now, lat, lon);
    fallback = true;
  }
  if (!s || !s.sunrise || !s.sunset) return null;

  const sr = hhmmToMin(s.sunrise);
  const ss = hhmmToMin(s.sunset);
  if (sr == null || ss == null || ss <= sr) return null;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isDay = nowMin >= sr && nowMin <= ss;
  const p = Math.max(0, Math.min(1, isDay ? (nowMin - sr) / (ss - sr) : (nowMin < sr ? 0 : 1)));
  // 半椭圆轨迹：容器高 132rpx、弧线底边距 36rpx，太阳点按椭圆参数方程定位
  const arcY = 23 + Math.round(92 * 2 * Math.sqrt(Math.max(0, p * (1 - p))));

  return {
    sunrise: s.sunrise,
    sunset:  s.sunset,
    sunriseMin: sr,
    sunsetMin:  ss,
    isDay,
    sunPct:  parseFloat((p * 100).toFixed(1)),
    sunArcY: arcY,
    dayLengthText: durationText(ss - sr),
    statusText: isDay
      ? `距日落 ${durationText(ss - nowMin)}${nowMin - sr < 60 ? ' · 晨间黄金档' : ''}`
      : (nowMin < sr
        ? `距日出 ${durationText(sr - nowMin)}`
        : '已日落 · 夜间注意安全'),
    golden: [
      { key: 'dawn', icon: '🌅', label: '晨间黄金档', start: s.sunrise, end: minToHHMM(sr + 60) },
      { key: 'dusk', icon: '🌇', label: '傍晚黄金档', start: minToHHMM(ss - 60), end: s.sunset },
    ],
    sourceLabel: fallback ? '本地推算' : '天文',
  };
}

// ── 今日节奏时间轴：天光段 + 黄金档 + 鱼口窗口 + 高低潮 ──────
function buildTimeline({ daylight, extremes, bestWindows, now }) {
  if (!daylight) return null;
  const dayStartPct = (daylight.sunriseMin / 1440) * 100;
  const dayEndPct   = (daylight.sunsetMin / 1440) * 100;
  const nowMin      = now.getHours() * 60 + now.getMinutes();

  const marks = (extremes || [])
    .map(e => {
      const m = hhmmToMin(e.timeStr);
      if (m == null) return null;
      return { ...e, x: parseFloat(((m / 1440) * 100).toFixed(2)) };
    })
    .filter(Boolean);

  const fishBands = (bestWindows || []).map(w => ({
    key: w.startTime,
    left: parseFloat(((w.startHour / 24) * 100).toFixed(2)),
    width: parseFloat((((w.endHour + 1 - w.startHour) / 24) * 100).toFixed(2)),
    label: w.timeText || `${w.startTime}–${w.endTime}`,
    score: w.avgScore,
  }));

  const goldenBands = daylight.golden.map(g => {
    const a = hhmmToMin(g.start) || 0;
    const b = hhmmToMin(g.end) || 0;
    return {
      key: g.key,
      left: parseFloat(((a / 1440) * 100).toFixed(2)),
      width: parseFloat((Math.max(0, b - a) / 1440 * 100).toFixed(2)),
    };
  });

  return {
    dayStartPct: parseFloat(dayStartPct.toFixed(2)),
    dayEndPct:   parseFloat(dayEndPct.toFixed(2)),
    nowPct:      parseFloat(((nowMin / 1440) * 100).toFixed(2)),
    marks,
    fishBands,
    goldenBands,
  };
}

function build48hLinePoints(hourlyForecast48h, field) {
  if (!hourlyForecast48h?.length) return [];
  const vals = hourlyForecast48h.map(t => t[field]).filter(v => v != null);
  if (!vals.length) return [];
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 0.1;
  return hourlyForecast48h.map((t, i) => ({
    x: parseFloat(((i / (hourlyForecast48h.length - 1)) * 100).toFixed(2)),
    y: parseFloat((100 - (((t[field] - minV) / range) * 70 + 15)).toFixed(2)),
    val: t[field], timeStr: t.timeStr, date: t.date,
  }));
}

// 48h 柱状图自适应量程：按 0.5m 步长向上取整，避免小浪时柱体全挤在底部
function computeWaveBarScale(list) {
  if (!list?.length) return 0.5;
  let max = 0;
  list.forEach(t => {
    if (t.waveHeight != null) max = Math.max(max, t.waveHeight);
    if (t.swellHeight != null) max = Math.max(max, t.swellHeight);
  });
  return Math.max(0.5, Math.ceil(max * 2) / 2);
}

// ── 更新时间文案 ────────────────────────────────────────────
function ageText(ts) {
  if (!ts) return '--';
  // 跨天数据直接给出日期，避免“25 小时前”看不出是否已过期
  const bj = new Date(ts + 8 * 3600 * 1000);
  const dayKey = `${bj.getUTCFullYear()}-${String(bj.getUTCMonth() + 1).padStart(2, '0')}-${String(bj.getUTCDate()).padStart(2, '0')}`;
  if (dayKey !== apiCache.todayKeyBJ()) {
    return `${String(bj.getUTCMonth() + 1).padStart(2, '0')}-${String(bj.getUTCDate()).padStart(2, '0')} ${String(bj.getUTCHours()).padStart(2, '0')}:${String(bj.getUTCMinutes()).padStart(2, '0')}`;
  }
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min <= 0) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  return `${Math.floor(min / 60)} 小时前`;
}

// 未来 6 小时是否有降水（用于决定是否请求和风分钟级降水）
function needRainSoon(atmosData, weatherData) {
  const byDay = (atmosData && atmosData.byDay) || {};
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hours = byDay[key] || [];
  const h0 = d.getHours();
  if (hours.some(h => h.hour >= h0 && h.hour <= h0 + 6 && (h.precip || 0) > 0)) return true;
  const descs = ((weatherData && weatherData.forecast) || [])
    .slice(0, 2).map(f => f.desc || '').join('');
  return /雨|雪|雷/.test(descs);
}

// ══════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════
Page({
  data: {
    // ── 页面状态 ──────────────────────────────────────────
    loading: true,
    marineLoaded: false,
    weatherLoaded: false,
    errorMsg: '',
    // ── 各模块更新时间（展示“更新于”与局部刷新）──────────
    weatherUpdatedAt: null,
    marineUpdatedAt: null,
    weatherAgeText: '--',
    marineAgeText: '--',
    astroAgeText: '--',
    refreshingFast: false,
    refreshingMarine: false,

    // ── 当前地点 ──────────────────────────────────────────
    // activePlace: null = 使用定位；否则 { name, lat, lon, address, typeIcon }
    activePlace: null,
    city: '定位中…',
    isLocating: false,      // 正在定位中（转圈动画）
    locateDenied: false,    // 定位权限被拒绝，展示“去开启”入口

    // ── 地点选择面板 ──────────────────────────────────────
    placePanel: false,       // 面板是否展开
    keyboardHeight: 0,       // 键盘高度（px），用于把地点面板顶到键盘上方
    panelKeyboardStyle: '',  // 键盘弹出时面板的 bottom/max-height 内联样式
    searchKeyword: '',
    searchLoading: false,
    searchResults: [],       // 搜索结果列表
    savedList: [],           // 收藏列表（从 Storage 读取）
    savedMax: savedPlaces.MAX_COUNT,

    // ── 评分 ──────────────────────────────────────────────
    fishScore: null,        // 无数据时为 null，界面显示 --
    fishScoreLabel: '加载中…',
    currentData: null,

    // ── 今日洞察（首屏）────────────────────────────────────
    todayBestWindows: [],   // 今日最佳窗口
    todayGrade: null,       // 今日综合评级
    nextTide: null,         // 下一高低潮 { label, timeStr, inText, isTomorrow }
    tideConfidence: null,   // 潮汐数据置信度 { level, tag, label, detail }
    weekBestDays: [],       // 本周最佳出钓日（前三）
    moonInfo: null,         // 月相 { name, icon, age, isSpring }
    tideTypeInfo: null,     // 潮型 { label, range }
    tideRange: null,        // 今日潮差（m）
    pressureNow: null,      // 当前气压（hPa）
    pressureTrend: '',      // 3 小时气压变化文案
    pressureDelta: null,    // 3 小时气压变化数值

    // ── 折线图 ────────────────────────────────────────────
    tideChart24h: [],
    chartPoints: [],
    chartSegments: [],
    extremePoints: [],
    chartMinLevel: 0,
    chartMaxLevel: 0,
    chartAxisMin: 0,
    chartAxisMax: 6,
    currentPointX: 0,

    // ── 探针 ──────────────────────────────────────────────
    probeVisible: false,
    probeX: 50,
    probeTooltip: null,
    probePointY: 50,

    // ── 高低潮 ────────────────────────────────────────────
    todayExtremes: [],
    tomorrowExtremes: [],

    // ── 48h浪况 ──────────────────────────────────────────
    hourlyForecast48h: [],
    waveBarScale: 0.5,
    wave48hPoints: [],
    swell48hPoints: [],
    tide48hPoints: [],

    // ── 7天日历 → 14天日历 ───────────────────────────────
    allDays: [],            // 14天完整数据（-7~+6）
    todayIdx: 7,            // 今天在 allDays 中的索引
    selectedDayIdx: 7,      // 当前选中的天（默认今天）
    selectedDayData: null,  // 选中天的详情（tideChart/extremes/hourly）
    // 选中天的折线图（独立于首屏折线图，避免互相覆盖）
    dayChartPoints: [],
    dayChartSegments: [],
    dayExtremePoints: [],
    dayHighTide: null,      // 选中天真实高潮（取 extremes）
    dayLowTide: null,       // 选中天真实低潮（取 extremes）
    dayDatumMixed: false,   // 选中天与全局基准面不一致（模型 MSL 混在验潮站数据里）
    seaLevelDatum: 'msl',   // 当前潮高实际基准面：station | msl
    tideDays: 7,            // 已加载的验潮站潮汐天数（默认 7，滑到远端按需扩到 10）
    waveExpanded: false,    // 逐小时浪况默认收起
    dayChartAxisMin: 0,
    dayChartAxisMax: 6,
    dayWave24hPoints: [],   // 选中天24h浪高折线
    dayCurrentPointX: 0,    // 选中天当前时刻游标（仅今天显示）
    dailyForecast: [],

    // ── 鱼口预测 ─────────────────────────────────────────
    atmosByDay: {},         // { "YYYY-MM-DD": [{hour,pressure,wmoScore,...}] }
    dayFishHeatmap: [],     // 选中天逐小时热力图 [{hour,score,grade,color,heightPct}]
    dayBestWindows: [],     // 选中天最佳垂钓窗口 [{startTime,endTime,duration,avgScore,reason}]
    dayGrade: null,         // 选中天综合评级 {grade,label,color,emoji,avgScore}

    // ── 天气 ──────────────────────────────────────────────
    weather: null,
    forecast: [],
    gangHaiScore: 0,

    // ── 缓存状态 ──────────────────────────────────────────
    marineFromCache: false,
    weatherFromCache: false,

    // ── 潮汐数据来源 ──────────────────────────────────────
    // null=未知；{ source:'qweather'|'model', siteName, distanceKm, datum, ... }
    tideMeta: null,

    // ── 和风扩展：天光 / 月相 / 预警 / 降水 ────────────────
    daylight: null,         // 日出日落 + 太阳位置 + 黄金档
    moonTimes: null,        // { rise, set }
    qweatherFishing: null,  // 和风钓鱼指数 { level, category, text }（官方参考，不直接展示）
    goScore: '--',          // 今日出钓指数（统一服务）
    goScoreLevel: '',
    goScoreReady: false,
    warnings: [],           // 天气预警
    warnExpanded: false,
    minutelyText: '',       // 分钟级降水提示
    minutelyHasRain: false,
    timeline: null,         // 今日节奏时间轴
    timelineTip: null,      // 时间轴点按详情
    todayHourScores: [],    // 今日逐小时鱼口分
    goldenActive: '',       // 高亮的黄金档
  },

  onLoad() {
    // 读取收藏列表
    this.setData({ savedList: savedPlaces.getAll() });
    // 不做隐私预检：定位由 wx.getLocation 自行触发隐私/授权弹窗
    this.loadAll();
  },

  onPrivacyAgree() {
    this._privacyDeclined = false;
    // 当前若是兜底地点，同意后重新尝试定位
    if (this.data.activePlace && this.data.activePlace.isDefault) {
      this.setData({ activePlace: null });
    }
    this.loadAll();
  },

  onPrivacyDecline() {
    // 用户明确拒绝隐私授权：不调用受保护接口，直接使用兜底地点
    this._privacyDeclined = true;
    this.loadAll();
  },

  onShow() {
    // 同步自定义 tabBar 高亮状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    // 跨天：潮汐日历的 todayIdx / “今天”标签在数据生成时固化，日期一变必须整页重建
    if (this.data.marineLoaded && this._marineDayKey &&
        this._marineDayKey !== apiCache.todayKeyBJ()) {
      this.loadAll();
      return;
    }
    // 回到页面时刷新太阳位置、时间轴游标与出钓指数
    if (this.data.daylight) this._applyExtra(this._extraRaw);
    this._timelineRect = null;
    this.loadTodayScore();

    // 离开超过 10 分钟：静默刷新快变数据（实况 + 预警/降水）
    if (this.data.weatherLoaded && this._lastLoadAt &&
        Date.now() - this._lastLoadAt > 10 * 60 * 1000) {
      this.refreshFast(true);
    }
  },

  // 下拉刷新：客户端忽略本地缓存，但尊重云端 TTL（软刷新）
  // 不清理其他城市的缓存，也不强制刷新海况（计费接口）
  onPullDownRefresh() {
    this.loadAll(true).finally(() => {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: this._refreshWasCached
          ? `已是最新 · ${this.data.weatherAgeText}更新`
          : '已更新',
        icon: 'none',
      });
    });
  },

  // ══════════════════════════════════════════════════════════
  // 核心加载
  // ══════════════════════════════════════════════════════════
  async loadAll(forceRefresh = false) {
    // 只有首屏才全屏 loading；刷新时保留旧内容，避免白屏和跳回顶部
    const firstLoad = !this.data.marineLoaded && !this.data.weatherLoaded;
    this.setData({
      loading: firstLoad,
      errorMsg: '', locateDenied: false,
    });

    // 确定坐标来源：收藏地点 or 定位
    let lat, lon, displayCity;
    const { activePlace } = this.data;

    if (activePlace) {
      // 使用选定地点坐标
      ({ lat, lon } = activePlace);
      displayCity = activePlace.name;
    } else if (this._privacyDeclined) {
      // 用户已拒绝隐私授权：不调用定位，直接展示兜底地点
      lat = DEFAULT_PLACE.lat;
      lon = DEFAULT_PLACE.lon;
      displayCity = DEFAULT_PLACE.name;
      this.setData({
        activePlace: DEFAULT_PLACE,
        city: DEFAULT_PLACE.name,
        isLocating: false,
        locateDenied: false,
        errorMsg: `未同意隐私授权，已显示${DEFAULT_PLACE.name}；可点击上方地点搜索其他城市`,
      });
    } else {
      // GPS 定位
      this.setData({ isLocating: true, city: '定位中…' });
      try {
        const pos = await this._getLocation();
        lat = pos.latitude;
        lon = pos.longitude;
        displayCity = null;  // 由 getWeather 返回城市名
        // 记录真实定位，供首页/我的出钓指数复用，避免两地数据不一致
        try { wx.setStorageSync('lastGeo', { lat, lon, ts: Date.now() }); } catch (e) {}
        this._privacyDeclined = false;
      } catch (err) {
        console.error('[weather] 定位失败:', err && (err.errMsg || err.message), err);
        // 定位不可用时兜底默认城市，保证页面有数据
        lat = DEFAULT_PLACE.lat;
        lon = DEFAULT_PLACE.lon;
        displayCity = DEFAULT_PLACE.name;
        this._handleLocateFail(err);
      }
      this.setData({ isLocating: false });
    }

    // ── 本地缓存 key ──────────────────────────────────────
    this._coords = { lat, lon };
    const coordKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (this._timesKey !== coordKey) {
      this._times = {};
      this._timesKey = coordKey;
    }
    this._times = this._times || {};

    const marineKey  = apiCache.geoKey('marine',  lat, lon);
    const weatherKey = apiCache.geoKey('weather', lat, lon);
    const atmosKey   = apiCache.geoKey('atmos',   lat, lon);
    const astroKey   = apiCache.geoKey('astro',   lat, lon);
    const indexKey   = apiCache.geoKey('indices', lat, lon);
    const nowKey     = apiCache.geoKey('extra_now', lat, lon);

    let mEntry       = apiCache.getEntry(marineKey);
    const wEntry     = apiCache.getEntry(weatherKey);
    const aEntry     = apiCache.getEntry(atmosKey);
    const astroEntry = apiCache.getEntry(astroKey);
    const idxEntry   = apiCache.getEntry(indexKey);
    const nowEntry   = apiCache.getEntry(nowKey);

    // 旧版本缓存可能缺少字段，直接丢弃，避免渲染时崩溃；
    // 跨天的海况缓存整体错一天，同样丢弃并重取
    if (mEntry && (!this._isValidMarine(mEntry.data) || !apiCache.isMarineToday(mEntry.data))) {
      apiCache.remove(marineKey);
      mEntry = null;
    }

    // 下拉只强制刷新快变数据；海况（计费）与气压（1小时）仍优先走缓存
    const cachedMarine  = mEntry ? mEntry.data : null;
    const cachedWeather = (!forceRefresh && wEntry) ? wEntry.data : null;
    const cachedAtmos   = aEntry ? aEntry.data : null;

    // ── 第一段：海况 / 天气实况 / 气压（并行）──────────────
    const tasks = [];
    if (!cachedMarine)   tasks.push({ key: 'marine',  fn: wx.cloud.callFunction({ name: 'getMarineData',       data: { lat, lon, tideDays: this.data.tideDays } }) });
    if (!cachedWeather)  tasks.push({ key: 'weather', fn: wx.cloud.callFunction({ name: 'getWeather',          data: { lat, lon } }) });
    if (!cachedAtmos)    tasks.push({ key: 'atmos',   fn: wx.cloud.callFunction({ name: 'getWeatherForecast', data: { lat, lon } }) });

    let freshMarine = null, freshWeather = null, freshAtmos = null;
    const fromCloudCache = { marine: false, weather: false, atmos: false };
    const cloudCachedAt  = { marine: null, weather: null, atmos: null };

    if (tasks.length) {
      const results = await Promise.allSettled(tasks.map(t => t.fn));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.result?.success) {
          const key = tasks[i].key;
          const res = r.value.result;
          const d   = res.data;
          if (d == null) return;
          fromCloudCache[key] = !!res._fromCache;
          cloudCachedAt[key]  = res._cachedAt || null;
          if (key === 'marine') {
            if (this._isValidMarine(d)) {
              freshMarine = d;
              // 只缓存“今天”的数据，避免跨天旧快照被复用
              if (apiCache.isMarineToday(d)) apiCache.set(marineKey, d, apiCache.TTL.marine);
            }
          } else if (key === 'weather') {
            freshWeather = d;
            apiCache.set(weatherKey, d, apiCache.TTL.weather_live);
          } else if (key === 'atmos') {
            freshAtmos = d;
            apiCache.set(atmosKey, d, apiCache.TTL.atmos);
          }
        }
      });
    }

    const marineData  = freshMarine  || cachedMarine;
    const weatherData = freshWeather || cachedWeather;
    const atmosData   = freshAtmos   || cachedAtmos;
    const marineFromCache  = !freshMarine && !!cachedMarine;
    // 云端也可能返回缓存，这种情况下同样算“缓存数据”
    const weatherFromCache = !freshWeather && (!!cachedWeather || (forceRefresh && fromCloudCache.weather));

    const nowMs = Date.now();
    const tsOf = iso => (iso ? new Date(iso).getTime() : nowMs);

    if (freshMarine) {
      this._times.marine = fromCloudCache.marine ? tsOf(cloudCachedAt.marine) : nowMs;
    } else if (mEntry?.cachedAt) {
      this._times.marine = mEntry.cachedAt;
    }
    if (freshWeather) {
      this._times.weather = fromCloudCache.weather ? tsOf(cloudCachedAt.weather) : nowMs;
    } else if (wEntry?.cachedAt) {
      this._times.weather = wEntry.cachedAt;
    }
    if (freshAtmos) {
      this._times.atmos = fromCloudCache.atmos ? tsOf(cloudCachedAt.atmos) : nowMs;
    } else if (aEntry?.cachedAt) {
      this._times.atmos = aEntry.cachedAt;
    }

    // ── 应用数据 ──────────────────────────────────────────
    if (marineData) {
      this._applyMarineData(marineData, atmosData);
    } else {
      this.setData({ errorMsg: '海洋数据加载失败，请下拉刷新重试' });
    }

    if (weatherData) {
      const city = displayCity || weatherData.city;
      this.setData({ city, weather: weatherData.current, forecast: weatherData.forecast, weatherLoaded: true });
      this._recalcFishScore();
    } else {
      this.setData({ city: displayCity || '当前位置' });
    }

    // 核心数据已就绪：先解除首屏 loading，天光等扩展数据随后补齐
    if (firstLoad) this.setData({ loading: false });

    // ── 第二段：天光/指数/预警（按各自 TTL 决定是否请求）──
    let extraData = {
      sun:      astroEntry ? astroEntry.data.sun      : null,
      moon:     astroEntry ? astroEntry.data.moon     : null,
      fishing:  idxEntry   ? idxEntry.data.fishing    : null,
      warnings: nowEntry   ? (nowEntry.data.warnings || []) : [],
      minutely: nowEntry   ? (nowEntry.data.minutely || null) : null,
    };
    if (astroEntry?.cachedAt) this._times.astro = astroEntry.cachedAt;
    if (idxEntry?.cachedAt)   this._times.indices = idxEntry.cachedAt;
    if (nowEntry?.cachedAt)   this._times.now = nowEntry.cachedAt;

    const needExtra = !astroEntry || !idxEntry || !nowEntry;
    if (needExtra) {
      // 分钟级降水按需请求：未来 6 小时有降水才花这次调用
      const needRain = needRainSoon(atmosData, weatherData);
      try {
        const res = await wx.cloud.callFunction({
          name: 'getWeatherExtra',
          data: { lat, lon, needRain },
        });
        const r = res.result;
        if (r?.success && r.data && r.data.source !== 'none') {
          const d = r.data;
          extraData = {
            sun:      d.sun || extraData.sun,
            moon:     d.moon || extraData.moon,
            fishing:  d.fishing || extraData.fishing,
            warnings: Array.isArray(d.warnings) ? d.warnings : extraData.warnings,
            minutely: d.minutely !== undefined ? d.minutely : extraData.minutely,
          };
          const at = d.cachedAt || {};
          const cacheFlag = r._cache || {};
          if (d.sun || d.moon) {
            apiCache.set(astroKey, { sun: d.sun, moon: d.moon }, apiCache.TTL.astro);
            this._times.astro = cacheFlag.astro === false ? nowMs : tsOf(at.astro);
          }
          if (d.fishing) {
            apiCache.set(indexKey, { fishing: d.fishing }, apiCache.TTL.indices);
            this._times.indices = cacheFlag.indices === false ? nowMs : tsOf(at.indices);
          }
          apiCache.set(nowKey, {
            warnings: extraData.warnings,
            minutely: extraData.minutely,
            minutelyRequested: needRain,
          }, apiCache.TTL.extra_now);
          this._times.now = cacheFlag.now === false ? nowMs : tsOf(at.now);
        }
      } catch (e) {
        console.warn('[weather] extra 加载失败:', e && (e.errMsg || e.message));
      }
    }

    this._extraRaw = extraData;
    // 和风扩展（失败时用本地日出日落兜底，不阻塞主流程）
    this._applyExtra(extraData);

    // ── 缓存状态仅在下拉刷新时以 toast 提示 ───────────────
    this._refreshWasCached = weatherFromCache;
    this._lastLoadAt = Date.now();

    this.setData({
      loading: false,
      marineFromCache,
      weatherFromCache,
      marineUpdatedAt:  this._times.marine  || null,
      weatherUpdatedAt: this._times.weather || null,
      marineAgeText:  ageText(this._times.marine),
      weatherAgeText: ageText(this._times.weather),
      astroAgeText:   ageText(this._times.astro),
    });
  },

  // ── 局部刷新：实况 + 预警/降水（快变数据）─────────────────
  async refreshFast(silent) {
    const isSilent = silent === true;   // 兼容 WXML 事件对象
    if (this._refreshingFast) return;
    // 手动刷新节流：1 分钟内重复点击只提示
    const last = this._times && this._times.weather;
    if (!isSilent && last && Date.now() - last < 60 * 1000) {
      wx.showToast({ title: '刚刚已更新', icon: 'none' });
      return;
    }
    const { lat, lon } = this._coords || {};
    if (lat == null) return;

    this._refreshingFast = true;
    if (!isSilent) this.setData({ refreshingFast: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'getWeather', data: { lat, lon } });
      const r = res.result;
      if (r?.success && r.data) {
        const d = r.data;
        apiCache.set(apiCache.geoKey('weather', lat, lon), d, apiCache.TTL.weather_live);
        this._times = this._times || {};
        this._times.weather = r._fromCache && r._cachedAt
          ? new Date(r._cachedAt).getTime() : Date.now();
        this.setData({
          weather: d.current || this.data.weather,
          forecast: d.forecast || this.data.forecast,
          weatherUpdatedAt: this._times.weather,
          weatherAgeText: ageText(this._times.weather),
        });
        this._recalcFishScore();
      }

      // 预警/分钟降水：本地 10 分钟缓存未过期就不请求
      const nowKey = apiCache.geoKey('extra_now', lat, lon);
      if (!apiCache.getEntry(nowKey)) {
        const needRain = needRainSoon({ byDay: this.data.atmosByDay }, { forecast: this.data.forecast });
        const ex = await wx.cloud.callFunction({
          name: 'getWeatherExtra',
          data: { lat, lon, needRain },
        });
        const er = ex.result;
        if (er?.success && er.data && er.data.source !== 'none') {
          const d = er.data;
          const nowData = {
            warnings: Array.isArray(d.warnings) ? d.warnings : [],
            minutely: d.minutely || null,
            minutelyRequested: needRain,
          };
          apiCache.set(nowKey, nowData, apiCache.TTL.extra_now);
          this._times = this._times || {};
          this._times.now = (er._cache && er._cache.now === false)
            ? Date.now() : (d.cachedAt?.now ? new Date(d.cachedAt.now).getTime() : Date.now());
          this.setData({
            warnings: nowData.warnings,
            minutelyText: (d.minutely && d.minutely.summary) || '',
            minutelyHasRain: !!(d.minutely && d.minutely.hasRain),
            warnExpanded: false,
          });
        }
      }

      if (!isSilent) {
        wx.showToast({
          title: this.data.weatherAgeText === '刚刚' ? '已更新' : `已更新 · ${this.data.weatherAgeText}`,
          icon: 'none',
        });
      }
    } catch (e) {
      console.warn('[weather] refreshFast 失败:', e && (e.errMsg || e.message));
      if (!isSilent) wx.showToast({ title: '刷新失败，请稍后再试', icon: 'none' });
    } finally {
      this._refreshingFast = false;
      if (!isSilent) this.setData({ refreshingFast: false });
    }
  },

  // ── 局部刷新：仅海况（计费接口，10 分钟内不重复请求）──────
  // silent: 静默扩展潮汐天数，不弹 toast、不受 10 分钟限制、不写客户端缓存
  async refreshMarine(silent, tideDays) {
    const isSilent = silent === true;
    const days = Math.min(10, Math.max(7, parseInt(tideDays, 10) || this.data.tideDays || 7));
    if (this.data.refreshingMarine) return;
    const last = this._times && this._times.marine;
    if (!isSilent && last && Date.now() - last < 10 * 60 * 1000) {
      wx.showToast({ title: `海况${ageText(last)}已更新`, icon: 'none' });
      return;
    }
    const { lat, lon } = this._coords || {};
    if (lat == null) return;

    if (!isSilent) this.setData({ refreshingMarine: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMarineData',
        data: { lat, lon, tideDays: days },
      });
      const r = res.result;
      if (r?.success && this._isValidMarine(r.data)) {
        // 扩展天数后的 payload 不写客户端缓存，避免下次启动绕过“默认 7 天”
        if (days <= 7 && apiCache.isMarineToday(r.data)) {
          apiCache.set(apiCache.geoKey('marine', lat, lon), r.data, apiCache.TTL.marine);
        }
        this._times = this._times || {};
        this._times.marine = r._fromCache && r._cachedAt
          ? new Date(r._cachedAt).getTime() : Date.now();
        this._applyMarineData(r.data, { byDay: this.data.atmosByDay });
        this.setData({
          marineUpdatedAt: this._times.marine,
          marineAgeText: ageText(this._times.marine),
        });
        if (!isSilent) {
          wx.showToast({
            title: r._fromCache ? '已读取最近一次海况' : '海况已更新',
            icon: 'none',
          });
        }
      } else if (!isSilent) {
        wx.showToast({ title: '海况刷新失败', icon: 'none' });
      }
    } catch (e) {
      console.warn('[weather] refreshMarine 失败:', e && (e.errMsg || e.message));
      if (!isSilent) wx.showToast({ title: '海况刷新失败', icon: 'none' });
    } finally {
      if (!isSilent) this.setData({ refreshingMarine: false });
    }
  },

  // 校验海况数据结构（兼容旧版本缓存 / 云端返回异常）
  _isValidMarine(d) {
    return !!(d && d.currentData &&
      Array.isArray(d.tideChart24h) &&
      Array.isArray(d.allDays) && d.allDays.length > 0);
  },

  _applyMarineData(d, atmosData) {
    // 数据不完整时直接跳过，避免渲染崩溃
    if (!this._isValidMarine(d)) {
      console.warn('[weather] 海况数据不完整，已跳过渲染:', d && Object.keys(d));
      return;
    }
    const {
      currentData, tideChart24h, todayExtremes, tomorrowExtremes,
      dailyForecast, hourlyForecast48h,
      allDays = [], todayIdx = 0, tideMeta = null,
    } = d;

    const {
      points: chartPoints, segments: chartSegments,
      axisMin, axisMax, minLevel, maxLevel,
    } = buildChartPoints(tideChart24h);
    const levels = tideChart24h.map(t => t.level).filter(v => v != null);
    const extremePoints  = markExtremePoints(chartPoints, todayExtremes);

    // “现在”按数据快照时刻计算，跨天/陈旧数据时不会把当前钟点套到旧曲线上
    const snapTs         = (this._times && this._times.marine) || Date.now();
    const nowHour        = new Date(snapTs).getHours();
    const msl            = currentData?.seaLevelMSL ?? 0;
    const todayDay       = allDays[todayIdx] || {};
    const todayIsStation = String(todayDay.tideSource || '').indexOf('qweather') === 0;
    // 当前潮高的真实基准面：优先用服务端标记，旧缓存按当天数据源推断
    const seaLevelDatum  = currentData?.seaLevelDatum ||
      ((tideMeta && tideMeta.datum === 'station' && todayIsStation) ? 'station' : 'msl');
    // 同一天内的刷新保留用户选中的日期，只有跨天时才归位到今天
    const prevDayKey = this._marineDayKey;
    this._marineDayKey = todayDay.date || null;
    const dayChanged = !!prevDayKey && prevDayKey !== todayDay.date;

    // 赶海指数：模型数据按 MSL 绝对潮位；验潮站数据按当日潮位区间相对位置
    let ganHaiScore;
    if (tideMeta && tideMeta.datum === 'station' && levels.length) {
      const minL = Math.min(...levels), maxL = Math.max(...levels);
      const rel = maxL > minL ? (msl - minL) / (maxL - minL) : 0.5;
      ganHaiScore = rel < 0.15 ? 5 : rel < 0.3 ? 4 : rel < 0.5 ? 3 : rel < 0.75 ? 2 : 1;
    } else {
      ganHaiScore = msl < -0.8 ? 5 : msl < -0.5 ? 4 : msl < -0.2 ? 3 : msl < 0.2 ? 2 : 1;
    }

    // 大气数据按日期分组存储
    const atmosByDay = atmosData?.byDay || {};

    // 今日洞察：最佳窗口、月相、潮型、气压
    const today       = allDays[todayIdx] || {};
    const todayAtmos  = atmosByDay[today.date] || [];
    const todayScores = fishScore.calcDayScores(today.hourly || [], todayAtmos);
    const moonInfo    = getMoonInfo(new Date());
    const tideType    = getTideType(allDays, todayIdx);
    const pressure    = getPressureInfo(todayAtmos, nowHour);
    // 本次 payload 实际覆盖的验潮站天数（连续算到第一个模型日为止）
    let stationDays = 0;
    for (let i = todayIdx; i < allDays.length; i++) {
      if (String(allDays[i].tideSource || '').indexOf('qweather') === 0) stationDays++;
      else break;
    }

    // 刷新（onShow 静默刷新/下拉/补拉验潮站）不应把选中日期拉回今天；
    // 按「日期」而不是数组下标恢复选中，避免 allDays 变化时错位到别的天
    const prevSelected = this.data.selectedDayIdx;
    const prevSelectedDate = this._selectedDate ||
      (allDays[prevSelected] && allDays[prevSelected].date);
    let selectedIdx = todayIdx;
    if (!dayChanged && this.data.marineLoaded && prevSelectedDate) {
      const byDate = allDays.findIndex(d => d.date === prevSelectedDate);
      if (byDate >= 0) selectedIdx = byDate;
    }
    this._selectedDate = allDays[selectedIdx] ? allDays[selectedIdx].date : null;

    this.setData({
      currentData, tideChart24h, chartPoints, chartSegments, extremePoints,
      seaLevelDatum,
      tideDays: Math.max(7, Math.min(10, stationDays)),
      // 潮高使用当地潮汐基准面，Y 轴从 0 起
      chartMinLevel: minLevel != null ? minLevel : 0,
      chartMaxLevel: maxLevel != null ? maxLevel : 0,
      chartAxisMin:  axisMin,
      chartAxisMax:  axisMax,
      currentPointX:  parseFloat(((nowHour / 23) * 100).toFixed(1)),
      todayExtremes, tomorrowExtremes,
      dailyForecast, hourlyForecast48h,
      waveBarScale: computeWaveBarScale(hourlyForecast48h),
      wave48hPoints:  build48hLinePoints(hourlyForecast48h, 'waveHeight'),
      swell48hPoints: build48hLinePoints(hourlyForecast48h, 'swellHeight'),
      tide48hPoints:  build48hLinePoints(hourlyForecast48h, 'tideLevel'),
      gangHaiScore:   ganHaiScore,
      marineLoaded: true,
      allDays, todayIdx,
      tideMeta,
      selectedDayIdx: selectedIdx,
      atmosByDay,
      todayBestWindows: todayScores.bestWindows || [],
      todayGrade:       todayScores.dayGrade || null,
      todayHourScores:  todayScores.scores || [],
      moonInfo,
      tideTypeInfo:     tideType,
      tideRange:        tideType ? tideType.range : null,
      pressureNow:      pressure.now,
      pressureTrend:    pressure.trendText,
      pressureDelta:    pressure.delta,
      nextTide:         buildNextTide(todayExtremes, tomorrowExtremes, new Date()),
      tideConfidence:   buildTideConfidence(tideMeta),
      weekBestDays:     buildWeekBestDays(allDays, todayIdx, atmosByDay),
    });

    this._applyDayChart(selectedIdx, allDays, selectedIdx === todayIdx ? nowHour : -1, atmosByDay);
    this._recalcFishScore();
    this._chartRect = null;
  },

  // 应用和风扩展数据（天文/指数/预警/降水），失败时降级为本地推算
  _applyExtra(extra) {
    const coords = this._coords || { lat: DEFAULT_PLACE.lat, lon: DEFAULT_PLACE.lon };
    const now = new Date();
    const daylight = buildDaylight({
      sun: extra && extra.sun,
      now,
      lat: coords.lat,
      lon: coords.lon,
    });

    const { allDays, todayIdx, todayExtremes, todayBestWindows } = this.data;
    const today = allDays[todayIdx];
    const timeline = buildTimeline({
      daylight,
      // 优先用和风验潮站极值，回退到模型极值
      extremes: today && today.extremes && today.extremes.length
        ? today.extremes : todayExtremes,
      bestWindows: todayBestWindows,
      now,
    });

    this.setData({
      daylight,
      timeline,
      timelineTip: null,
      moonTimes: extra && extra.moon
        ? { rise: extra.moon.moonrise || '--', set: extra.moon.moonset || '--' }
        : null,
      qweatherFishing: (extra && extra.fishing) || null,
      warnings: (extra && extra.warnings) || [],
      minutelyText: (extra && extra.minutely && extra.minutely.summary) || '',
      minutelyHasRain: !!(extra && extra.minutely && extra.minutely.hasRain),
      warnExpanded: false,
    });
    this._timelineRect = null;
  },

  toggleWarn() {
    this.setData({ warnExpanded: !this.data.warnExpanded });
  },

  // 把建议垂钓窗口写入系统日历（提前 30 分钟提醒）
  addTideWindowToCalendar(e) {
    // 兼容：组件通过 detail.idx 抛出，旧写法从 dataset 取
    const rawIdx = e.detail && e.detail.idx != null
      ? e.detail.idx
      : (e.currentTarget && e.currentTarget.dataset.idx);
    const idx = parseInt(rawIdx, 10);
    const win = (this.data.dayBestWindows || [])[idx];
    const day = this.data.selectedDayData;
    if (!win || !day || !day.date) return;
    if (day.isPast) {
      wx.showToast({ title: '过去的日期无法添加提醒', icon: 'none' });
      return;
    }
    if (typeof wx.addPhoneCalendar !== 'function') {
      wx.showToast({ title: '当前微信版本不支持日历提醒', icon: 'none' });
      return;
    }

    const [y, m, d] = day.date.split('-').map(Number);
    const start = new Date(y, m - 1, d, win.startHour, 0, 0);
    const endH = Math.min(23, win.endHour + 1);
    const endM = win.endHour + 1 >= 24 ? 59 : 0;
    const end = new Date(y, m - 1, d, endH, endM, 0);
    if (end.getTime() <= start.getTime()) end.setTime(start.getTime() + 60 * 60 * 1000);

    wx.addPhoneCalendar({
      title: `出钓提醒 · ${win.timeText}`,
      startTime: Math.floor(start.getTime() / 1000),
      endTime: Math.floor(end.getTime() / 1000),
      alarm: true,
      alarmOffset: 30 * 60,
      description: `GoCasting 建议垂钓时段，综合评分 ${win.avgScore}/10（${win.reason || '综合条件较好'}）`,
      success: () => wx.showToast({ title: '已加入系统日历', icon: 'success' }),
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        if (msg.indexOf('cancel') >= 0) return;
        wx.showToast({ title: '添加失败，请重试', icon: 'none' });
      },
    });
  },

  // 今日出钓指数：复用统一服务（与首页、我的同源同缓存）
  loadTodayScore() {
    goScoreService.getTodayScore().then(r => {
      if (!r) return;
      this.setData({
        goScore: r.score,
        goScoreLevel: r.level.short,
        goScoreReady: true,
      });
    }).catch(() => {});
  },

  goGoScore() {
    wx.navigateTo({ url: '/pages/go-score/go-score' });
  },

  // ── 今日节奏时间轴：点按查看该时刻潮高与鱼口 ──────────────
  onTimelineTouch(e) {
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    clearTimeout(this._timelineHideTimer);
    const x = touch.clientX;

    const update = rect => {
      if (!rect || !rect.width) return;
      const pct = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
      const min = (pct / 100) * 1440;
      const hour = Math.min(23, Math.floor(min / 60));
      const { tideChart24h, todayHourScores } = this.data;
      const n = tideChart24h.length;

      // 潮高：按小时线性插值
      let level = null, tideState = '';
      if (n > 1) {
        const idx = Math.min(n - 2, Math.floor((min / 1440) * (n - 1)));
        const frac = (min / 1440) * (n - 1) - idx;
        const a = tideChart24h[idx]?.level;
        const b = tideChart24h[idx + 1]?.level;
        if (a != null && b != null) {
          level = parseFloat((a + (b - a) * frac).toFixed(2));
          const slope = b - a;
          tideState = slope > 0.05 ? '⬆ 涨潮' : slope < -0.05 ? '⬇ 退潮' : '— 平潮';
        }
      }

      const hs = todayHourScores[hour];
      this.setData({
        timelineTip: {
          xPct: parseFloat(pct.toFixed(1)),
          timeStr: `${String(hour).padStart(2, '0')}:${String(Math.floor(min % 60)).padStart(2, '0')}`,
          level,
          tideState,
          score: hs ? hs.score : null,
          scoreLabel: hs ? hs.label : '',
          scoreColor: hs ? hs.color : '',
        },
      });
    };

    if (this._timelineRect) {
      update(this._timelineRect);
    } else {
      wx.createSelectorQuery()
        .select('#timeline-track')
        .boundingClientRect(rect => { this._timelineRect = rect; update(rect); })
        .exec();
    }
  },

  onTimelineTouchEnd() {
    clearTimeout(this._timelineHideTimer);
    this._timelineHideTimer = setTimeout(() => this.setData({ timelineTip: null }), 4000);
  },

  // 黄金档 chip → 滚动到时间轴并高亮对应时段
  onGoldenTap(e) {
    // 兼容：组件通过 detail 抛出，旧写法从 dataset 取
    const key = (e.detail && e.detail.key) || (e.currentTarget && e.currentTarget.dataset.key);
    if (!key) return;
    this.setData({ goldenActive: key });
    wx.pageScrollTo({ selector: '#timeline-card', duration: 300 });
    clearTimeout(this._goldenTimer);
    this._goldenTimer = setTimeout(() => this.setData({ goldenActive: '' }), 2400);
  },

  // 出钓指数：与首页 / 我的共用 utils/goScore 引擎，口径完全一致
  _recalcFishScore() {
    const { weather, allDays, todayIdx, currentData } = this.data;
    const hour = new Date().getHours();
    const today = allDays[todayIdx];
    const tomorrow = allDays[todayIdx + 1];
    const tideSeries = goScoreEngine.mergeTideSeries(
      today && today.tideChart,
      tomorrow && tomorrow.tideChart
    );

    if (!tideSeries.length && !weather && !currentData) {
      this.setData({ fishScore: null, fishScoreLabel: '暂无数据' });
      return;
    }

    // 浪高优先取当天逐小时数据，缺失时回退实况
    const waveHeight = today && today.hourly && today.hourly[hour]
      ? today.hourly[hour].waveHeight
      : (currentData ? currentData.waveHeight : null);

    const r = goScoreEngine.calcScore({
      tideSeries,
      hour,
      tideIndex: hour,
      weather,
      waveHeight,
      date: new Date(),
    });
    this.setData({
      fishScore: r.score,
      fishScoreLabel: `${r.level.label} · ${r.tide.label}`,
    });
  },

  async _getLocation() {
    // 1) 已拒绝过授权时，wx.authorize 不会再弹窗，直接失败，只能引导去设置
    const setting = await new Promise(r =>
      wx.getSetting({ success: r, fail: () => r({ authSetting: {} }) })
    );
    const authorized = setting.authSetting['scope.userLocation'];
    if (authorized === false) {
      throw this._locateError('DENIED', 'scope.userLocation 已被拒绝');
    }
    if (authorized !== true) {
      try {
        await new Promise((res, rej) =>
          wx.authorize({ scope: 'scope.userLocation', success: res, fail: rej })
        );
      } catch (e) {
        const msg = (e && e.errMsg) || 'authorize:fail';
        throw this._locateError(/deny|denied|拒绝/i.test(msg) ? 'DENIED' : 'AUTH_FAIL', msg);
      }
    }

    // 2) 取坐标
    try {
      return await new Promise((res, rej) =>
        wx.getLocation({ type: 'gcj02', success: res, fail: rej })
      );
    } catch (e) {
      const msg = (e && e.errMsg) || 'getLocation:fail';
      let code = 'LOCATE_FAIL';
      if (/privacy|隐私|api scope is not declared/i.test(msg)) code = 'PRIVACY';
      else if (/deny|denied|auth/i.test(msg)) code = 'DENIED';
      else if (/system|permission|location service|定位/i.test(msg)) code = 'SYSTEM';
      throw this._locateError(code, msg);
    }
  },

  _locateError(code, detail) {
    const err = new Error(detail || code);
    err.code = code;
    return err;
  },

  // 定位失败统一处理：切换到兜底地点，并区分是否需要引导开启权限
  _handleLocateFail(err) {
    const code = err && err.code;
    // 只有小程序侧拒绝授权才能用 openSetting 修复；系统级关闭需去手机设置
    const denied = code === 'DENIED' || code === 'AUTH_FAIL';
    const systemOff = code === 'SYSTEM';
    // 隐私保护指引未声明位置信息：openSetting 也无法解决，给出明确提示
    if (code === 'PRIVACY') {
      console.warn('[weather] 定位接口未在《用户隐私保护指引》中声明，请到小程序后台「设置 → 服务内容声明 → 用户隐私保护指引」补充「位置信息」并提交审核');
    }
    this.setData({
      activePlace: DEFAULT_PLACE,
      city: DEFAULT_PLACE.name,
      isLocating: false,
      locateDenied: denied,
      errorMsg: code === 'PRIVACY'
        ? `定位服务暂不可用，已显示${DEFAULT_PLACE.name}；可点击上方地点搜索其他城市`
        : systemOff
          ? `系统定位服务未开启，已显示${DEFAULT_PLACE.name}；请在手机设置中允许微信使用定位`
          : denied
            ? `未开启定位权限，已显示${DEFAULT_PLACE.name}；可点“去开启”授权，或搜索其他城市`
            : `无法获取位置，已显示${DEFAULT_PLACE.name}；可点击上方地点搜索其他城市`,
    });
  },

  // 用户主动点击“去开启”后才调用 openSetting（微信要求必须由用户点击触发）
  openLocationSetting() {
    const that = this;
    wx.openSetting({
      success(s) {
        if (s.authSetting['scope.userLocation']) {
          that._privacyDeclined = false;
          that.setData({ locateDenied: false, errorMsg: '' });
          // 当前是兜底地点时，清空以便重新定位
          if (that.data.activePlace && that.data.activePlace.isDefault) {
            that.setData({ activePlace: null });
          }
          that.loadAll();
        } else {
          // 设置页为空：通常是隐私指引未生效、从未成功请求过定位，或系统级定位关闭
          wx.showModal({
            title: '设置中暂无定位项',
            content: '可到系统设置检查微信的定位权限，或直接手动选择城市。开发者工具内的设置页为空属正常，请用真机验证。',
            confirmText: '系统设置',
            cancelText: '手动选城市',
            success(r) {
              if (r.confirm) that.openAppAuthSetting();
              else that.openPlacePanel();
            },
          });
        }
      },
      fail() {
        wx.showToast({ title: '打开设置失败，请到系统设置中开启', icon: 'none' });
      },
    });
  },

  // 系统级权限页（定位总开关、精确位置等）
  openAppAuthSetting() {
    if (!wx.openAppAuthorizeSetting) {
      wx.showToast({ title: '请到手机设置中允许微信使用定位', icon: 'none' });
      return;
    }
    wx.openAppAuthorizeSetting({
      fail: () => wx.showToast({ title: '请到手机设置中允许微信使用定位', icon: 'none' }),
    });
  },

  // ══════════════════════════════════════════════════════════
  // 地点面板
  // ══════════════════════════════════════════════════════════

  openPlacePanel() {
    this.setData({
      placePanel: true,
      searchKeyword: '',
      searchResults: [],
      savedList: savedPlaces.getAll(),
    });
  },

  closePlacePanel() {
    this.setData({
      placePanel: false, searchResults: [], searchKeyword: '',
      keyboardHeight: 0, panelKeyboardStyle: '',
    });
  },

  // 键盘高度变化：把底部面板抬到键盘上方，避免搜索列表被遮挡
  onKeyboardHeightChange(e) {
    const h = Math.max(0, Math.round((e.detail && e.detail.height) || 0));
    if (h === this.data.keyboardHeight) return;
    this.setData({
      keyboardHeight: h,
      panelKeyboardStyle: h
        ? `bottom:${h}px;max-height:calc(100vh - ${h}px - 80rpx);`
        : '',
    });
  },

  // 遮罩点击关闭
  onMaskTap() {
    this.closePlacePanel();
  },

  // 防止面板内点击穿透
  onPanelTap() {},

  // ── 搜索输入（防抖 400ms）────────────────────────────────
  onSearchInput(e) {
    const kw = e.detail.value || '';
    this.setData({ searchKeyword: kw });
    clearTimeout(this._searchTimer);
    if (!kw.trim()) {
      this.setData({ searchResults: [] });
      return;
    }
    this._searchTimer = setTimeout(() => this._doSearch(kw.trim()), 400);
  },

  onSearchConfirm(e) {
    const kw = e.detail.value?.trim();
    if (kw) this._doSearch(kw);
  },

  async _doSearch(kw) {
    this.setData({ searchLoading: true, searchResults: [] });
    try {
      const res = await wx.cloud.callFunction({
        name: 'searchPlace',
        data: { keyword: kw },
      });
      if (res.result?.success) {
        // 补充 isSaved 标记
        const results = (res.result.data.results || []).map(p => ({
          ...p,
          isSaved: savedPlaces.isSaved(p),
        }));
        this.setData({ searchResults: results });
      } else {
        this.setData({ searchResults: [] });
        wx.showToast({ title: '搜索失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '搜索出错', icon: 'none' });
    } finally {
      this.setData({ searchLoading: false });
    }
  },

  // ── 选择地点（搜索结果 or 收藏）─────────────────────────
  selectPlace(e) {
    const place = e.currentTarget.dataset.place;
    if (!place?.lat || !place?.lon) return;
    this.setData({
      activePlace: place,
      placePanel: false,
      searchResults: [],
      searchKeyword: '',
      city: place.name,
      keyboardHeight: 0,
      panelKeyboardStyle: '',
    });
    // 与出钓指数共享“最近使用地点”，避免天气页选点后指数仍用旧位置
    try {
      wx.setStorageSync('lastGeo', { lat: place.lat, lon: place.lon, ts: Date.now() });
    } catch (err) {}
    // 不清空缓存：目标地点若有未过期缓存直接复用，缺失的模块再请求云端
    this.loadAll();
  },

  // ── 使用当前定位 ─────────────────────────────────────────
  useCurrentLocation() {
    this.setData({
      activePlace: null,
      placePanel: false,
      searchResults: [],
      searchKeyword: '',
      keyboardHeight: 0,
      panelKeyboardStyle: '',
    });
    // 用户主动点“使用当前定位”：重新允许定位尝试
    this._privacyDeclined = false;
    this.loadAll();
  },

  // ── 收藏/取消收藏 ────────────────────────────────────────
  toggleSave(e) {
    const place = e.currentTarget.dataset.place;
    if (!place) return;
    let newList;
    if (savedPlaces.isSaved(place)) {
      const id = savedPlaces.getSavedId(place);
      newList = savedPlaces.remove(id);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      newList = savedPlaces.add(place);
      wx.showToast({ title: '已收藏', icon: 'success' });
    }
    // 更新搜索结果里的 isSaved 状态
    const searchResults = this.data.searchResults.map(p => ({ ...p, isSaved: savedPlaces.isSaved(p) }));
    this.setData({ savedList: newList, searchResults });
  },

  // ── 删除收藏 ─────────────────────────────────────────────
  removeSaved(e) {
    const id = e.currentTarget.dataset.id;
    const newList = savedPlaces.remove(id);
    this.setData({ savedList: newList });
  },

  // ══════════════════════════════════════════════════════════
  // 14天日历
  // ══════════════════════════════════════════════════════════

  // 数据快照时刻的整点（0-23），用于“现在”游标
  _marineHour() {
    const ts = this._times && this._times.marine;
    return new Date(ts || Date.now()).getHours();
  },

  selectDay(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    if (isNaN(idx)) return;
    const { allDays, todayIdx, atmosByDay } = this.data;
    // 记录选中「日期」而非下标：后续任何一次数据重载都按日期恢复选中，避免错位
    this._selectedDate = allDays[idx] ? allDays[idx].date : null;
    this.setData({ selectedDayIdx: idx });
    this._applyDayChart(idx, allDays, idx === todayIdx ? this._marineHour() : -1, atmosByDay);
    // 选中日期超出已加载的验潮站天数时，按需补拉
    this._ensureTideDays(idx);
  },

  toggleWave() {
    this.setData({ waveExpanded: !this.data.waveExpanded });
  },

  // 按需加载：仅当选中日超出已加载的验潮站天数时，才把潮汐从 7 天扩到 10 天
  _ensureTideDays(idx) {
    const { allDays, todayIdx, tideDays } = this.data;
    // tideDays 是「从今天起已覆盖的天数」，idx 是 allDays 绝对下标，必须换算成相对偏移
    const offset = idx - todayIdx;
    if (offset < tideDays) return;
    const date = allDays[idx] ? allDays[idx].date : null;
    if (!date) return;
    // 补拉进行中：只更新“最终要选中的日期”，保证最后一次点击生效
    if (this._tideExtending) { this._pendingSelectDate = date; return; }
    this._tideExtending = true;
    this._pendingSelectDate = date;
    this.refreshMarine(true, 10).then(() => {
      const target = this._pendingSelectDate;
      this._pendingSelectDate = null;
      if (!target) return;
      const { allDays: list, todayIdx: tIdx, atmosByDay: atmos } = this.data;
      const i = list.findIndex(d => d.date === target);
      if (i < 0) return;
      this._selectedDate = target;
      this.setData({ selectedDayIdx: i });
      this._applyDayChart(i, list, i === tIdx ? this._marineHour() : -1, atmos);
    }).finally(() => { this._tideExtending = false; });
  },

  // 计算选中天的折线图 + 极值 + 浪况趋势 + 鱼口评分
  _applyDayChart(idx, allDays, currentHour = -1, atmosByDay = {}) {
    const day = allDays[idx];
    if (!day) return;

    const tideChart = day.tideChart || [];
    const extremes  = day.extremes  || [];
    const hourly    = day.hourly    || [];

    // 折线图
    const { points, segments, axisMin, axisMax, minLevel, maxLevel } = buildChartPoints(tideChart);
    const extremePoints = markExtremePoints(points, extremes);
    // 图例优先展示真实高低潮极值，缺失时回退到曲线最大/最小值
    const highs = extremes.filter(e => e.type === 'high').map(e => e.level).filter(Number.isFinite);
    const lows  = extremes.filter(e => e.type === 'low').map(e => e.level).filter(Number.isFinite);
    const dayHighTide = highs.length ? Math.max(...highs) : maxLevel;
    const dayLowTide  = lows.length  ? Math.min(...lows)  : minLevel;
    const metaStation = !!(this.data.tideMeta && this.data.tideMeta.datum === 'station');
    const dayDatumMixed = metaStation && String(day.tideSource || '').indexOf('qweather') !== 0;
    const dayWave24hPoints = build48hLinePoints(hourly, 'waveHeight');
    const dayCurrentPointX = currentHour >= 0
      ? parseFloat((CHART_X_PAD + (Math.min(currentHour, 23) / 23) * (100 - CHART_X_PAD * 2)).toFixed(1))
      : -1;

    // ── 鱼口评分 ──────────────────────────────────────────
    const atmosHourly = atmosByDay[day.date] || [];
    const { heatmap, bestWindows, dayGrade } = fishScore.calcDayScores(hourly, atmosHourly);

    this.setData({
      selectedDayData:  day,
      dayChartPoints:   points,
      dayChartSegments: segments,
      dayExtremePoints: extremePoints,
      dayHighTide,
      dayLowTide,
      dayDatumMixed,
      dayChartAxisMin:  axisMin,
      dayChartAxisMax:  axisMax,
      dayWave24hPoints,
      dayCurrentPointX,
      // 鱼口
      dayFishHeatmap:  heatmap,
      dayBestWindows:  bestWindows,
      dayGrade,
    });
    this.setData({ probeVisible: false });
    this._chartRect = null;
  },

  // ══════════════════════════════════════════════════════════
  // 探针游标
  // ══════════════════════════════════════════════════════════
  onChartTouchStart(e) { this._chartProbeUpdate(e); },
  onChartTouchMove(e)  { this._chartProbeUpdate(e); },
  onChartTouchEnd() {
    clearTimeout(this._probeHideTimer);
    this._probeHideTimer = setTimeout(() => this.setData({ probeVisible: false }), 1500);
  },

  _chartProbeUpdate(e) {
    const touch = e.touches[0];
    if (!touch) return;
    // 优先使用选中天的数据（日历模式），否则用今日数据
    const { selectedDayData, tideChart24h, dayChartPoints, chartPoints } = this.data;
    const tideChart = selectedDayData?.tideChart?.length ? selectedDayData.tideChart : tideChart24h;
    const cPoints   = dayChartPoints?.length ? dayChartPoints : chartPoints;
    if (!tideChart?.length) return;
    clearTimeout(this._probeHideTimer);

    const doUpdate = (rect) => {
      if (!rect) return;
      const xPct = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      // 与 buildChartPoints 的左右留白保持一致，探针才会落在曲线点上
      const rel = Math.max(0, Math.min(1, (xPct - CHART_X_PAD) / (100 - CHART_X_PAD * 2)));
      const n = tideChart.length - 1;
      const rawIdx = rel * n;
      const i0 = Math.min(Math.floor(rawIdx), n - 1);
      const i1 = i0 + 1;
      const frac = rawIdx - i0;
      const d0 = tideChart[i0], d1 = tideChart[i1];
      const level = d0.level + (d1.level - d0.level) * frac;
      const t0m = parseInt(d0.timeStr.split(':')[0]) * 60 + parseInt(d0.timeStr.split(':')[1]);
      const t1m = parseInt(d1.timeStr.split(':')[0]) * 60 + parseInt(d1.timeStr.split(':')[1]);
      const tMin = t0m + (t1m - t0m) * frac;
      const timeStr = `${String(Math.floor(tMin / 60) % 24).padStart(2,'0')}:${String(Math.round(tMin % 60)).padStart(2,'0')}`;
      const slope = d1.level - d0.level;
      const cp0 = cPoints[i0], cp1 = cPoints[Math.min(i1, cPoints.length - 1)];
      const hs = (this.data.dayFishHeatmap || [])[i0];
      this.setData({
        probeVisible: true,
        probeX: parseFloat((CHART_X_PAD + rel * (100 - CHART_X_PAD * 2)).toFixed(1)),
        probePointY: cp0 && cp1 ? parseFloat((cp0.y + (cp1.y - cp0.y) * frac).toFixed(1)) : 50,
        probeTooltip: {
          timeStr, level: parseFloat(level.toFixed(2)),
          tideState: slope > 0.05 ? '⬆ 涨潮' : slope < -0.05 ? '⬇ 退潮' : '— 平潮',
          hourIdx: i0,
          score: hs ? hs.score : null,
          scoreLabel: hs ? hs.label : '',
          scoreColor: hs ? hs.color : '',
        },
      });
    };

    if (this._chartRect) {
      doUpdate(this._chartRect);
    } else {
      wx.createSelectorQuery()
        .select('.tide-chart-body')
        .boundingClientRect(rect => { this._chartRect = rect; doUpdate(rect); })
        .exec();
    }
  },

  // ══════════════════════════════════════════════════════════
  // 跳转
  // ══════════════════════════════════════════════════════════
  // 顶部右上角「详情」：进入天气详情页，复用当前坐标
  openWeatherDetail() {
    const { lat, lon } = this._coords || {};
    if (lat == null || lon == null) {
      wx.showToast({ title: '位置尚未就绪', icon: 'none' });
      return;
    }
    const city = encodeURIComponent(this.data.city || '');
    wx.navigateTo({
      url: `/pages/weather-detail/weather-detail?lat=${lat}&lon=${lon}&city=${city}`,
    });
  },
});
