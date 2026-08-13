// pages/admin/spot-review.js — 用户钓点审核
const app = getApp();

Page({
  data: {
    spots: [],
    loading: true,
    tab: 'pending',   // pending | passed | rejected
    counts: { pending: 0, passed: 0, rejected: 0 },
  },

  onLoad() {
    if (!app.globalData.isAdmin) {
      wx.navigateBack(); return;
    }
    this.loadSpots();
  },

  onShow() {
    this.loadSpots();
  },

  onPullDownRefresh() {
    this.loadSpots().finally(() => wx.stopPullDownRefresh());
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.tab) return;
    this.setData({ tab });
    this.loadSpots();
  },

  async loadSpots() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const { tab } = this.data;

      // 按审核状态查询（reviewed 字段：undefined/false=待审, true=已通过, 'rejected'=已拒绝）
      let whereCondition;
      if (tab === 'pending') {
        whereCondition = { is_public: true, reviewed: db.command.or([
          db.command.exists(false),
          db.command.eq(false),
        ]) };
      } else if (tab === 'passed') {
        whereCondition = { reviewed: true };
      } else {
        whereCondition = { reviewed: 'rejected' };
      }

      const res = await db.collection('fishing_spots')
        .where(whereCondition)
        .orderBy('created_at', 'desc')
        .limit(50)
        .get();

      // 统计各状态数量
      const [pendingRes, passedRes, rejectedRes] = await Promise.all([
        db.collection('fishing_spots').where({ is_public: true, reviewed: db.command.or([db.command.exists(false), db.command.eq(false)]) }).count(),
        db.collection('fishing_spots').where({ reviewed: true }).count(),
        db.collection('fishing_spots').where({ reviewed: 'rejected' }).count(),
      ]);

      this.setData({
        spots: res.data.map(s => ({
          ...s,
          coordsStr: s.lat ? `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}` : '',
          // 待审核地图预览 marker
          previewMarker: s.lat ? [{
            id: 0,
            latitude: s.lat,
            longitude: s.lon,
            iconPath: '/images/marker-public.png',
            width: 36,
            height: 42,
          }] : [],
        })),
        loading: false,
        counts: {
          pending: pendingRes.total,
          passed: passedRes.total,
          rejected: rejectedRes.total,
        },
      });
    } catch (e) {
      console.error('加载审核列表失败', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  // 通过审核
  async approve(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认通过',
      content: '通过审核后该钓点将对所有用户可见',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '操作中…' });
        try {
          await app.globalData.db.collection('fishing_spots').doc(id).update({
            data: { reviewed: true, review_at: app.globalData.db.serverDate() },
          });
          wx.showToast({ title: '已通过', icon: 'success' });
          this.loadSpots();
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  // 拒绝/下架
  async reject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认拒绝',
      content: '将隐藏该钓点并标记为不通过',
      confirmColor: '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '操作中…' });
        try {
          await app.globalData.db.collection('fishing_spots').doc(id).update({
            data: { reviewed: 'rejected', is_public: false, review_at: app.globalData.db.serverDate() },
          });
          wx.showToast({ title: '已拒绝', icon: 'success' });
          this.loadSpots();
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },
});
