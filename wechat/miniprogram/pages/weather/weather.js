// pages/weather/weather.js — 天气+潮汐仪表板
const app = getApp();

// 简化谐波潮汐预测（M2+S2+K1+O1，厦门默认参数）
const DEFAULT_TIDE_PARAMS = {
  M2:  { amp: 2.15, phase: 215.0, speed: 28.9841042 },
  S2:  { amp: 0.78, phase: 248.0, speed: 30.0 },
  K1:  { amp: 0.62, phase: 185.0, speed: 15.0410686 },
  O1:  { amp: 0.45, phase: 168.0, speed: 13.9430356 },
};

function predictTide(hourOffset = 0, params = DEFAULT_TIDE_PARAMS) {
  const now = new Date();
  const t = (now.getTime() / 3600000) + hourOffset;  // 小时
  let h = 0;
  Object.values(params).forEach(c => {
    h += c.amp * Math.cos((c.speed * t - c.phase) * Math.PI / 180);
  });
  return h;
}

// 生成未来 12 小时潮高数据
function buildTideChart() {
  const points = [];
  for (let i = 0; i <= 12; i++) {
    points.push({ hour: i, height: parseFloat(predictTide(i).toFixed(2)) });
  }
  return points;
}

// 计算当前潮汐状态
function getTideState() {
  const h0 = predictTide(0);
  const h1 = predictTide(0.5);
  if (h1 > h0 + 0.05) return { label: '涨潮', icon: '🌊', value: 'rising' };
  if (h1 < h0 - 0.05) return { label: '退潮', icon: '↘️', value: 'falling' };
  if (h0 > 1.5)       return { label: '高潮', icon: '⬆️', value: 'high' };
  return               { label: '低潮', icon: '⬇️', value: 'low' };
}

// 钓鱼适宜指数（0-10）
function calcFishScore(weather, tideState) {
  let score = 5;
  if (tideState === 'rising' || tideState === 'falling') score += 2;
  if (weather) {
    const desc = weather.weather?.[0]?.description || '';
    if (desc.includes('晴') || desc.includes('多云')) score += 1;
    if (desc.includes('雨') || desc.includes('雷')) score -= 2;
    const wind = Number(weather.wind_speed) || 0;
    if (wind < 5) score += 1;
    if (wind > 10) score -= 2;
  }
  return Math.max(0, Math.min(10, score));
}

Page({
  data: {
    loading: true,
    city: '定位中…',
    weather: null,       // 高德天气数据
    forecast: [],        // 3天预报
    tideState: null,
    tideChart: [],
    currentTideHeight: 0,
    fishScore: 5,
    errorMsg: '',
  },

  onLoad() {
    this.loadAll();
  },

  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },

  async loadAll() {
    this.setData({ loading: true, errorMsg: '' });
    // 并行：获取位置 + 计算潮汐
    const tideChart   = buildTideChart();
    const tideState   = getTideState();
    const currentH    = parseFloat(predictTide(0).toFixed(2));
    this.setData({ tideChart, tideState, currentTideHeight: currentH });

    try {
      // 先获取位置
      const pos = await new Promise((resolve, reject) => {
        wx.getLocation({ type: 'gcj02', success: resolve, fail: reject });
      });

      // 调云函数获取天气
      const res = await wx.cloud.callFunction({
        name: 'getWeather',
        data: { lat: pos.latitude, lon: pos.longitude },
      });

      if (res.result && res.result.success) {
        const { city, current, forecast } = res.result.data;
        const score = calcFishScore(current, tideState.value);
        this.setData({
          city, weather: current, forecast,
          fishScore: score, loading: false,
        });
      } else {
        this.setData({
          loading: false,
          errorMsg: '天气数据获取失败，仅显示潮汐预测',
        });
      }
    } catch (err) {
      // 位置获取失败或云函数失败 → 仅展示潮汐
      console.error('天气加载失败', err);
      this.setData({
        loading: false,
        city: '未知位置',
        errorMsg: '无法获取位置，请授权定位后重试',
      });
    }
  },

  // 前往钓点地图
  goMap() {
    wx.switchTab({ url: '/pages/spot-map/spot-map' });
  },

  // 记录渔获
  goRecord() {
    wx.navigateTo({ url: '/pages/catch-log/catch-log' });
  },
});
