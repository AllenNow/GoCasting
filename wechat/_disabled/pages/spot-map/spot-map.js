// pages/spot-map/spot-map.js — 钓点地图
// 合规要点：
// 1. 「精选钓点」由管理员整理，仅供参考，非官方认定；
// 2. 非管理员不显示精选钓点的精确经纬度；
// 3. 定位仅在用户同意隐私政策且授权成功后开启地图定位图层；
// 4. 禁渔区 / 保护区不作为精选钓点录入。
const app = getApp();
const apiCache = require('../../utils/apiCache');

const SPOT_CACHE_KEY = 'spot_cache_v1';
const SPOT_CACHE_TTL = 10 * 60 * 1000;      // 钓点列表本地缓存 10 分钟
const FAV_KEY = 'spot_favorites';
const DISCLAIMER_ACK_KEY = 'spotDisclaimerAcked';
const CLOSED_TIP_KEY = 'closedSeasonTipDate';

const WATER_TYPE_NAMES = ['矶钓', '滩钓', '堤坝', '船钓', '其他'];
const DANGER_LEVELS = ['低', '中', '高'];
const WATER_TYPES = [{ value: 'all', label: '全部' }].concat(
  WATER_TYPE_NAMES.map(v => ({ value: v, label: v }))
);

// ── 根据当前海况计算 marker 参考等级 ──────────────────────
// 返回 { level: 'good'|'ok'|'poor'|'unknown', label, color, bgColor }
function calcSpotFitness(marineData) {
  if (!marineData) {
    return { level: 'unknown', label: '—', color: '#888', bgColor: '#f5f5f5' };
  }
  const { tideState, waveHeight, sst } = marineData.currentData || {};

  let score = 0;
  if (tideState?.value === 'rising') score += 3;
  if (tideState?.value === 'falling') score += 2;
  if (waveHeight != null) {
    if (waveHeight < 0.5) score += 2;
    else if (waveHeight < 1.2) score += 1;
    else if (waveHeight > 2.0) score -= 2;
  }
  if (sst != null && sst >= 18 && sst <= 28) score += 1;

  // 仅描述海况，不构成出钓建议
  if (score >= 5) return { level: 'good', label: '海况较好', color: '#fff', bgColor: '#1a7f5a' };
  if (score >= 3) return { level: 'ok', label: '海况一般', color: '#fff', bgColor: '#e6a817' };
  return { level: 'poor', label: '海况较差', color: '#fff', bgColor: '#e85555' };
}

// ── marker callout ────────────────────────────────────────
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

// ── marker 着色圆点 ───────────────────────────────────────
function buildMarkerLabel(fitness) {
  if (fitness.level === 'unknown') return null;
  return {
    content: '●',
    color: fitness.bgColor,
    fontSize: 14,
    anchorX: 0,
    anchorY: -30,
  };
}

// ── 缩放级别 → 聚合网格（度）─────────────────────────────
function gridSizeForScale(scale) {
  if (scale <= 10) return 0.5;
  if (scale <= 12) return 0.2;
  if (scale <= 14) return 0.05;
  return 0;
}

// ── 球面距离（km）─────────────────────────────────────────
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function fmtDate(v) {
  if (!v) return '';
  let d;
  if (v instanceof Date) d = v;
  else if (typeof v === 'number') d = new Date(v);
  else if (typeof v === 'string') d = new Date(v.replace(/-/g, '/'));
  else return '';
  if (isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

Page({
  data: {
    latitude: 24.45,
    longitude: 118.07,
    scale: 13,
    markers: [],
    showLocation: false,       // 隐私同意且定位成功后才显示定位图层
    myLocation: null,
    selectedSpot: null,
    showAddPanel: false,
    showDetailPanel: false,
    loading: false,
    canAddSpot: false,         // 仅管理员可录入精选钓点

    // 海况参考
    marineData: null,
    fitnessLabel: '',
    fitnessLevel: '',

    // 搜索 / 筛选 / 排序
    waterTypes: WATER_TYPES,
    typeFilter: 'all',
    sortMode: 'default',       // 'default' | 'distance'
    searchKeyword: '',
    visibleCount: 0,

    // 收藏
    favoriteCount: 0,

    // 提示层
    showDisclaimer: false,     // 首次进入的一次性免责提示
    showClosedTip: false,      // 伏季休渔提示

    // 录入 / 编辑表单
    editingId: '',
    formTarget: 'official',    // official | private
    waterTypeNames: WATER_TYPE_NAMES,
    dangerLevels: DANGER_LEVELS,
    newSpot: {
      name: '',
      description: '',
      waterType: '',
      targetFish: '',
      safetyTip: '',
      protectedArea: false,
      dangerLevel: '中',
      lat: null,
      lon: null,
    },
    tapLatStr: '',
    tapLonStr: '',
  },

  onLoad() {
    this._officialSpots = [];
    this._privateSpots = [];
    this._markerMap = {};
    this._favorites = this._loadFavorites();

    this._checkVisitNotice();
    this._checkAdmin();
    this._restoreCache();
    this.loadSpots();
    this._tryLocate();
    this._loadMarineForFitness();
  },

  // ── 首次进入提示 + 休渔期提示 ────────────────────────────
  _checkVisitNotice() {
    let acked = false;
    try { acked = !!wx.getStorageSync(DISCLAIMER_ACK_KEY); } catch (e) {}
    if (!acked) this.setData({ showDisclaimer: true });

    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    // 海洋伏季休渔一般为 5 月 1 日至 9 月 16 日（以当地公告为准）
    const inClosedSeason = m === 5 || (m > 5 && m < 9) || (m === 9 && d <= 16);
    if (inClosedSeason) {
      const today = `${now.getFullYear()}-${m}-${d}`;
      let shown = '';
      try { shown = wx.getStorageSync(CLOSED_TIP_KEY) || ''; } catch (e) {}
      if (shown !== today) this.setData({ showClosedTip: true });
    }
  },

  onDisclaimerAck() {
    try { wx.setStorageSync(DISCLAIMER_ACK_KEY, true); } catch (e) {}
    this.setData({ showDisclaimer: false });
  },

  onClosedTipClose() {
    const now = new Date();
    try {
      wx.setStorageSync(CLOSED_TIP_KEY, `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`);
    } catch (e) {}
    this.setData({ showClosedTip: false });
  },

  goDisclaimer() {
    wx.navigateTo({ url: '/pages/disclaimer/disclaimer' });
  },

  // ── 权限 ─────────────────────────────────────────────────
  _checkAdmin() {
    const g = app.globalData;
    if (g.permissionLoaded) {
      this.setData({ canAddSpot: !!g.isAdmin });
      return;
    }
    wx.cloud.callFunction({ name: 'checkPermission' })
      .then((res) => {
        const r = (res && res.result) || {};
        g.role = r.role || 'viewer';
        g.isAdmin = !!r.isAdmin;
        g.permissionLoaded = true;
        this.setData({ canAddSpot: !!r.isAdmin });
      })
      .catch(() => {});
  },

  // ── 定位（隐私同意后再调用）──────────────────────────────
  _hasLocated: false,

  _tryLocate() {
    if (this._hasLocated) return;
    if (!wx.getPrivacySetting) {
      this._hasLocated = true;
      this.getMyLocation();
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) return;   // 等用户同意隐私政策
        this._hasLocated = true;
        this.getMyLocation();
      },
      fail: () => {
        this._hasLocated = true;
        this.getMyLocation();
      },
    });
  },

  onPrivacyAgree() {
    this._hasLocated = false;
    this._tryLocate();
  },

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
          showLocation: true,
        });
        try {
          wx.setStorageSync('lastGeo', { lat: latitude, lon: longitude, ts: Date.now() });
        } catch (e) {}
        this._loadMarineForFitness(latitude, longitude);
        this._applyFilters();
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        let tip = '定位失败，可手动拖动地图选择位置';
        if (/privacy|隐私|api scope/i.test(msg)) tip = '定位接口未在隐私指引中声明，请手动选择位置';
        else if (/deny|denied|auth/i.test(msg)) tip = '未开启定位权限，可在设置中开启';
        else if (/system|permission|location service/i.test(msg)) tip = '系统定位服务未开启，请检查手机设置';
        console.warn('[spot-map] 定位失败:', msg);
        wx.showToast({ title: tip, icon: 'none', duration: 2500 });
      },
    });
  },

  // ── 海况（仅用于参考着色）────────────────────────────────
  async _loadMarineForFitness(lat, lon) {
    try {
      const useLat = lat ?? this.data.latitude;
      const useLon = lon ?? this.data.longitude;
      const cacheKey = apiCache.geoKey('marine_wave', useLat, useLon);
      let marine = apiCache.get(cacheKey);

      if (!marine) {
        const res = await wx.cloud.callFunction({
          name: 'getMarineData',
          data: { lat: useLat, lon: useLon, needTide: false },
        });
        if (res.result?.success) {
          marine = res.result.data;
          apiCache.set(cacheKey, marine, apiCache.TTL.marine);
        }
      }

      if (marine) {
        const fitness = calcSpotFitness(marine);
        const tide = marine.currentData?.tideState?.label || '';
        const wave = marine.currentData?.waveHeight != null
          ? `浪高 ${marine.currentData.waveHeight}m` : '';
        this.setData({
          marineData: marine,
          fitnessLabel: `${fitness.label} · ${tide} · ${wave}（参考）`,
          fitnessLevel: fitness.level,
        });
        this._applyFilters();
        // 详情面板打开时同步刷新今日潮汐
        if (this.data.showDetailPanel && this.data.selectedSpot) {
          this.setData({ 'selectedSpot.tideList': this._todayExtremes() });
        }
      }
    } catch (e) {
      console.warn('[spot-map] 海况加载失败，marker 不着色');
    }
  },

  // 今日高低潮（来自 getMarineData 的模型推算）
  _todayExtremes() {
    const md = this.data.marineData;
    if (!md || !Array.isArray(md.allDays)) return [];
    const day = md.allDays[md.todayIdx];
    if (!day || !Array.isArray(day.extremes)) return [];
    return day.extremes.slice(0, 4).map(ex => ({
      icon: ex.icon || '',
      label: ex.label || (ex.type === 'high' ? '高潮' : '低潮'),
      timeStr: ex.timeStr || '',
      level: ex.level != null ? ex.level + 'm' : '',
    }));
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this._tryLocate();
  },

  // ── 数据加载 ─────────────────────────────────────────────
  _restoreCache() {
    try {
      const raw = wx.getStorageSync(SPOT_CACHE_KEY);
      if (!raw || !raw.ts || Date.now() - raw.ts > SPOT_CACHE_TTL) return;
      this._officialSpots = raw.official || [];
      this._privateSpots = raw.private || [];
      this._applyFilters();
    } catch (e) {}
  },

  _saveCache() {
    try {
      wx.setStorageSync(SPOT_CACHE_KEY, {
        official: this._officialSpots,
        private: this._privateSpots,
        ts: Date.now(),
      });
    } catch (e) {}
  },

  // 加载精选钓点 + 本人私有钓点
  async loadSpots() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;

      // 精选钓点（只读），集合不存在时不影响私有钓点
      let officialSpots = [];
      try {
        const officialRes = await db.collection('official_spots')
          .where({ status: 'active' })
          .limit(200)
          .get();
        officialSpots = officialRes.data.map(s => ({
          ...s,
          isOfficial: true,
          water_type: s.water_type || '其他',
          danger_level: s.danger_level || '中',
          source: s.source || '管理员整理，仅供参考',
        }));
      } catch (e) {
        console.log('[spot-map] official_spots 集合不可用，跳过精选钓点');
      }

      // 仅加载当前用户自己的私有钓点（_openid 兜底过滤）
      const openid = app.globalData.openid;
      const where = { is_public: false };
      if (openid) where._openid = openid;
      let userSpots = [];
      try {
        const privateRes = await db.collection('fishing_spots')
          .where(where)
          .orderBy('created_at', 'desc')
          .limit(50)
          .get();
        userSpots = privateRes.data.map(s => ({
          ...s,
          isOfficial: false,
          water_type: s.water_type || '其他',
        }));
      } catch (e) {
        console.warn('[spot-map] 私有钓点加载失败', e);
      }

      this._officialSpots = officialSpots;
      this._privateSpots = userSpots;
      this._saveCache();
      this._applyFilters();
      this.setData({ loading: false });
    } catch (err) {
      console.error('加载钓点失败', err);
      this.setData({ loading: false });
      if (!this._officialSpots.length && !this._privateSpots.length) {
        wx.showToast({ title: '加载钓点失败', icon: 'none' });
      }
    }
  },

  // ── 搜索 / 筛选 / 排序 / 聚合 ────────────────────────────
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value || '' });
    this._applyFilters();
  },

  clearSearch() {
    this.setData({ searchKeyword: '' });
    this._applyFilters();
  },

  // 空态：清除全部筛选条件
  resetFilters() {
    this.setData({ searchKeyword: '', typeFilter: 'all', sortMode: 'default' });
    this._applyFilters();
  },

  // 弹层阻止穿透滚动
  noop() {},

  onTypeFilter(e) {
    const type = e.currentTarget.dataset.type || 'all';
    this.setData({ typeFilter: type });
    this._applyFilters();
  },

  toggleSort() {
    const next = this.data.sortMode === 'distance' ? 'default' : 'distance';
    if (next === 'distance' && !this.data.myLocation) {
      this.getMyLocation();
      wx.showToast({ title: '正在获取位置…', icon: 'none' });
    }
    this.setData({ sortMode: next });
    this._applyFilters();
  },

  _applyFilters() {
    const base = [...this._officialSpots, ...this._privateSpots];
    const kw = (this.data.searchKeyword || '').trim().toLowerCase();
    const type = this.data.typeFilter;
    const my = this.data.myLocation;

    let list = base.map(s => {
      const dist = (my && s.lat != null && s.lon != null)
        ? distanceKm(my.latitude, my.longitude, s.lat, s.lon) : null;
      return { ...s, _dist: dist };
    });

    if (type !== 'all') list = list.filter(s => (s.water_type || '其他') === type);
    if (kw) {
      list = list.filter(s =>
        String(s.name || '').toLowerCase().includes(kw) ||
        String(s.region || '').toLowerCase().includes(kw) ||
        String(s.target_fish || '').toLowerCase().includes(kw)
      );
    }

    if (this.data.sortMode === 'distance' && my) {
      list.sort((a, b) => (a._dist == null ? 1e9 : a._dist) - (b._dist == null ? 1e9 : b._dist));
    } else {
      // 精选钓点在前，私有钓点在后
      list.sort((a, b) => (b.isOfficial ? 1 : 0) - (a.isOfficial ? 1 : 0));
    }

    this.setData({
      markers: this._buildMarkers(list),
      visibleCount: list.length,
    });
  },

  _buildMarkers(list) {
    const fitness = calcSpotFitness(this.data.marineData);
    const grid = gridSizeForScale(this.data.scale);
    const markers = [];
    const markerMap = {};
    let id = 1;

    if (!grid) {
      list.forEach(spot => {
        const mid = id++;
        markerMap[mid] = { spot };
        markers.push(this._spotMarker(mid, spot, fitness));
      });
    } else {
      const groups = {};
      list.forEach(spot => {
        const gx = Math.round(spot.lat / grid);
        const gy = Math.round(spot.lon / grid);
        const key = `${gx}_${gy}`;
        (groups[key] = groups[key] || []).push(spot);
      });
      Object.keys(groups).forEach(key => {
        const arr = groups[key];
        const mid = id++;
        if (arr.length === 1) {
          markerMap[mid] = { spot: arr[0] };
          markers.push(this._spotMarker(mid, arr[0], fitness));
        } else {
          const cLat = arr.reduce((s, x) => s + x.lat, 0) / arr.length;
          const cLon = arr.reduce((s, x) => s + x.lon, 0) / arr.length;
          markerMap[mid] = { cluster: arr, latitude: cLat, longitude: cLon };
          markers.push({
            id: mid,
            latitude: cLat,
            longitude: cLon,
            iconPath: '/images/marker-public.png',
            width: 46,
            height: 54,
            callout: {
              content: `${arr.length} 个钓点`,
              color: '#1a1a2e',
              fontSize: 12,
              borderRadius: 8,
              bgColor: '#ffffff',
              padding: 6,
              display: 'ALWAYS',
              borderWidth: 1,
              borderColor: '#1a7f5a',
            },
          });
        }
      });
    }

    this._markerMap = markerMap;
    return markers;
  },

  _spotMarker(mid, spot, fitness) {
    return {
      id: mid,
      _id: spot._id,
      latitude: spot.lat,
      longitude: spot.lon,
      title: spot.name,
      isOfficial: !!spot.isOfficial,
      iconPath: spot.isOfficial ? '/images/marker-official.png' : '/images/marker-private.png',
      width: spot.isOfficial ? 44 : 40,
      height: spot.isOfficial ? 52 : 48,
      callout: buildCallout(spot.name, !!spot.isOfficial, fitness),
      label: buildMarkerLabel(fitness),
    };
  },

  // 缩放后重新聚合
  onRegionChange(e) {
    if (!e || e.type !== 'end') return;
    const scale = e.detail && e.detail.scale;
    if (!scale || Math.abs(scale - this.data.scale) < 0.01) return;
    this.setData({ scale });
    this._applyFilters();
  },

  // ── 点击 marker ──────────────────────────────────────────
  onMarkerTap(e) {
    const info = this._markerMap && this._markerMap[e.detail.markerId];
    if (!info) return;
    if (info.cluster) {
      this.setData({
        latitude: info.latitude,
        longitude: info.longitude,
        scale: Math.min(18, (this.data.scale || 13) + 2),
      });
      return;
    }
    this._openDetail(info.spot);
  },

  _openDetail(spot) {
    const isOfficial = !!spot.isOfficial;
    const my = this.data.myLocation;
    const dist = (my && spot.lat != null && spot.lon != null)
      ? distanceKm(my.latitude, my.longitude, spot.lat, spot.lon) : null;
    // 非管理员不展示精选钓点的精确经纬度
    const showCoords = !isOfficial || this.data.canAddSpot;
    const tideList = this._todayExtremes();

    this.setData({
      selectedSpot: {
        ...spot,
        isOfficial,
        typeLabel: spot.water_type || '其他',
        dangerLabel: spot.danger_level || '',
        verifiedStr: fmtDate(spot.verified_at),
        createdStr: fmtDate(spot.created_at),
        distanceStr: dist == null ? '' : (dist < 1
          ? `${Math.round(dist * 1000)} m`
          : `${dist.toFixed(1)} km`),
        tideList,
        showCoords,
        latStr: (showCoords && spot.lat != null) ? spot.lat.toFixed(5) : '',
        lonStr: (showCoords && spot.lon != null) ? spot.lon.toFixed(5) : '',
        isFavorite: this._isFavorite(spot),
      },
      showDetailPanel: true,
      showAddPanel: false,
    });
  },

  // ── 收藏（本地）──────────────────────────────────────────
  _loadFavorites() {
    try {
      const arr = wx.getStorageSync(FAV_KEY);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  },

  _favKey(spot) {
    return spot._id || `${spot.lat}_${spot.lon}`;
  },

  _isFavorite(spot) {
    return this._favorites.indexOf(this._favKey(spot)) !== -1;
  },

  toggleFavorite() {
    const spot = this.data.selectedSpot;
    if (!spot) return;
    const key = this._favKey(spot);
    const idx = this._favorites.indexOf(key);
    if (idx === -1) this._favorites.push(key);
    else this._favorites.splice(idx, 1);
    try { wx.setStorageSync(FAV_KEY, this._favorites); } catch (e) {}
    this.setData({
      'selectedSpot.isFavorite': idx === -1,
      favoriteCount: this._favorites.length,
    });
    wx.showToast({ title: idx === -1 ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  // ── 复制 ─────────────────────────────────────────────────
  copySpotInfo() {
    const spot = this.data.selectedSpot;
    if (!spot) return;
    const parts = [spot.name];
    if (spot.region) parts.push(spot.region);
    if (spot.typeLabel) parts.push(spot.typeLabel);
    wx.setClipboardData({
      data: parts.join(' '),
      success: () => wx.showToast({ title: '已复制钓点信息', icon: 'none' }),
    });
  },

  // ── 录入 / 编辑 ──────────────────────────────────────────
  onMapLongPress(e) {
    if (!this.data.canAddSpot) return;
    const { latitude, longitude } = e.detail;
    this._fillFormLocation(latitude, longitude);
  },

  startAddSpot() {
    if (!this.data.canAddSpot) return;
    wx.chooseLocation({
      success: (res) => this._fillFormLocation(res.latitude, res.longitude),
      fail: (err) => {
        const msg = (err && err.errMsg) || '';
        if (!/cancel/i.test(msg)) {
          wx.showToast({ title: '选点失败，请长按地图选择位置', icon: 'none' });
        }
      },
    });
  },

  _fillFormLocation(lat, lon) {
    this.setData({
      tapLatStr: lat.toFixed(5),
      tapLonStr: lon.toFixed(5),
      'newSpot.lat': lat,
      'newSpot.lon': lon,
      showAddPanel: true,
      showDetailPanel: false,
    });
  },

  closePanel() {
    this.setData({
      showAddPanel: false,
      showDetailPanel: false,
      selectedSpot: null,
      editingId: '',
    });
  },

  onNewSpotNameInput(e) { this.setData({ 'newSpot.name': e.detail.value }); },
  onNewSpotDescInput(e) { this.setData({ 'newSpot.description': e.detail.value }); },
  onTargetFishInput(e) { this.setData({ 'newSpot.targetFish': e.detail.value }); },
  onSafetyTipInput(e) { this.setData({ 'newSpot.safetyTip': e.detail.value }); },
  onWaterTypeChange(e) {
    const idx = Number(e.detail.value) || 0;
    this.setData({ 'newSpot.waterType': WATER_TYPE_NAMES[idx] });
  },
  onDangerChange(e) {
    const idx = Number(e.detail.value) || 1;
    this.setData({ 'newSpot.dangerLevel': DANGER_LEVELS[idx] });
  },
  onProtectedChange(e) {
    this.setData({ 'newSpot.protectedArea': !!e.detail.value });
  },
  setFormTarget(e) {
    const target = e.currentTarget.dataset.target;
    if (target !== 'official' && target !== 'private') return;
    this.setData({ formTarget: target });
  },

  editSpot() {
    const spot = this.data.selectedSpot;
    if (!spot || spot.isOfficial) return;   // 精选钓点由管理端维护
    this.setData({
      editingId: spot._id,
      formTarget: 'private',
      newSpot: {
        name: spot.name || '',
        description: spot.description || '',
        waterType: spot.water_type || '',
        targetFish: spot.target_fish || '',
        safetyTip: spot.safety_tip || '',
        protectedArea: !!spot.protected_area,
        dangerLevel: spot.danger_level || '中',
        lat: spot.lat,
        lon: spot.lon,
      },
      tapLatStr: spot.lat != null ? spot.lat.toFixed(5) : '',
      tapLonStr: spot.lon != null ? spot.lon.toFixed(5) : '',
      showAddPanel: true,
      showDetailPanel: false,
    });
  },

  async deleteSpot() {
    const spot = this.data.selectedSpot;
    if (!spot) return;

    if (spot.isOfficial) {
      if (!this.data.canAddSpot) {
        wx.showToast({ title: '仅管理员可操作', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '删除精选钓点',
        content: '删除后将从地图与列表中移除，确认继续？',
        success: async (r) => {
          if (!r.confirm) return;
          wx.showLoading({ title: '删除中…' });
          try {
            const res = await wx.cloud.callFunction({
              name: 'addOfficialSpot',
              data: { action: 'delete', spotId: spot._id },
            });
            if (res.result && res.result.success) {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.closePanel();
              this.loadSpots();
            } else {
              wx.showToast({ title: res.result?.error || '删除失败', icon: 'none' });
            }
          } catch (e) {
            wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        },
      });
      return;
    }

    wx.showModal({
      title: '删除我的钓点',
      content: `确认删除「${spot.name}」？删除后无法恢复。`,
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await app.globalData.db.collection('fishing_spots').doc(spot._id).remove();
          wx.showToast({ title: '已删除', icon: 'success' });
          this.closePanel();
          this.loadSpots();
        } catch (e) {
          wx.showToast({ title: '删除失败，请稍后重试', icon: 'none' });
        }
      },
    });
  },

  async saveSpot() {
    if (!this.data.canAddSpot) {
      wx.showToast({ title: '仅管理员可录入精选钓点', icon: 'none' });
      return;
    }
    const { newSpot, formTarget, editingId } = this.data;
    if (!newSpot.name.trim()) {
      wx.showToast({ title: '请输入钓点名称', icon: 'none' });
      return;
    }
    if (!newSpot.waterType) {
      wx.showToast({ title: '请选择钓法类型', icon: 'none' });
      return;
    }
    if (newSpot.lat == null || newSpot.lon == null) {
      wx.showToast({ title: '请在地图上长按选取位置', icon: 'none' });
      return;
    }
    if (formTarget === 'official' && newSpot.protectedArea) {
      wx.showToast({ title: '禁渔区/保护区不可作为精选钓点', icon: 'none' });
      return;
    }

    const isOfficial = formTarget === 'official';
    const payload = {
      name: newSpot.name.trim(),
      description: (newSpot.description || '').trim(),
      lat: newSpot.lat,
      lon: newSpot.lon,
      water_type: newSpot.waterType,
      target_fish: (newSpot.targetFish || '').trim(),
      safety_tip: (newSpot.safetyTip || '').trim(),
      protected_area: !!newSpot.protectedArea,
      danger_level: newSpot.dangerLevel,
    };

    wx.showLoading({ title: '保存中…' });
    try {
      if (isOfficial) {
        const res = await wx.cloud.callFunction({
          name: 'addOfficialSpot',
          data: {
            action: editingId ? 'update' : 'add',
            spotId: editingId || undefined,
            data: payload,
          },
        });
        const r = (res && res.result) || {};
        if (!r.success) throw new Error(r.error || '保存失败');
      } else {
        // 私有钓点：先审后存，仅本人可见
        const textRes = await wx.cloud.callFunction({
          name: 'checkText',
          data: {
            content: [payload.name, payload.description, payload.target_fish, payload.safety_tip]
              .filter(Boolean).join(' ').trim(),
          },
        });
        const tr = textRes.result || {};
        if (tr.safe !== true || tr.checked === false) {
          throw new Error((tr.retry || tr.checked === false)
            ? '内容安全检测服务暂不可用，请稍后重试'
            : '钓点内容未通过安全检测，请修改后重试');
        }
        const db = app.globalData.db;
        const record = {
          ...payload,
          is_public: false,
          updated_at: db.serverDate(),
        };
        if (editingId) {
          await db.collection('fishing_spots').doc(editingId).update({ data: record });
        } else {
          record.openid = app.globalData.openid || null;
          record.created_at = db.serverDate();
          await db.collection('fishing_spots').add({ data: record });
        }
      }

      wx.showToast({ title: editingId ? '已更新' : '已保存', icon: 'success' });
      this.setData({
        showAddPanel: false,
        editingId: '',
        newSpot: {
          name: '', description: '', waterType: '', targetFish: '', safetyTip: '',
          protectedArea: false, dangerLevel: '中', lat: null, lon: null,
        },
        tapLatStr: '',
        tapLonStr: '',
      });
      this.loadSpots();
    } catch (err) {
      console.error('保存钓点失败', err);
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ── 在地图中查看 ─────────────────────────────────────────
  // 精选钓点不调起外部地图，避免精确坐标外显；私有钓点可调起导航
  navigateToSpot() {
    const spot = this.data.selectedSpot;
    if (!spot) return;
    if (spot.isOfficial) {
      this.closePanel();
      this.setData({ latitude: spot.lat, longitude: spot.lon, scale: 16 });
    } else {
      wx.openLocation({
        latitude: spot.lat,
        longitude: spot.lon,
        name: spot.name,
        address: spot.description || '我的钓点',
      });
    }
  },

  // ── 纠错 ─────────────────────────────────────────────────
  reportSpot() {
    const spot = this.data.selectedSpot;
    if (!spot || !spot.isOfficial) return;
    wx.showActionSheet({
      itemList: ['信息有误', '位置不准', '已关闭或禁钓', '其他问题'],
      success: (res) => {
        const reason = ['信息有误', '位置不准', '已关闭或禁钓', '其他问题'][res.tapIndex];
        wx.showLoading({ title: '提交中…' });
        wx.cloud.callFunction({
          name: 'addOfficialSpot',
          data: { action: 'report', spotId: spot._id, reason },
        }).then((r) => {
          wx.hideLoading();
          if (r.result && r.result.success) {
            wx.showToast({ title: '感谢反馈，我们会尽快核实', icon: 'none', duration: 2200 });
          } else {
            wx.showToast({ title: r.result?.error || '提交失败', icon: 'none' });
          }
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' });
        });
      },
    });
  },

  // ── 工具栏 ───────────────────────────────────────────────
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

  // 刷新钓点与海况
  onRefresh() {
    this.loadSpots();
    this._loadMarineForFitness();
    wx.showToast({ title: '已刷新', icon: 'none' });
  },
});
