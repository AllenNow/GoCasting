// pages/admin/gear-edit.js — 装备系列在线编辑
const app = getApp();

Page({
  data: {
    seriesId: '',
    saving: false,
    form: {
      series_name: '',
      brand: '',
      description: '',
      price_min: '',
      price_max: '',
      price_tier: 1,
      year: '',
      banner_image: '',   // 宽幅 banner cloud://
      images: [],         // 商品轮播图 cloud://[]
    },
    // 预览 URL（cloud:// 转换后）
    bannerPreview: '',
    bannerTempPath: '',
  },

  onLoad(options) {
    if (!app.globalData.isAdmin) { wx.navigateBack(); return; }
    if (options.id) {
      this.setData({ seriesId: options.id });
      this.loadSeries(options.id);
    }
  },

  async loadSeries(id) {
    wx.showLoading({ title: '加载中…' });
    try {
      const db = app.globalData.db;
      const res = await db.collection('gear_series').doc(id).get();
      const s = res.data;

      // banner_image 转临时 URL
      let bannerPreview = s.banner_image || '';
      if (bannerPreview && bannerPreview.startsWith('cloud://')) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [bannerPreview] });
          bannerPreview = urlRes.fileList[0]?.tempFileURL || bannerPreview;
        } catch (e) { /* 忽略 */ }
      }

      this.setData({
        bannerPreview,
        'form.series_name': s.series_name || '',
        'form.brand':       s.brand       || '',
        'form.description': s.description || '',
        'form.price_min':   s.price_min   != null ? String(s.price_min) : '',
        'form.price_max':   s.price_max   != null ? String(s.price_max) : '',
        'form.price_tier':  s.price_tier  || 1,
        'form.year':        s.year        != null ? String(s.year) : '',
        'form.banner_image': s.banner_image || '',
        'form.images':       s.images || [],
      });
      wx.setNavigationBarTitle({ title: '编辑：' + s.series_name });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  selectTier(e) {
    this.setData({ 'form.price_tier': Number(e.currentTarget.dataset.val) });
  },

  // 上传 banner 图
  chooseBanner() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        this.setData({ bannerPreview: path, bannerTempPath: path });
      },
    });
  },

  async _uploadBanner() {
    if (!this.data.bannerTempPath) return this.data.form.banner_image;
    const ext = this.data.bannerTempPath.split('.').pop() || 'jpg';
    const cloudPath = `gear_banners/${this.data.seriesId}_${Date.now()}.${ext}`;
    const res = await wx.cloud.uploadFile({ cloudPath, filePath: this.data.bannerTempPath });
    return res.fileID;
  },

  async submit() {
    if (this.data.saving) return;
    const { form } = this.data;
    if (!form.series_name.trim()) {
      wx.showToast({ title: '系列名不能为空', icon: 'none' }); return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…', mask: true });
    try {
      const bannerUrl = await this._uploadBanner();
      const updateData = {
        series_name: form.series_name.trim(),
        brand: form.brand.trim(),
        description: form.description,
        price_min: form.price_min ? Number(form.price_min) : null,
        price_max: form.price_max ? Number(form.price_max) : null,
        price_tier: form.price_tier,
        year: form.year ? Number(form.year) : null,
        banner_image: bannerUrl,
        updated_at: app.globalData.db.serverDate(),
      };

      await app.globalData.db.collection('gear_series').doc(this.data.seriesId).update({
        data: updateData,
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (e) {
      console.error('保存失败', e);
      wx.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },
});
