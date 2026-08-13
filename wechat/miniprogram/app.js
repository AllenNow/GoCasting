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

        // 检查用户是否被封禁
        if (res.result.openid) {
          this.globalData.db.collection('users').limit(1).get()
            .then(r => {
              if (r.data.length > 0 && r.data[0].banned) {
                wx.showModal({
                  title: '账号已被封禁',
                  content: '您的账号因违规已被封禁，如有疑问请联系管理员。',
                  showCancel: false,
                  confirmText: '知道了',
                });
              }
            })
            .catch(() => {});
        }
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
