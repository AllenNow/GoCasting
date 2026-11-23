// pages/go-score/go-score.js — 出钓指数详情（统一数据服务）
const service = require('../../utils/goScoreService');

const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

function fmtTime(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

Page({
  data: {
    loading: true,
    today: '',
    currentScore: 0,
    scoreLevel: '',
    scoreColor: '',
    factors: [],
    hourlyScores: [],
    bestSlots: [],
    weather: null,
    errorMsg: '',
    updatedAtText: '',
    sourceText: '',
    history: [],
  },

  onLoad() {
    const now = new Date();
    this.setData({
      today: `${now.getMonth() + 1}月${now.getDate()}日 周${WEEKDAY[now.getDay()]}`,
    });
    this.loadScore();
  },

  // P0：每次回到页面都校验，跨小时/超时自动重取（命中 30 分钟缓存时无网络请求）
  onShow() {
    if (!this.data.today) return;
    const now = new Date();
    this.setData({ today: `${now.getMonth() + 1}月${now.getDate()}日 周${WEEKDAY[now.getDay()]}` });
    this.loadScore();
  },

  onPullDownRefresh() {
    this.loadScore(true).finally(() => wx.stopPullDownRefresh());
  },

  async loadScore(force) {
    const firstLoad = this.data.loading;
    if (firstLoad) this.setData({ loading: true, errorMsg: '' });

    try {
      const r = await service.getTodayScore({ force: !!force });
      const isStation = r.source && String(r.source.tide).indexOf('qweather') === 0;
      const srcTide = isStation ? '验潮站' : '模型推算';
      const srcLoc = r.source && r.source.location === 'default' ? '默认地点' : '当前定位';
      this.setData({
        loading: false,
        currentScore: r.score,
        scoreLevel: r.level.label,
        scoreColor: r.level.color,
        factors: r.factors,
        hourlyScores: r.hourlyScores,
        bestSlots: r.bestSlots,
        weather: r.weather,
        updatedAtText: fmtTime(r.updatedAt || Date.now()),
        sourceText: `${srcTide} · ${srcLoc}`,
        errorMsg: r.errorMsg || (isStation ? '' : '当前为模型推算潮汐，仅供参考'),
        history: service.getHistory().slice(-7).map(h => ({
          date: h.date,
          score: h.score,
          label: String(h.date || '').slice(5),
        })),
      });
    } catch (e) {
      this.setData({
        loading: false,
        errorMsg: '评分计算失败，请下拉刷新重试',
      });
    }
  },

  onShareAppMessage() {
    const { currentScore, scoreLevel, today } = this.data;
    return {
      title: `今天出钓指数 ${currentScore} 分 — ${scoreLevel}！${today}`,
      path: '/pages/go-score/go-score',
    };
  },
});
