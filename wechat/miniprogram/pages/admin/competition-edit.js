// pages/admin/competition-edit.js — 管理员：新建 / 编辑比赛基本信息
const app = getApp();

Page({
  data: {
    isEdit: false,
    editId: null,
    saving: false,

    form: {
      name: '',
      date: '',
      location: '',
      description: '',
      status: 'upcoming',
    },

    statusOptions: ['即将开始', '进行中', '已结束'],
    statusValues:  ['upcoming', 'ongoing', 'finished'],
    statusIndex: 0,
  },

  onLoad(options) {
    // 默认日期为今天
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({ 'form.date': today });

    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      wx.setNavigationBarTitle({ title: '编辑比赛' });
      this.loadCompetition(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新建比赛' });
    }
  },

  async loadCompetition(id) {
    wx.showLoading({ title: '加载中…' });
    try {
      const res = await app.globalData.db.collection('competitions').doc(id).get();
      const data = res.data;
      const statusValues = ['upcoming', 'ongoing', 'finished'];
      const statusIndex = Math.max(statusValues.indexOf(data.status), 0);
      this.setData({
        statusIndex,
        form: {
          name: data.name || '',
          date: data.date || '',
          location: data.location || '',
          description: data.description || '',
          status: data.status || 'upcoming',
        },
      });
    } catch (err) {
      console.error('加载比赛信息失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value });
  },

  onStatusChange(e) {
    const idx = Number(e.detail.value);
    const statusValues = ['upcoming', 'ongoing', 'finished'];
    this.setData({
      statusIndex: idx,
      'form.status': statusValues[idx],
    });
  },

  async save() {
    if (this.data.saving) return;

    const { form } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入比赛名称', icon: 'none' }); return;
    }
    if (!form.date) {
      wx.showToast({ title: '请选择比赛日期', icon: 'none' }); return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…' });

    try {
      const db = app.globalData.db;
      const record = {
        name: form.name.trim(),
        date: form.date,
        location: form.location.trim(),
        description: form.description.trim(),
        status: form.status,
        updated_at: db.serverDate(),
      };

      if (this.data.isEdit) {
        await db.collection('competitions').doc(this.data.editId).update({ data: record });
        wx.showToast({ title: '已更新', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      } else {
        // 新建时带空 entries 数组
        record.entries = [];
        record.created_at = db.serverDate();
        const res = await db.collection('competitions').add({ data: record });
        wx.showToast({ title: '已创建', icon: 'success' });
        // 创建后跳转到详情页，让管理员直接录入选手成绩
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/competition/competition-detail?id=${res._id}` });
        }, 800);
      }
    } catch (err) {
      console.error('保存比赛失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },
});
