// pages/admin/spot-add.js — 官方钓点录入/编辑
const app = getApp();

const TERRAIN_OPTIONS = ['防波堤', '沙滩', '矶岩', '近岸礁', '码头', '河口', '湖库'];
const METHOD_OPTIONS  = ['远投', '矶钓', '路亚', '夜钓', '筏钓', '船钓', '浮钓'];
const SPECIES_OPTIONS = [
  '多鳞鱚（沙尖）', '少鳞鱚（银沙尖）',
  '白姑鱼', '皮氏叫姑鱼', '黄姑鱼', '棘头梅童鱼',
  '黑棘鲷（黑鲷）', '黄鳍鲷', '平鲷',
  '鲻鱼', '鮻（梭鱼）',
  '短棘鲾', '项斑项鲾',
  '侧带海猪鱼', '云斑海猪鱼',
  '花身鯻', '多齿蛇鲻（狗母鱼）', '牙鲆（比目鱼）',
  '四指马鲅（午鱼）', '蓝圆鲹（巴浪鱼）',
];
const DIFFICULTY_OPTIONS = [
  { label: '新手友好', value: 'easy' },
  { label: '中级', value: 'medium' },
  { label: '专业', value: 'hard' },
];

Page({
  data: {
    isEdit: false,
    editId: null,
    saving: false,

    // 选项列表
    terrainOptions: TERRAIN_OPTIONS,
    methodOptions:  METHOD_OPTIONS,
    speciesOptions: SPECIES_OPTIONS,
    difficultyOptions: DIFFICULTY_OPTIONS,

    // 封面预览
    coverPreview: '',
    coverTempPath: '',   // 待上传本地路径

    // 多图
    imagePreviews: [],        // 本地或云端预览 URL 数组
    imageTempPaths: [],       // 待上传的本地路径（与 imagePreviews 一一对应，云端URL对应空字符串）
    imageCloudUrls: [],       // 已上传云端 URL（与 imagePreviews 对应）

    // 地图 marker
    mapMarkers: [],

    // 表单
    form: {
      name: '',
      terrain: '',
      lat: null,
      lon: null,
      description: '',
      methods: [],
      species: [],
      difficulty: '',
      parking: '',
      cautions: '',
      cover_image: '',   // 最终 cloud:// 路径
    },
  },

  onLoad(options) {
    if (!app.globalData.isAdmin) {
      wx.navigateBack(); return;
    }
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id });
      wx.setNavigationBarTitle({ title: '编辑钓点' });
      this.loadSpot(options.id);
    } else {
      wx.setNavigationBarTitle({ title: '新增钓点' });
    }
  },

  // 加载已有钓点数据（编辑模式）—— 用 getOne 单条查询
  async loadSpot(id) {
    wx.showLoading({ title: '加载中…' });
    try {
      const res = await wx.cloud.callFunction({
        name: 'addOfficialSpot',
        data: { action: 'getOne', spotId: id },
      });
      if (!res.result.success) {
        wx.showToast({ title: '钓点不存在', icon: 'error' }); return;
      }
      const spot = res.result.data;

      // 封面图需要转换 cloud:// 为临时 URL
      let coverPreview = spot.cover_image || '';
      if (coverPreview && coverPreview.startsWith('cloud://')) {
        try {
          const urlRes = await wx.cloud.getTempFileURL({ fileList: [coverPreview] });
          coverPreview = urlRes.fileList[0]?.tempFileURL || coverPreview;
        } catch (e) { /* 转换失败保持原值 */ }
      }

      this.setData({
        coverPreview,
        'form.name':        spot.name        || '',
        'form.terrain':     spot.terrain     || '',
        'form.lat':         spot.lat,
        'form.lon':         spot.lon,
        'form.coordsStr':   spot.lat ? `${spot.lat.toFixed(5)}, ${spot.lon.toFixed(5)}` : '',
        'form.description': spot.description || '',
        'form.methods':     spot.methods     || [],
        'form.species':     spot.species     || [],
        'form.difficulty':  spot.difficulty  || '',
        'form.parking':     spot.parking     || '',
        'form.cautions':    spot.cautions    || '',
        'form.cover_image': spot.cover_image || '',
      });

      // 加载多图预览（images[] 字段）
      const images = spot.images || [];
      if (images.length > 0) {
        const cloudImgs = images.filter(u => u && u.startsWith('cloud://'));
        let urlMap = {};
        if (cloudImgs.length > 0) {
          try {
            const r = await wx.cloud.getTempFileURL({ fileList: cloudImgs });
            (r.fileList || []).forEach(i => { if (i.tempFileURL) urlMap[i.fileID] = i.tempFileURL; });
          } catch (e) { /* ignore */ }
        }
        const previews = images.map(u => urlMap[u] || u);
        this.setData({
          imagePreviews:  previews,
          imageTempPaths: images.map(() => ''),   // 已是云端，无需重新上传
          imageCloudUrls: [...images],
        });
      }
      if (spot.lat) this._updateMapMarker(spot.lat, spot.lon);
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // ──────────────────────────────────────────
  // 封面图
  // ──────────────────────────────────────────
  chooseCover() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        this.setData({ coverPreview: path, coverTempPath: path });
      },
    });
  },

  async _uploadCover() {
    if (!this.data.coverTempPath) return this.data.form.cover_image;
    const ext = this.data.coverTempPath.split('.').pop() || 'jpg';
    const cloudPath = `official_spots/cover_${Date.now()}.${ext}`;
    const res = await wx.cloud.uploadFile({ cloudPath, filePath: this.data.coverTempPath });
    return res.fileID;
  },

  // ──────────────────────────────────────────
  // 多图管理
  // ──────────────────────────────────────────
  addImages() {
    const remain = 9 - this.data.imagePreviews.length;
    if (remain <= 0) return;
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPaths   = res.tempFiles.map(f => f.tempFilePath);
        const previews   = [...this.data.imagePreviews,  ...newPaths];
        const tempPaths  = [...this.data.imageTempPaths, ...newPaths];
        const cloudUrls  = [...this.data.imageCloudUrls, ...newPaths.map(() => '')];
        this.setData({ imagePreviews: previews, imageTempPaths: tempPaths, imageCloudUrls: cloudUrls });
      },
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const previews  = [...this.data.imagePreviews];
    const tempPaths = [...this.data.imageTempPaths];
    const cloudUrls = [...this.data.imageCloudUrls];
    previews.splice(idx, 1);
    tempPaths.splice(idx, 1);
    cloudUrls.splice(idx, 1);
    this.setData({ imagePreviews: previews, imageTempPaths: tempPaths, imageCloudUrls: cloudUrls });
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.index;
    wx.previewImage({ current: this.data.imagePreviews[idx], urls: this.data.imagePreviews });
  },

  // 批量上传多图，返回最终 cloud:// URL 数组
  async _uploadImages() {
    const { imageTempPaths, imageCloudUrls } = this.data;
    const result = [...imageCloudUrls];
    for (let i = 0; i < imageTempPaths.length; i++) {
      if (imageTempPaths[i]) {  // 有本地路径需要上传
        const ext = imageTempPaths[i].split('.').pop() || 'jpg';
        const cloudPath = `official_spots/img_${Date.now()}_${i}.${ext}`;
        try {
          const r = await wx.cloud.uploadFile({ cloudPath, filePath: imageTempPaths[i] });
          result[i] = r.fileID;
        } catch (e) {
          console.error(`上传第${i+1}张图片失败`, e);
        }
      }
    }
    return result.filter(Boolean);
  },

  // ──────────────────────────────────────────
  // 坐标选择（wx.chooseLocation）
  // ──────────────────────────────────────────
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({
          'form.lat': latitude,
          'form.lon': longitude,
          'form.coordsStr': `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        });
        this._updateMapMarker(latitude, longitude);
      },
      fail: () => {
        wx.showToast({ title: '未选择位置', icon: 'none' });
      },
    });
  },

  _updateMapMarker(lat, lon) {
    this.setData({
      mapMarkers: [{
        id: 1,
        latitude: lat,
        longitude: lon,
        iconPath: '/images/marker-official.png',
        width: 44,
        height: 52,
      }],
    });
  },

  // ──────────────────────────────────────────
  // 表单字段
  // ──────────────────────────────────────────
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  selectTerrain(e) {
    this.setData({ 'form.terrain': e.currentTarget.dataset.val });
  },

  toggleMethod(e) {
    const val = e.currentTarget.dataset.val;
    const arr = [...this.data.form.methods];
    const idx = arr.indexOf(val);
    if (idx === -1) arr.push(val); else arr.splice(idx, 1);
    this.setData({ 'form.methods': arr });
  },

  toggleSpecies(e) {
    const val = e.currentTarget.dataset.val;
    const arr = [...this.data.form.species];
    const idx = arr.indexOf(val);
    if (idx === -1) arr.push(val); else arr.splice(idx, 1);
    this.setData({ 'form.species': arr });
  },

  selectDifficulty(e) {
    this.setData({ 'form.difficulty': e.currentTarget.dataset.val });
  },

  // ──────────────────────────────────────────
  // 提交
  // ──────────────────────────────────────────
  async submit() {
    if (this.data.saving) return;
    const { form, isEdit, editId } = this.data;

    // 校验必填
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写钓点名称', icon: 'none' }); return;
    }
    if (!form.terrain) {
      wx.showToast({ title: '请选择地形类型', icon: 'none' }); return;
    }
    if (!form.lat) {
      wx.showToast({ title: '请选择位置坐标', icon: 'none' }); return;
    }
    if (!this.data.coverPreview) {
      wx.showToast({ title: '请上传封面图', icon: 'none' }); return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中…', mask: true });

    try {
      // 上传封面图 + 多图
      const [coverUrl, imageUrls] = await Promise.all([
        this._uploadCover(),
        this._uploadImages(),
      ]);

      const data = {
        ...form,
        name: form.name.trim(),
        cover_image: coverUrl,
        images: imageUrls,
      };

      const action = isEdit ? 'update' : 'add';
      const res = await wx.cloud.callFunction({
        name: 'addOfficialSpot',
        data: { action, data, spotId: editId || undefined },
      });

      if (res.result.success) {
        wx.showToast({ title: isEdit ? '修改成功' : '发布成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1200);
      } else {
        throw new Error(res.result.error || '未知错误');
      }
    } catch (e) {
      console.error('保存钓点失败', e);
      wx.showToast({ title: '保存失败：' + String(e), icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },

  // 删除（软删除）
  deleteSpot() {
    wx.showModal({
      title: '确认删除',
      content: '删除后将不再显示，确定吗？',
      confirmColor: '#e85555',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '删除中…' });
        try {
          await wx.cloud.callFunction({
            name: 'addOfficialSpot',
            data: { action: 'delete', spotId: this.data.editId },
          });
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1200);
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        } finally {
          wx.hideLoading();
        }
      },
    });
  },
});
