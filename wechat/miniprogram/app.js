// app.js — GoCasting 小程序入口
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      // 填入你的云开发环境 ID（在微信开发者工具 → 云开发控制台获取）
      env: 'gocasting-prod',
      traceUser: true,
    });

    this.globalData.db = wx.cloud.database();
  },

  globalData: {
    db: null,           // 云数据库引用
    userInfo: null,     // 微信用户信息（昵称/头像）
    openid: null,       // 用户 openid（由云函数获取）
  },
});
