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
// 官方报价区间筛选
// 系列报价是“最低型号 ~ 最高型号”的区间，筛选按区间是否有交集匹配
const PRICE_OPTIONS = [
  { label: '全部',         value: 0, min: null, max: null },
  { label: '¥1,500 以下',  value: 1, min: null, max: 1500 },
  { label: '¥1,500–3,000', value: 2, min: 1500, max: 3000 },
  { label: '¥3,000–5,000', value: 3, min: 3000, max: 5000 },
  { label: '¥5,000–8,000', value: 4, min: 5000, max: 8000 },
  { label: '¥8,000 以上',  value: 5, min: 8000, max: null },
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
    prices: PRICE_OPTIONS,
    markets: MARKET_OPTIONS,

    // UI 状态
    loading: true,
    seeded: true,
    showTypePill: true, // 默认渔竿，显示类型筛选
    showFilterSheet: false,
    activeFilterCount: 0,
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
      showFilterSheet: false,
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
      //   次键：sort_order（升序）— 保持官方系列展示顺序
      //   三键：品牌字母（升序）
      const sorted = res.data.sort((a, b) => {
        const va = views[a.series_id] || 0;
        const vb = views[b.series_id] || 0;
        if (vb !== va) return vb - va;
        const sa = a.sort_order || 0;
        const sb = b.sort_order || 0;
        if (sa !== sb) return sa - sb;
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

  resetFilters() {
    this.setData({ brandIdx: 0, typeIdx: 0, priceIdx: 0, marketIdx: 0, keyword: '' });
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
    const priceBand = this.data.prices[priceIdx];
    const market = MARKET_OPTIONS[marketIdx].value;
    const kw = keyword.trim().toLowerCase();

    let filtered = seriesList.filter(item => {
      // 品牌筛选
      if (brand !== '全部' && item.brand !== brand) return false;
      // 类型筛选（仅渔竿）
      if (type && item.type !== type) return false;
      // 官方报价区间筛选：系列报价是区间，与所选区间有交集即命中
      if (priceBand.value !== 0) {
        const lo = item.price_min;
        const hi = item.price_max != null ? item.price_max : item.price_min;
        if (lo == null && hi == null) return false; // 无官方报价不参与价格筛选
        const low = lo == null ? hi : lo;
        const high = hi == null ? lo : hi;
        if (priceBand.max != null && low > priceBand.max) return false;
        if (priceBand.min != null && high < priceBand.min) return false;
      }
      // 市场筛选
      if (market && item.market !== market) return false;
      // 关键词搜索 — 匹配系列名
      if (kw && !item.series_name.toLowerCase().includes(kw)) return false;
      return true;
    });

    this.setData({ filteredList: filtered });

    // 筛选面板角标数量（不含关键词搜索）
    const activeFilterCount =
      (brandIdx > 0 ? 1 : 0) +
      (typeIdx > 0 ? 1 : 0) +
      (priceIdx > 0 ? 1 : 0) +
      (marketIdx > 0 ? 1 : 0);
    this.setData({ activeFilterCount });
  },

  // ──────────────────────────────────────────
  // 筛选面板
  // ──────────────────────────────────────────
  openFilterSheet() {
    this.setData({ showFilterSheet: true });
  },

  closeFilterSheet() {
    this.setData({ showFilterSheet: false });
  },

  noop() {},

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

  // 工具方法：价格格式化（千分位）
  formatPrice(price) {
    if (!price) return '';
    return price.toLocaleString('zh-CN');
  },
});
