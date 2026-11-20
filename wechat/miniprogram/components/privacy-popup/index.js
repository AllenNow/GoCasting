// components/privacy-popup/index.js — 首次使用隐私提示
const app = getApp();

// 用户主动拒绝后，24 小时内不再自动弹出，避免反复打扰
const DECLINE_COOLDOWN = 24 * 60 * 60 * 1000;

Component({
  data: {
    show: false,
    contractName: '',
  },

  lifetimes: {
    attached() {
      if (!wx.getPrivacySetting) return;       // 低版本基础库不拦截隐私接口
      if (app.globalData.privacyPrompted) return;
      app.globalData.privacyPrompted = true;

      // 同一启动周期内只由一个页面负责提示
      const declinedAt = wx.getStorageSync('privacy_declined_at') || 0;
      if (declinedAt && Date.now() - declinedAt < DECLINE_COOLDOWN) return;

      const agreedAt = wx.getStorageSync('privacy_agreed_at') || 0;

      wx.getPrivacySetting({
        success: (res) => {
          // 平台侧待授权，或本机从未同意过，都展示首次使用提示
          if (res.needAuthorization || !agreedAt) {
            this.setData({
              show: true,
              contractName: res.privacyContractName || '',
            });
          }
        },
        fail: () => {
          if (!agreedAt) this.setData({ show: true });
        },
      });
    },
  },

  methods: {
    // 用户点击“同意并继续”（open-type=agreePrivacyAuthorization 已同步给微信）
    handleAgree() {
      if (this._agreed) return;   // bindtap 与 bindagreeprivacyauthorization 可能同时触发
      this._agreed = true;
      try {
        wx.setStorageSync('privacy_agreed_at', Date.now());
        wx.removeStorageSync('privacy_declined_at');
      } catch (e) {}
      app.globalData.privacyAgreed = true;
      this.setData({ show: false });
      this.triggerEvent('agree');
    },

    handleDecline() {
      try {
        wx.setStorageSync('privacy_declined_at', Date.now());
      } catch (e) {}
      this.setData({ show: false });
      this.triggerEvent('decline');
      wx.showToast({
        title: '可先浏览，使用定位或照片时会再次提示',
        icon: 'none',
        duration: 2500,
      });
    },

    openLocalPolicy() {
      wx.navigateTo({ url: '/pages/privacy/privacy' });
    },

    openOfficialPolicy() {
      if (wx.openPrivacyContract) {
        wx.openPrivacyContract({
          fail: () => this.openLocalPolicy(),
        });
      } else {
        this.openLocalPolicy();
      }
    },

    noop() {},
  },
});
