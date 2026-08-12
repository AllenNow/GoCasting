// app.js — GoCasting 小程序入口
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d4gkci99i21e9bfe9',
      traceUser: true,
    });

    this.globalData.db = wx.cloud.database();

    // 从本地缓存恢复用户信息（免去每次重新授权）
    const cached = wx.getStorageSync('userInfo');
    if (cached) this.globalData.userInfo = cached;

    // 通过 checkAdmin 云函数获取 openid + 管理员身份
    // openid 不再出现在前端源码中，由服务端返回
    wx.cloud.callFunction({ name: 'checkAdmin' })
      .then(res => {
        this.globalData.openid  = res.result.openid;
        this.globalData.isAdmin = res.result.isAdmin === true;
      })
      .catch(err => { console.warn('checkAdmin 失败', err); });
  },

  globalData: {
    db: null,
    userInfo: null,
    openid: null,
    isAdmin: false,
    weatherCache: null,
    catchesNeedRefresh: false,
  },
});
