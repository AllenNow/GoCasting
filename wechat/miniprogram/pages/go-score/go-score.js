// pages/go-score/go-score.js — Go-Score 钓鱼出行综合评分
const app = getApp();
const { predictTide, getTideState, getTideDisplay } = require('../../utils/tide');

// ─── 月相计算 ────────────────────────────────────────
function moonPhase(dateOffset = 0) {
  const now = new Date(Date.now() + dateOffset * 86400000);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  // 简化算法：基于朔望周期 29.53 天
  const jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) +
    Math.floor(275 * month / 9) + day + 1721013.5;
  const cycle = (jd - 2451549.5) / 29.53058867;
  return ((cycle - Math.floor(cycle)) * 100) | 0; // 0-100 满月度
}

function moonLabel(phase) {
  if (phase <= 5 || phase >= 95) return { label: '新月', icon: '🌑', score: 3 };
  if (phase <= 20) return { label: '峨眉月', icon: '🌒', score: 1 };
  if (phase <= 35) return { label: '上弦月', icon: '🌓', score: 1 };
  if (phase <= 45) return { label: '渐盈凸月', icon: '🌔', score: 2 };
  if (phase <= 55) return { label: '满月', icon: '🌕', score: 3 };
  if (phase <= 65) return { label: '渐亏凸月', icon: '🌖', score: 2 };
  if (phase <= 80) return { label: '下弦月', icon: '🌗', score: 1 };
  return { label: '残月', icon: '🌘', score: 1 };
}

// ─── 时段评分 ────────────────────────────────────────
function timeScore(hour) {
  if (hour >= 5 && hour <= 7)   return 3;  // 黎明
  if (hour >= 17 && hour <= 20) return 3;  // 黄昏
  if (hour >= 8  && hour <= 10) return 2;
  if (hour >= 15 && hour <= 16) return 2;
  return 1;
}

// ─── 综合 Go-Score ────────────────────────────────────
// 满分 10 分，由4个因子加权
function calcGoScore(tSt, weather, moonPhaseVal, hour) {
  const tideW = tSt === 'rising' || tSt === 'falling' ? 3 : tSt === 'high' ? 2 : 1;
  const weatherW = weather ? calcWeatherScore(weather) : 2;
  const moonW  = moonLabel(moonPhaseVal).score;
  const timeW  = timeScore(hour);
  // 权重：潮汐35% + 天气30% + 月相20% + 时段15%
  const raw = tideW * 3.5 + weatherW * 3 + moonW * 2 + timeW * 1.5;
  const max = 3 * 3.5 + 3 * 3 + 3 * 2 + 3 * 1.5; // = 10.5 + 9 + 6 + 4.5 = 30
  return Math.min(10, Math.round((raw / max) * 10 * 10) / 10);
}

function calcWeatherScore(weather) {
  const desc = weather.desc || '';
  const wind = Number(weather.wind_speed) || 0;
  if (desc.includes('雷') || desc.includes('暴雨')) return 0;
  if (desc.includes('大雨')) return 1;
  if (desc.includes('小雨') || desc.includes('阵雨')) return 2;
  if (wind > 12) return 1;
  if (desc.includes('晴') || desc.includes('多云')) return 3;
  return 2;
}

// ─── 生成未来24小时评分列表 ──────────────────────────
function buildHourlyScores(weather) {
  const scores = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const hour = (now.getHours() + i) % 24;
    const ts = getTideState(i);
    const mp = moonPhase(i / 24);
    const s  = calcGoScore(ts, weather, mp, hour);
    scores.push({
      hour: `${String(hour).padStart(2, '0')}:00`,
      hourLabel: String(hour).padStart(2, '0'),
      score: s,
      tideIcon: ts === 'rising' ? '🌊' : ts === 'falling' ? '↘️' : ts === 'high' ? '⬆️' : '⬇️',
      offset: i,
    });
  }
  return scores;
}

// ─── 找最佳时段（未来24小时中评分最高的3个）───────────
function findBestSlots(scores) {
  return [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.offset - b.offset);
}

// ─── Page ─────────────────────────────────────────────
Page({
  data: {
    loading: true,
    today: '',
    currentScore: 0,
    scoreLevel: '',       // '绝佳' / '适合' / '一般' / '不宜'
    scoreColor: '',
    factors: [],          // 4个因子详情
    hourlyScores: [],     // 24小时评分
    bestSlots: [],        // 最佳3个时段
    weather: null,
    errorMsg: '',
  },

  onLoad() {
    const now = new Date();
    const weekday = ['日','一','二','三','四','五','六'];
    this.setData({
      today: `${now.getMonth() + 1}月${now.getDate()}日 周${weekday[now.getDay()]}`,
    });
    this.calcScore();
  },

  onPullDownRefresh() {
    this.calcScore().finally(() => wx.stopPullDownRefresh());
  },

  // ─── 核心：计算当前评分 ───────────────────────────
  async calcScore() {
    this.setData({ loading: true, errorMsg: '' });

    const now    = new Date();
    const hour   = now.getHours();
    const ts     = getTideState(0);
    const mp     = moonPhase(0);
    const moon   = moonLabel(mp);
    const tideDisp = getTideDisplay(ts);
    const tideIcon = tideDisp.icon;
    const tideLabel = tideDisp.label;

    let weather = null;

    // 尝试获取天气（使用缓存，5分钟内不重复请求）
    const cached = app.globalData.weatherCache;
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
      weather = cached.data;
    } else {
      try {
        const pos = await new Promise((res, rej) =>
          wx.getLocation({ type: 'gcj02', success: res, fail: rej })
        );
        const res = await wx.cloud.callFunction({
          name: 'getWeather',
          data: { lat: pos.latitude, lon: pos.longitude },
        });
        if (res.result?.success) {
          weather = res.result.data.current;
          app.globalData.weatherCache = { ts: Date.now(), data: weather };
        }
      } catch (e) {
        this.setData({ errorMsg: '天气获取失败，仅使用潮汐+月相评分' });
      }
    }

    const score = calcGoScore(ts, weather, mp, hour);
    const hourlyScores = buildHourlyScores(weather);
    const bestSlots    = findBestSlots(hourlyScores);

    // 评分等级
    const levelMap = score >= 8 ? { label: '绝佳出钓！', color: '#1a7f5a' }
      : score >= 6 ? { label: '适合出钓', color: '#52a875' }
      : score >= 4 ? { label: '一般，可尝试', color: '#f0a500' }
      : { label: '不建议出钓', color: '#e85555' };

    // 4个因子卡片
    const tideScoreVal = ts === 'rising' || ts === 'falling' ? 3 : ts === 'high' ? 2 : 1;
    const factors = [
      {
        icon: tideIcon,
        label: '潮汐',
        desc: tideLabel,
        stars: tideScoreVal,
        weight: '35%',
      },
      {
        icon: weather ? (weather.desc?.includes('晴') ? '☀️' : weather.desc?.includes('雨') ? '🌧️' : '⛅') : '—',
        label: '天气',
        desc: weather ? `${weather.desc} ${weather.temp}°C 风${weather.wind_speed}m/s` : '未获取',
        stars: weather ? calcWeatherScore(weather) : 2,
        weight: '30%',
      },
      {
        icon: moon.icon,
        label: '月相',
        desc: moon.label,
        stars: moon.score,
        weight: '20%',
      },
      {
        icon: hour >= 5 && hour <= 7 ? '🌅' : hour >= 17 && hour <= 20 ? '🌇' : '🕒',
        label: '时段',
        desc: `${String(hour).padStart(2, '0')}:00`,
        stars: timeScore(hour),
        weight: '15%',
      },
    ];

    this.setData({
      loading: false,
      currentScore: score,
      scoreLevel: levelMap.label,
      scoreColor: levelMap.color,
      factors,
      hourlyScores,
      bestSlots,
      weather,
    });
  },

  // ─── 分享 ─────────────────────────────────────────
  onShareAppMessage() {
    const { currentScore, scoreLevel, today } = this.data;
    return {
      title: `今天Go-Score ${currentScore}分 — ${scoreLevel}！${today}`,
      path: '/pages/go-score/go-score',
    };
  },

  goRecord() {
    wx.navigateTo({ url: '/pages/catch-log/catch-log' });
  },
});
