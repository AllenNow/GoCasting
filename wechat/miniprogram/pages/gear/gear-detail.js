// pages/gear/gear-detail.js — 系列详情页
const app = getApp();

Page({
  data: {
    // 系列数据
    series: null,
    models: [],
    seriesId: '',

    // 页面状态
    loading: true,

    // 头图轮播
    swiperCurrent: 0,

    // 描述展开
    descExpanded: false,

    // 内部 Tab: 0=产品技术, 1=产品阵容/特性, 2=产品规格
    detailTab: 0,
    detailTabs: [],

    // 技术 Tab
    activeTechIdx: 0,

    // 规格表列配置
    specColumns: [],
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ seriesId: options.id });
      this._recordView(options.id);   // 记录浏览
      this.loadDetail(options.id);
    }
  },

  // 将浏览次数写入本地存储（key: gear_views）
  _recordView(seriesId) {
    try {
      const views = wx.getStorageSync('gear_views') || {};
      views[seriesId] = (views[seriesId] || 0) + 1;
      wx.setStorageSync('gear_views', views);
    } catch (e) {
      // 缓存读写失败不影响主流程
    }
  },

  // ──────────────────────────────────────────
  // 数据加载
  // ──────────────────────────────────────────
  async loadDetail(seriesId) {
    this.setData({ loading: true });
    try {
      const db = app.globalData.db;

      // 并行查询系列和型号
      const [seriesRes, modelsRes] = await Promise.all([
        db.collection('gear_series').where({ series_id: seriesId }).get(),
        db.collection('gear_models').where({ series_id: seriesId }).limit(100).get(),
      ]);

      if (seriesRes.data.length === 0) {
        wx.showToast({ title: '系列不存在', icon: 'error' });
        this.setData({ loading: false });
        return;
      }

      const series = seriesRes.data[0];
      const models = modelsRes.data;

      // 将所有 cloud:// 地址转换为临时 https URL
      console.log('[resolve] 开始转换 cloud:// 地址...');
      await this._resolveCloudUrls(series);
      console.log('[resolve] 转换完成, tech[0].image_url =', series.technologies && series.technologies[0] && series.technologies[0].image_url);

      // 设置导航栏标题
      wx.setNavigationBarTitle({ title: series.series_name });

      // 根据类别配置详情 Tab 和规格列
      const isReel = series.category === 'reel';
      const detailTabs = isReel
        ? ['产品技术', '产品阵容', '产品规格']
        : ['产品技术', '产品特性', '产品规格'];

      const specColumns = isReel
        ? this._getReelColumns()
        : this._getRodColumns();

      this.setData({
        series,
        models,
        detailTabs,
        specColumns,
        loading: false,
      });
    } catch (err) {
      console.error('加载系列详情失败', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
      this.setData({ loading: false });
    }
  },

  // ──────────────────────────────────────────
  // 头图轮播
  // ──────────────────────────────────────────
  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current });
  },

  onPreviewBanner(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  onPreviewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    if (urls && urls.length > 0) {
      wx.previewImage({ urls, current: current || urls[0] });
    }
  },

  // ──────────────────────────────────────────
  // 描述展开/收起
  // ──────────────────────────────────────────
  toggleDesc() {
    this.setData({ descExpanded: !this.data.descExpanded });
  },

  // ──────────────────────────────────────────
  // 详情 Tab 切换
  // ──────────────────────────────────────────
  onDetailTabChange(e) {
    this.setData({ detailTab: Number(e.currentTarget.dataset.idx) });
  },

  // ──────────────────────────────────────────
  // 产品技术
  // ──────────────────────────────────────────
  onTechTap(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({ activeTechIdx: idx });
  },

  onTechSwiperChange(e) {
    this.setData({ activeTechIdx: e.detail.current });
  },

  // ──────────────────────────────────────────
  // 产品阵容（渔轮）— 图片预览
  // ──────────────────────────────────────────
  onModelImageTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  // 点击"规格对比"按钮 → 切换到规格 Tab
  onGoToSpec() {
    this.setData({ detailTab: 2 });
  },

  // ──────────────────────────────────────────
  // 产品特性（渔竿）— 图片预览
  // ──────────────────────────────────────────
  onFeatureImageTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({ urls: [url], current: url });
    }
  },

  // ──────────────────────────────────────────
  // 规格列配置
  // ──────────────────────────────────────────
  _getRodColumns() {
    return [
      { key: 'model', label: '型号', sticky: true },
      { key: 'length_m', label: '全长(m)' },
      { key: 'pieces', label: '节数' },
      { key: 'closed_length_cm', label: '收竿长度(cm)' },
      { key: 'weight_g', label: '重量(g)' },
      { key: 'tip_diameter_mm', label: '先径(mm)' },
      { key: 'sinker_load', label: '铅坠负荷(号)' },
      { key: 'standard_sinker', label: '标准铅坠(号)' },
      { key: 'reel_seat_mm', label: '渔轮座(mm)' },
      { key: 'carbon_percent', label: '碳纤维(%)' },
      { key: 'price_cn', label: '参考价' },
    ];
  },

  _getReelColumns() {
    return [
      { key: 'model', label: '型号', sticky: true },
      { key: 'gear_ratio', label: '齿轮比' },
      { key: 'max_drag_kg', label: '最大耐久力(kg)' },
      { key: 'weight_g', label: '重量(g)' },
      { key: 'spool_spec', label: '线杯径/一转(mm)' },
      { key: 'line_capacity_nylon', label: '尼龙线容量(号-m)' },
      { key: 'line_capacity_pe', label: 'PE线容量(号-m)' },
      { key: 'max_retrieve_cm', label: '最大收线长(cm)' },
      { key: 'handle_length_mm', label: '手把长度(mm)' },
      { key: 'bearings', label: '培林数/罗拉' },
      { key: 'price_cn', label: '参考价' },
    ];
  },

  // ──────────────────────────────────────────
  // 补充资料点击
  // ──────────────────────────────────────────
  onDocTap(e) {
    const doc = e.currentTarget.dataset.doc;
    if (doc && doc.url) {
      wx.setClipboardData({
        data: doc.url,
        success: () => wx.showToast({ title: '链接已复制', icon: 'none' }),
      });
    }
  },

  // ──────────────────────────────────────────
  // 将 series 对象里所有 cloud:// 地址批量转换为临时 https URL
  // 开发者工具模拟器不支持 image src 直接使用 cloud://
  // ──────────────────────────────────────────
  async _resolveCloudUrls(series) {
    const isCloud = url => url && typeof url === 'string' && url.startsWith('cloud://');
    const cloudIds = new Set();
    console.log('[resolve] _resolveCloudUrls called, technologies count:', (series.technologies || []).length);

    if (isCloud(series.banner_image)) cloudIds.add(series.banner_image);
    (series.images || []).forEach(url => isCloud(url) && cloudIds.add(url));
    (series.technologies || []).forEach(t => {
      if (isCloud(t.logo_url))  cloudIds.add(t.logo_url);
      if (isCloud(t.image_url)) cloudIds.add(t.image_url);
    });
    (series.features || []).forEach(f => {
      if (isCloud(f.image_url)) cloudIds.add(f.image_url);
    });

    if (cloudIds.size === 0) return;

    let urlMap = {};
    try {
      const res = await wx.cloud.getTempFileURL({ fileList: Array.from(cloudIds) });
      console.log('[resolve] getTempFileURL res:', JSON.stringify(res.fileList));
      (res.fileList || []).forEach(item => {
        console.log('[resolve] fileID:', item.fileID, '| tempFileURL:', item.tempFileURL, '| errMsg:', item.errMsg);
        if (item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL;
        } else {
          // 权限不足时用本地占位图，便于开发阶段验证布局
          urlMap[item.fileID] = '/assets/images/placeholder_tech.png';
        }
      });
    } catch (e) {
      console.warn('[cloud] getTempFileURL 失败', e);
      return;
    }

    const resolve = url => (isCloud(url) && urlMap[url]) ? urlMap[url] : (url || '');

    if (series.banner_image) series.banner_image = resolve(series.banner_image);
    if (series.images)       series.images = series.images.map(resolve);
    if (series.technologies) {
      series.technologies = series.technologies.map(t =>
        Object.assign({}, t, { logo_url: resolve(t.logo_url), image_url: resolve(t.image_url) })
      );
    }
    if (series.features) {
      series.features = series.features.map(f =>
        Object.assign({}, f, { image_url: resolve(f.image_url) })
      );
    }
  },
});
