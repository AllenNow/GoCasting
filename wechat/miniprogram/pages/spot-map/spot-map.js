// pages/spot-map/spot-map.js — 钓点地图
const app = getApp();

Page({
  data: {
    latitude: 24.45,          // 默认中心：厦门
    longitude: 118.07,
    scale: 13,
    markers: [],              // 地图标记点
    myLocation: null,         // 我的当前位置
    selectedSpot: null,       // 当前选中的钓点
    showAddPanel: false,      // 添加钓点面板
    showDetailPanel: false,   // 详情面板
    loading: false,

    // 新钓点表单
    newSpot: {
      name: '',
      description: '',
      isPublic: false,
      lat: null,
      lon: null,
    },

    // 长按选取的临时坐标
    tapLat: null,
    tapLon: null,
  },

  onLoad() {
    this.loadSpots();
    this.getMyLocation();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  // 加载所有公开钓点 + 官方钓点 + 自己的私有钓点
  async loadSpots() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;

      // 官方钓点单独查询，集合不存在时不影响用户钓点
      let officialSpots = [];
      try {
        const officialRes = await db.collection('official_spots')
          .where({ status: 'active' })
          .limit(200)
          .get();
        officialSpots = officialRes.data;
      } catch (e) {
        // official_spots 集合尚未创建，忽略，只显示用户钓点
        console.log('[spot-map] official_spots 集合不存在，跳过官方钓点加载');
      }

      // 用户钓点并行查询
      const [publicRes, privateRes] = await Promise.all([
        db.collection('fishing_spots')
          .where({ is_public: true })
          .orderBy('created_at', 'desc')
          .limit(200)
          .get(),
        db.collection('fishing_spots')
          .where({ is_public: false })
          .orderBy('created_at', 'desc')
          .limit(50)
          .get(),
      ]);

      const userSpots = [...publicRes.data, ...privateRes.data]
        .filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);

      let markerId = 0;
      const officialMarkers = officialSpots.map(spot => ({
        id: markerId++,
        _id: spot._id,
        latitude: spot.lat,
        longitude: spot.lon,
        title: spot.name,
        isOfficial: true,
        iconPath: '/images/marker-official.png',
        width: 48,
        height: 56,
        callout: {
          content: '⭐ ' + spot.name,
          color: '#1a1a2e',
          fontSize: 13,
          borderRadius: 8,
          bgColor: '#ffffff',
          padding: 8,
          display: 'BYCLICK',
        },
        _spotData: { ...spot, isOfficial: true },
      }));

      const userMarkers = userSpots.map(spot => ({
        id: markerId++,
        _id: spot._id,
        latitude: spot.lat,
        longitude: spot.lon,
        title: spot.name,
        isOfficial: false,
        iconPath: spot.is_public ? '/images/marker-public.png' : '/images/marker-private.png',
        width: 44,
        height: 52,
        callout: {
          content: spot.name,
          color: spot.is_public ? '#1a7f5a' : '#666666',
          fontSize: 13,
          borderRadius: 8,
          bgColor: '#ffffff',
          padding: 8,
          display: 'BYCLICK',
        },
        _spotData: spot,
      }));

      this.setData({
        markers: [...officialMarkers, ...userMarkers],
        loading: false,
        totalPublic: publicRes.data.length,
        totalOfficial: officialSpots.length,
      });
    } catch (err) {
      console.error('加载钓点失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载钓点失败', icon: 'none' });
    }
  },

  // 获取我的当前位置
  getMyLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (pos) => {
        const { latitude, longitude } = pos;
        this.setData({
          latitude,
          longitude,
          scale: 14,
          myLocation: { latitude, longitude },
        });
      },
      fail: () => {
        // 用户未授权，保持默认位置
        console.log('位置获取失败，使用默认位置');
      },
    });
  },

  // 点击标记点 → 显示详情
  onMarkerTap(e) {
    const markerId = e.detail.markerId;
    const marker = this.data.markers.find(m => m.id === markerId);
    if (!marker) return;
    const spot = marker._spotData;
    this.setData({
      selectedSpot: {
        ...spot,
        latStr: spot.lat.toFixed(4),
        lonStr: spot.lon.toFixed(4),
      },
      spotCatches: [],
      spotCatchesLoading: true,
      showDetailPanel: true,
      showAddPanel: false,
    });
    // 加载该钓点关联的渔获记录
    this.loadSpotCatches(spot.name);
  },

  // 加载钓点关联渔获
  async loadSpotCatches(spotName) {
    try {
      const db = app.globalData.db;
      const res = await db.collection('catch_logs')
        .where({ location: spotName })
        .orderBy('date', 'desc')
        .limit(10)
        .get();

      const catches = res.data.map(c => ({
        ...c,
        weightDisplay: c.weight_g
          ? (c.weight_g >= 1000 ? (c.weight_g / 1000).toFixed(1) + 'kg' : c.weight_g + 'g')
          : '',
      }));

      this.setData({ spotCatches: catches, spotCatchesLoading: false });
    } catch (err) {
      console.error('加载钓点渔获失败', err);
      this.setData({ spotCatchesLoading: false });
    }
  },

  // 点击钓点渔获条目 → 跳转详情
  onSpotCatchTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/catch-detail/catch-detail?id=${id}` });
  },

  // 长按地图 → 选取坐标准备添加钓点
  onMapLongPress(e) {
    const { latitude, longitude } = e.detail;
    this.setData({
      tapLat: latitude,
      tapLon: longitude,
      tapLatStr: latitude.toFixed(5),
      tapLonStr: longitude.toFixed(5),
      'newSpot.lat': latitude,
      'newSpot.lon': longitude,
      showAddPanel: true,
      showDetailPanel: false,
    });
  },

  // 收起面板
  closePanel() {
    this.setData({ showAddPanel: false, showDetailPanel: false, selectedSpot: null });
  },

  // ========== 添加钓点 ==========

  onNewSpotNameInput(e) {
    this.setData({ 'newSpot.name': e.detail.value });
  },

  onNewSpotDescInput(e) {
    this.setData({ 'newSpot.description': e.detail.value });
  },

  onPublicChange(e) {
    this.setData({ 'newSpot.isPublic': e.detail.value });
  },

  async saveSpot() {
    const { newSpot } = this.data;
    if (!newSpot.name.trim()) {
      wx.showToast({ title: '请输入钓点名称', icon: 'none' }); return;
    }
    if (!newSpot.lat) {
      wx.showToast({ title: '请在地图上长按选取位置', icon: 'none' }); return;
    }

    wx.showLoading({ title: '保存中…' });
    try {
      const db = app.globalData.db;
      await db.collection('fishing_spots').add({
        data: {
          name: newSpot.name.trim(),
          description: newSpot.description || '',
          lat: newSpot.lat,
          lon: newSpot.lon,
          is_public: newSpot.isPublic,
          openid: app.globalData.openid || null,   // 显式记录用户 openid
          created_at: db.serverDate(),
        },
      });
      wx.showToast({ title: '钓点已保存', icon: 'success' });
      this.setData({
        showAddPanel: false,
        newSpot: { name: '', description: '', isPublic: false, lat: null, lon: null },
      });
      this.loadSpots();
    } catch (err) {
      console.error('保存钓点失败', err);
      wx.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // 以该钓点为起点导航（调起微信内置导航）
  navigateToSpot() {
    const spot = this.data.selectedSpot;
    if (!spot) return;
    wx.openLocation({
      latitude: spot.lat,
      longitude: spot.lon,
      name: spot.name,
      address: spot.description || '钓点',
    });
  },

  // 移回我的位置
  goToMyLocation() {
    if (this.data.myLocation) {
      this.setData({
        latitude: this.data.myLocation.latitude,
        longitude: this.data.myLocation.longitude,
        scale: 15,
      });
    } else {
      this.getMyLocation();
    }
  },
});
