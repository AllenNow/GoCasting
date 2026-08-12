// pages/weather/weather.js — 天气+潮汐仪表板
const app = getApp();
const { predictTide, getTideState, getTideDisplay, buildTideChart } = require('../../utils/tide');

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
    const tideChart   = buildTideChart(12);
    const tideState   = getTideDisplay(getTideState(0));
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
