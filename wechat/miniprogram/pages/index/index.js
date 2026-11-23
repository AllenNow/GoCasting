// pages/index/index.js — 工具首页
const goScoreService = require('../../utils/goScoreService');

Page({
  data: {
    todayScore: '--',
    scoreColor: '#1a7f5a',
    scoreReady: false,
  },

  onLoad() {
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShow() {
    this.loadTodayScore();
  },

  loadTodayScore() {
    goScoreService.getTodayScore().then(r => {
      if (!r) return;
      this.setData({
        todayScore: r.score,
        scoreColor: r.level.color,
        scoreReady: true,
      });
    }).catch(() => {});
  },

  goWeather() {
    wx.switchTab({ url: '/pages/weather/weather' });
  },

  goGoScore() {
    wx.navigateTo({ url: '/pages/go-score/go-score' });
  },

  goSpecies() {
    wx.navigateTo({ url: '/pages/species/species' });
  },

  goMap() {
    wx.switchTab({ url: '/pages/spot-map/spot-map' });
  },

  goCompetition() {
    wx.switchTab({ url: '/pages/competition/competition' });
  },

  onPullDownRefresh() {
    goScoreService.getTodayScore({ force: true })
      .then(() => this.loadTodayScore())
      .finally(() => wx.stopPullDownRefresh());
  },
});
