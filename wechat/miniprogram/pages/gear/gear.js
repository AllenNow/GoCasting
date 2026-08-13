// pages/gear/gear.js — 装备列表页（系列卡片浏览 + 筛选）
const app = getApp();

// 筛选选项配置
const BRAND_OPTIONS = ['全部', 'Shimano', 'Daiwa'];
const ROD_TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '振出', value: 'telescopic' },
  { label: '并继', value: 'put-in_joint' },
];
const MARKET_OPTIONS = [
  { label: '全部', value: '' },
  { label: '中国行货', value: 'CN' },
  { label: 'JDM', value: 'JDM' },
];
// 价位筛选 — 渔竿和渔轮阈值不同
const ROD_PRICE_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '入门', value: 1 },
  { label: '中端', value: 2 },
  { label: '高端', value: 3 },
];
const REEL_PRICE_OPTIONS = [
  { label: '全部', value: 0 },
  { label: '入门', value: 1 },
  { label: '中端', value: 2 },
  { label: '高端', value: 3 },
];

Page({
  data: {
    // Tab 状态
    activeTab: 'rod', // 'rod' | 'reel'

    // 数据
    seriesList: [],      // 当前 Tab 原始数据
    filteredList: [],    // 筛选后的数据

    // 筛选状态
    brandIdx: 0,
    typeIdx: 0,
    priceIdx: 0,
    marketIdx: 0,
    keyword: '',

    // 筛选选项
    brands: BRAND_OPTIONS,
    types: ROD_TYPE_OPTIONS,
    prices: ROD_PRICE_OPTIONS,
    markets: MARKET_OPTIONS,

    // UI 状态
    loading: true,
    seeded: true,
    showTypePill: true, // 默认渔竿，显示类型筛选
  },

  // 搜索防抖计时器
  _searchTimer: null,

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 自定义 tabBar 高亮
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  // ──────────────────────────────────────────
  // Tab 切换
  // ──────────────────────────────────────────
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;

    // 切换 Tab 时重置筛选
    const isReel = tab === 'reel';
    this.setData({
      activeTab: tab,
      brandIdx: 0,
      typeIdx: 0,
      priceIdx: 0,
      marketIdx: 0,
      keyword: '',
      showTypePill: !isReel, // 渔轮隐藏类型筛选
      prices: isReel ? REEL_PRICE_OPTIONS : ROD_PRICE_OPTIONS,
    });
    this.loadData();
  },

  // ──────────────────────────────────────────
  // 数据加载
  // ──────────────────────────────────────────
  async loadData() {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;
      const category = this.data.activeTab === 'reel' ? 'reel' : 'rod';
      const res = await db.collection('gear_series')
        .where({ category })
        .limit(100)
        .get();

      const seeded = res.data.length > 0;

      // 读取本地浏览记录
      const views = wx.getStorageSync('gear_views') || {};

      // 排序规则：
      //   主键：浏览次数（降序）— 看得越多排越前
      //   次键：price_tier（降序）— 同浏览次数时高端在前
      //   三键：品牌字母（升序）
      const sorted = res.data.sort((a, b) => {
        const va = views[a.series_id] || 0;
        const vb = views[b.series_id] || 0;
        if (vb !== va) return vb - va;
        if (b.price_tier !== a.price_tier) return b.price_tier - a.price_tier;
        return a.brand.localeCompare(b.brand);
      });

      this.setData({
        seriesList: sorted,
        seeded,
        loading: false,
        showTypePill: this.data.activeTab !== 'reel',
      });
      this.applyFilters();
    } catch (err) {
      console.error('加载装备系列失败', err);
      this.setData({ loading: false, seeded: false });
    }
  },

  // ──────────────────────────────────────────
  // 筛选逻辑
  // ──────────────────────────────────────────
  onBrandChange(e) {
    this.setData({ brandIdx: Number(e.currentTarget.dataset.idx) });
    this.applyFilters();
  },

  onTypeChange(e) {
    this.setData({ typeIdx: Number(e.currentTarget.dataset.idx) });
    this.applyFilters();
  },

  onPriceChange(e) {
    this.setData({ priceIdx: Number(e.currentTarget.dataset.idx) });
    this.applyFilters();
  },

  onMarketChange(e) {
    this.setData({ marketIdx: Number(e.currentTarget.dataset.idx) });
    this.applyFilters();
  },

  onSearchInput(e) {
    const val = e.detail.value;
    this.setData({ keyword: val });
    // 300ms 防抖
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.applyFilters();
    }, 300);
  },

  applyFilters() {
    const { seriesList, brandIdx, typeIdx, priceIdx, marketIdx, keyword } = this.data;
    const brand = BRAND_OPTIONS[brandIdx];
    const type = ROD_TYPE_OPTIONS[typeIdx].value;
    const price = this.data.prices[priceIdx].value;
    const market = MARKET_OPTIONS[marketIdx].value;
    const kw = keyword.trim().toLowerCase();

    let filtered = seriesList.filter(item => {
      // 品牌筛选
      if (brand !== '全部' && item.brand !== brand) return false;
      // 类型筛选（仅渔竿）
      if (type && item.type !== type) return false;
      // 价位筛选
      if (price !== 0 && item.price_tier !== price) return false;
      // 市场筛选
      if (market && item.market !== market) return false;
      // 关键词搜索 — 匹配系列名
      if (kw && !item.series_name.toLowerCase().includes(kw)) return false;
      return true;
    });

    this.setData({ filteredList: filtered });
  },

  // ──────────────────────────────────────────
  // 卡片点击 → 跳转详情
  // ──────────────────────────────────────────
  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/gear/gear-detail?id=${id}`,
    });
  },

  // ──────────────────────────────────────────
  // 初始化数据（数据库为空时）
  // ──────────────────────────────────────────
  async seedData() {
    wx.showLoading({ title: '初始化数据…', mask: true });
    try {
      const res = await wx.cloud.callFunction({ name: 'seedGearData' });
      if (res.result && res.result.success) {
        wx.showToast({
          title: `✅ 数据初始化成功`,
          icon: 'none',
          duration: 2000,
        });
        this.loadData();
      } else {
        throw new Error(res.result?.error || '未知错误');
      }
    } catch (err) {
      console.error('seedData 失败', err);
      wx.showToast({ title: '初始化失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  // ──────────────────────────────────────────
  // 工具方法：价格格式化（千分位）
  // ──────────────────────────────────────────
  formatPrice(price) {
    if (!price) return '';
    return price.toLocaleString('zh-CN');
  },
});
