// pages/spot-map/spot-map.js — 钓点地图
const app = getApp();
const apiCache = require('../../utils/apiCache');

// ── 根据当前海况计算 marker 适合度 ──────────────────────────
// 返回 { level: 'good'|'ok'|'poor', label, color, bgColor }
function calcSpotFitness(marineData) {
  if (!marineData) return { level: 'unknown', label: '—', color: '#888', bgColor: '#f5f5f5' };
  const { tideState, waveHeight, sst } = marineData.currentData || {};

  let score = 0;
  // 潮汐
  if (tideState?.value === 'rising')  score += 3;
  if (tideState?.value === 'falling') score += 2;
  if (tideState?.value === 'high' || tideState?.value === 'low') score += 0;
  // 浪高
  if (waveHeight != null) {
    if (waveHeight < 0.5)      score += 2;
    else if (waveHeight < 1.2) score += 1;
    else if (waveHeight > 2.0) score -= 2;
  }
  // 水温
  if (sst != null && sst >= 18 && sst <= 28) score += 1;

  if (score >= 5) return { level: 'good', label: '适合出钓', color: '#fff', bgColor: '#1a7f5a' };
  if (score >= 3) return { level: 'ok',   label: '条件一般', color: '#fff', bgColor: '#e6a817' };
  return               { level: 'poor',  label: '不宜出钓', color: '#fff', bgColor: '#e85555' };
}

// ── 构建 marker callout 内容（带适合度标注）─────────────────
function buildCallout(name, isOfficial, fitness) {
  const prefix = isOfficial ? '⭐ ' : '';
  const suffix = fitness.level !== 'unknown' ? ` · ${fitness.label}` : '';
  return {
    content: prefix + name + suffix,
    color: '#1a1a2e',
    fontSize: 12,
    borderRadius: 8,
    bgColor: '#ffffff',
    padding: 7,
    display: 'BYCLICK',
    borderWidth: 1,
    borderColor: fitness.bgColor,
  };
}

// ── marker 图标颜色（用自定义 iconPath 或 label 着色）────────
// 由于微信地图不支持动态改 iconPath 颜色，用 label 覆盖来着色
function buildMarkerLabel(fitness) {
  if (fitness.level === 'unknown') return null;
  const dotMap = { good: '●', ok: '●', poor: '●' };
  return {
    content:   dotMap[fitness.level],
    color:     fitness.bgColor,
    fontSize:  14,
    anchorX:   0,
    anchorY:   -30,
  };
}

Page({
  data: {
    latitude: 24.45,
    longitude: 118.07,
    scale: 13,
    markers: [],
    myLocation: null,
    selectedSpot: null,
    showAddPanel: false,
    showDetailPanel: false,
    loading: false,
    // 当前海况适合度（用于 marker 着色）
    marineData: null,
    fitnessLabel: '',   // 顶部提示文字
    fitnessLevel: '',   // good/ok/poor

    newSpot: { name: '', description: '', isPublic: false, lat: null, lon: null },
    tapLat: null, tapLon: null,
  },

  onLoad() {
    this.loadSpots();
    this.getMyLocation();
    this._loadMarineForFitness();
  },

  // 加载海况用于 marker 着色（从本地缓存优先，无缓存则调云函数）
  async _loadMarineForFitness(lat, lon) {
    try {
      // 无参数时用当前 data 坐标
      const useLat = lat ?? this.data.latitude;
      const useLon = lon ?? this.data.longitude;
      const cacheKey = apiCache.geoKey('marine', useLat, useLon);
      let marine = apiCache.get(cacheKey);

      if (!marine) {
        const res = await wx.cloud.callFunction({ name: 'getMarineData', data: { lat: useLat, lon: useLon } });
        if (res.result?.success) {
          marine = res.result.data;
          apiCache.set(cacheKey, marine, apiCache.TTL.marine);
        }
      }

      if (marine) {
        const fitness = calcSpotFitness(marine);
        const tide = marine.currentData?.tideState?.label || '';
        const wave = marine.currentData?.waveHeight != null ? `浪高 ${marine.currentData.waveHeight}m` : '';
        this.setData({
          marineData: marine,
          fitnessLabel: `${fitness.label} · ${tide} · ${wave}`,
          fitnessLevel: fitness.level,
        });
        // 重绘 markers 着色
        this._recolorMarkers(marine);
      }
    } catch (e) {
      console.warn('[spot-map] 海况加载失败，marker不着色');
    }
  },

  // 给已有 markers 注入适合度着色
  _recolorMarkers(marine) {
    const fitness = calcSpotFitness(marine);
    const markers = this.data.markers.map(m => ({
      ...m,
      callout: buildCallout(m.title, m.isOfficial, fitness),
      label:   buildMarkerLabel(fitness),
    }));
    this.setData({ markers });
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
      // 如果已有海况数据，立即着色
      if (this.data.marineData) {
        this._recolorMarkers(this.data.marineData);
      }
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
        this.setData({ latitude, longitude, scale: 14, myLocation: { latitude, longitude } });
        // 用真实定位更新海况
        this._loadMarineForFitness(latitude, longitude);
      },
      fail: () => { console.log('位置获取失败，使用默认位置'); },
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
