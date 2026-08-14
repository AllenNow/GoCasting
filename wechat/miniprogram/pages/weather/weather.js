// pages/weather/weather.js — 潮汐+海洋仪表板
// 功能：6区块展示 + 地点切换（搜索/定位/收藏）+ 客户端/云端双层缓存
// 新增：鱼口预测（逐小时评分热力图 + 最佳垂钓窗口）

const app = getApp();
const apiCache    = require('../../utils/apiCache');
const savedPlaces = require('../../utils/savedPlaces');
const fishScore   = require('../../utils/fishScore');

// ══════════════════════════════════════════════════════════════
// 纯函数工具
// ══════════════════════════════════════════════════════════════

function calcFishScore({ tideState, waveHeight, sst, weather }) {
  let score = 5;
  if (tideState === 'rising' || tideState === 'falling') score += 2;
  if (waveHeight != null) {
    if (waveHeight < 0.5)      score += 1;
    else if (waveHeight > 2.5) score -= 4;
    else if (waveHeight > 1.5) score -= 2;
  }
  if (sst != null) {
    if (sst >= 18 && sst <= 28)    score += 1;
    else if (sst < 10 || sst > 32) score -= 2;
  }
  if (weather) {
    const desc = weather.desc || '';
    if (desc.includes('晴') || desc.includes('多云')) score += 1;
    if (desc.includes('暴雨') || desc.includes('雷'))  score -= 3;
    else if (desc.includes('雨'))                      score -= 1;
    const wind = parseFloat(weather.wind_speed) || 0;
    if (wind > 10) score -= 2;
    else if (wind < 4) score += 0.5;
  }
  return Math.max(0, Math.min(10, Math.round(score)));
}

function scoreLabel(s) {
  if (s >= 9) return '🏆 绝佳出钓！';
  if (s >= 7) return '🎣 非常适合';
  if (s >= 5) return '👍 适合出钓';
  if (s >= 3) return '🤔 条件一般';
  return '❌ 不建议出钓';
}

function buildChartPoints(tideChart24h) {
  if (!tideChart24h || tideChart24h.length === 0) return { points: [], segments: [] };
  const levels = tideChart24h.map(t => t.level).filter(v => v != null);
  if (!levels.length) return { points: [], segments: [] };
  const minL = Math.min(...levels), maxL = Math.max(...levels);
  const range = maxL - minL || 1;
  const PAD = 10;
  const points = tideChart24h.map((t, i) => ({
    x: parseFloat(((i / (tideChart24h.length - 1)) * 100).toFixed(2)),
    y: parseFloat((PAD + (1 - (t.level - minL) / range) * (100 - PAD * 2)).toFixed(2)),
    timeStr: t.timeStr, level: t.level,
  }));
  const ASPECT = 240 / 650;
  const segments = points.slice(0, -1).map((p1, i) => {
    const p2 = points[i + 1];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    return { x: p1.x, y: p1.y, w: parseFloat(dx.toFixed(2)), angle: parseFloat((Math.atan2(dy * ASPECT, dx) * 180 / Math.PI).toFixed(2)) };
  });
  return { points, segments };
}

function markExtremePoints(chartPoints, extremes) {
  return extremes.map(ext => {
    const match = chartPoints.reduce((best, pt) =>
      Math.abs(pt.level - ext.level) < Math.abs((best?.level ?? 999) - ext.level) ? pt : best, null);
    return match ? { ...ext, x: match.x, y: match.y } : null;
  }).filter(Boolean);
}

function build48hLinePoints(hourlyForecast48h, field) {
  if (!hourlyForecast48h?.length) return [];
  const vals = hourlyForecast48h.map(t => t[field]).filter(v => v != null);
  if (!vals.length) return [];
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 0.1;
  return hourlyForecast48h.map((t, i) => ({
    x: parseFloat(((i / (hourlyForecast48h.length - 1)) * 100).toFixed(2)),
    y: parseFloat((100 - (((t[field] - minV) / range) * 70 + 15)).toFixed(2)),
    val: t[field], timeStr: t.timeStr, date: t.date,
  }));
}

// ══════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════
Page({
  data: {
    // ── 页面状态 ──────────────────────────────────────────
    loading: true,
    marineLoaded: false,
    weatherLoaded: false,
    errorMsg: '',
    cacheHint: '',

    // ── 当前地点 ──────────────────────────────────────────
    // activePlace: null = 使用定位；否则 { name, lat, lon, address, typeIcon }
    activePlace: null,
    city: '定位中…',
    isLocating: false,      // 正在定位中（转圈动画）

    // ── 地点选择面板 ──────────────────────────────────────
    placePanel: false,       // 面板是否展开
    searchKeyword: '',
    searchLoading: false,
    searchResults: [],       // 搜索结果列表
    savedList: [],           // 收藏列表（从 Storage 读取）
    savedMax: savedPlaces.MAX_COUNT,

    // ── 评分 ──────────────────────────────────────────────
    fishScore: 5,
    fishScoreLabel: '加载中…',
    currentData: null,

    // ── 折线图 ────────────────────────────────────────────
    tideChart24h: [],
    chartPoints: [],
    chartSegments: [],
    extremePoints: [],
    chartMinLevel: 0,
    chartMaxLevel: 0,
    currentPointX: 0,

    // ── 探针 ──────────────────────────────────────────────
    probeVisible: false,
    probeX: 50,
    probeTooltip: null,
    probePointY: 50,

    // ── 高低潮 ────────────────────────────────────────────
    todayExtremes: [],
    tomorrowExtremes: [],

    // ── 48h浪况 ──────────────────────────────────────────
    hourlyForecast48h: [],
    wave48hPoints: [],
    swell48hPoints: [],
    tide48hPoints: [],

    // ── 7天日历 → 14天日历 ───────────────────────────────
    allDays: [],            // 14天完整数据（-7~+6）
    todayIdx: 7,            // 今天在 allDays 中的索引
    selectedDayIdx: 7,      // 当前选中的天（默认今天）
    selectedDayData: null,  // 选中天的详情（tideChart/extremes/hourly）
    // 选中天的折线图（独立于首屏折线图，避免互相覆盖）
    dayChartPoints: [],
    dayChartSegments: [],
    dayExtremePoints: [],
    dayChartMinLevel: 0,
    dayChartMaxLevel: 0,
    dayWave24hPoints: [],   // 选中天24h浪高折线
    dayCurrentPointX: 0,    // 选中天当前时刻游标（仅今天显示）
    dailyForecast: [],

    // ── 鱼口预测 ─────────────────────────────────────────
    atmosByDay: {},         // { "YYYY-MM-DD": [{hour,pressure,wmoScore,...}] }
    dayFishHeatmap: [],     // 选中天逐小时热力图 [{hour,score,grade,color,heightPct}]
    dayBestWindows: [],     // 选中天最佳垂钓窗口 [{startTime,endTime,duration,avgScore,reason}]
    dayGrade: null,         // 选中天综合评级 {grade,label,color,emoji,avgScore}

    // ── 天气 ──────────────────────────────────────────────
    weather: null,
    forecast: [],
    gangHaiScore: 0,

    // ── 缓存状态 ──────────────────────────────────────────
    marineFromCache: false,
    weatherFromCache: false,
  },

  onLoad() {
    // 读取收藏列表
    this.setData({ savedList: savedPlaces.getAll() });
    this.loadAll();
  },

  onShow() {
    // 同步自定义 tabBar 高亮状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  onPullDownRefresh() {
    apiCache.invalidateAll();
    this.loadAll(true).finally(() => wx.stopPullDownRefresh());
  },

  // ══════════════════════════════════════════════════════════
  // 核心加载
  // ══════════════════════════════════════════════════════════
  async loadAll(forceRefresh = false) {
    this.setData({ loading: true, errorMsg: '', cacheHint: '' });

    // 确定坐标来源：收藏地点 or 定位
    let lat, lon, displayCity;
    const { activePlace } = this.data;

    if (activePlace) {
      // 使用选定地点坐标
      ({ lat, lon } = activePlace);
      displayCity = activePlace.name;
    } else {
      // GPS 定位
      this.setData({ isLocating: true, city: '定位中…' });
      try {
        const pos = await this._getLocation();
        lat = pos.latitude;
        lon = pos.longitude;
        displayCity = null;  // 由 getWeather 返回城市名
      } catch (err) {
        this.setData({ loading: false, isLocating: false, errorMsg: '无法获取位置，请检查定位权限或选择地点' });
        return;
      }
      this.setData({ isLocating: false });
    }

    // ── 本地缓存 key ──────────────────────────────────────
    const marineKey  = apiCache.geoKey('marine',  lat, lon);
    const weatherKey = apiCache.geoKey('weather', lat, lon);
    const atmosKey   = `atmos_${lat.toFixed(2)}_${lon.toFixed(2)}`;

    const cachedMarine  = forceRefresh ? null : apiCache.get(marineKey);
    const cachedWeather = forceRefresh ? null : apiCache.get(weatherKey);
    const cachedAtmos   = forceRefresh ? null : apiCache.get(atmosKey);

    // ── 并行调云函数（仅未命中的）────────────────────────
    const tasks = [];
    if (!cachedMarine)  tasks.push({ key: 'marine',  fn: wx.cloud.callFunction({ name: 'getMarineData',       data: { lat, lon } }) });
    if (!cachedWeather) tasks.push({ key: 'weather', fn: wx.cloud.callFunction({ name: 'getWeather',          data: { lat, lon } }) });
    if (!cachedAtmos)   tasks.push({ key: 'atmos',   fn: wx.cloud.callFunction({ name: 'getWeatherForecast', data: { lat, lon } }) });

    let freshMarine = null, freshWeather = null, freshAtmos = null;
    if (tasks.length) {
      const results = await Promise.allSettled(tasks.map(t => t.fn));
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.result?.success) {
          const d = r.value.result.data;
          if (tasks[i].key === 'marine') {
            freshMarine = d;
            apiCache.set(marineKey, d, apiCache.TTL.marine);
          } else if (tasks[i].key === 'weather') {
            freshWeather = d;
            apiCache.set(weatherKey, d, apiCache.TTL.weather_live);
          } else if (tasks[i].key === 'atmos') {
            freshAtmos = d;
            apiCache.set(atmosKey, d, apiCache.TTL.marine);  // 同1小时TTL
          }
        }
      });
    }

    const marineData  = freshMarine  || cachedMarine;
    const weatherData = freshWeather || cachedWeather;
    const atmosData   = freshAtmos   || cachedAtmos;
    const marineFromCache  = !freshMarine  && !!cachedMarine;
    const weatherFromCache = !freshWeather && !!cachedWeather;

    // ── 应用数据 ──────────────────────────────────────────
    if (marineData) {
      this._applyMarineData(marineData, atmosData);
    } else {
      this.setData({ errorMsg: '海洋数据加载失败，请下拉刷新重试' });
    }

    if (weatherData) {
      const city = displayCity || weatherData.city;
      this.setData({ city, weather: weatherData.current, forecast: weatherData.forecast, weatherLoaded: true });
      this._recalcFishScore();
    } else {
      this.setData({ city: displayCity || '当前位置' });
    }

    // 缓存提示
    let cacheHint = '';
    if (marineFromCache || weatherFromCache) {
      const stats  = apiCache.getStats();
      const mStat  = stats.find(s => s.key?.includes('marine'));
      if (mStat?.remainMs > 0) {
        const agoMin = Math.round((apiCache.TTL.marine - mStat.remainMs) / 60000);
        cacheHint = `缓存数据 · ${agoMin > 0 ? agoMin + '分钟前' : '刚刚'}更新`;
      } else {
        cacheHint = '使用缓存数据';
      }
    }

    this.setData({ loading: false, marineFromCache, weatherFromCache, cacheHint });
  },

  _applyMarineData(d, atmosData) {
    const {
      currentData, tideChart24h, todayExtremes, tomorrowExtremes,
      dailyForecast, hourlyForecast48h,
      allDays = [], todayIdx = 0,
    } = d;

    const { points: chartPoints, segments: chartSegments } = buildChartPoints(tideChart24h);
    const levels = tideChart24h.map(t => t.level).filter(v => v != null);
    const extremePoints  = markExtremePoints(chartPoints, todayExtremes);
    const nowHour        = new Date().getHours();
    const msl            = currentData?.seaLevelMSL ?? 0;

    // 大气数据按日期分组存储
    const atmosByDay = atmosData?.byDay || {};

    this.setData({
      currentData, tideChart24h, chartPoints, chartSegments, extremePoints,
      chartMinLevel:  levels.length ? parseFloat(Math.min(...levels).toFixed(2)) : 0,
      chartMaxLevel:  levels.length ? parseFloat(Math.max(...levels).toFixed(2)) : 0,
      currentPointX:  parseFloat(((nowHour / 23) * 100).toFixed(1)),
      todayExtremes, tomorrowExtremes, dailyForecast, hourlyForecast48h,
      wave48hPoints:  build48hLinePoints(hourlyForecast48h, 'waveHeight'),
      swell48hPoints: build48hLinePoints(hourlyForecast48h, 'swellHeight'),
      tide48hPoints:  build48hLinePoints(hourlyForecast48h, 'tideLevel'),
      gangHaiScore:   msl < -0.8 ? 5 : msl < -0.5 ? 4 : msl < -0.2 ? 3 : msl < 0.2 ? 2 : 1,
      marineLoaded: true,
      allDays, todayIdx,
      selectedDayIdx: todayIdx,
      atmosByDay,
    });

    this._applyDayChart(todayIdx, allDays, nowHour, atmosByDay);
    this._recalcFishScore();
    this._chartRect = null;
  },

  _recalcFishScore() {
    const { currentData, weather } = this.data;
    const score = calcFishScore({
      tideState:  currentData?.tideState?.value,
      waveHeight: currentData?.waveHeight,
      sst:        currentData?.sst,
      weather,
    });
    this.setData({ fishScore: score, fishScoreLabel: scoreLabel(score) });
  },

  async _getLocation() {
    const setting = await new Promise(r =>
      wx.getSetting({ success: r, fail: () => r({ authSetting: {} }) })
    );
    if (!setting.authSetting['scope.userLocation']) {
      await new Promise((res, rej) =>
        wx.authorize({ scope: 'scope.userLocation', success: res, fail: rej })
      );
    }
    return new Promise((res, rej) =>
      wx.getLocation({ type: 'gcj02', success: res, fail: rej })
    );
  },

  // ══════════════════════════════════════════════════════════
  // 地点面板
  // ══════════════════════════════════════════════════════════

  openPlacePanel() {
    this.setData({
      placePanel: true,
      searchKeyword: '',
      searchResults: [],
      savedList: savedPlaces.getAll(),
    });
  },

  closePlacePanel() {
    this.setData({ placePanel: false, searchResults: [], searchKeyword: '' });
  },

  // 遮罩点击关闭
  onMaskTap() {
    this.closePlacePanel();
  },

  // 防止面板内点击穿透
  onPanelTap() {},

  // ── 搜索输入（防抖 400ms）────────────────────────────────
  onSearchInput(e) {
    const kw = e.detail.value || '';
    this.setData({ searchKeyword: kw });
    clearTimeout(this._searchTimer);
    if (!kw.trim()) {
      this.setData({ searchResults: [] });
      return;
    }
    this._searchTimer = setTimeout(() => this._doSearch(kw.trim()), 400);
  },

  onSearchConfirm(e) {
    const kw = e.detail.value?.trim();
    if (kw) this._doSearch(kw);
  },

  async _doSearch(kw) {
    this.setData({ searchLoading: true, searchResults: [] });
    try {
      const res = await wx.cloud.callFunction({
        name: 'searchPlace',
        data: { keyword: kw },
      });
      if (res.result?.success) {
        // 补充 isSaved 标记
        const results = (res.result.data.results || []).map(p => ({
          ...p,
          isSaved: savedPlaces.isSaved(p),
        }));
        this.setData({ searchResults: results });
      } else {
        this.setData({ searchResults: [] });
        wx.showToast({ title: '搜索失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: '搜索出错', icon: 'none' });
    } finally {
      this.setData({ searchLoading: false });
    }
  },

  // ── 选择地点（搜索结果 or 收藏）─────────────────────────
  selectPlace(e) {
    const place = e.currentTarget.dataset.place;
    if (!place?.lat || !place?.lon) return;
    this.setData({
      activePlace: place,
      placePanel: false,
      searchResults: [],
      searchKeyword: '',
      city: place.name,
    });
    // 清除旧缓存（新坐标，缓存key不同，本质不影响，但清一下更干净）
    apiCache.invalidateByName('marine');
    apiCache.invalidateByName('weather');
    this.loadAll();
  },

  // ── 使用当前定位 ─────────────────────────────────────────
  useCurrentLocation() {
    this.setData({
      activePlace: null,
      placePanel: false,
      searchResults: [],
      searchKeyword: '',
    });
    this.loadAll();
  },

  // ── 收藏/取消收藏 ────────────────────────────────────────
  toggleSave(e) {
    const place = e.currentTarget.dataset.place;
    if (!place) return;
    let newList;
    if (savedPlaces.isSaved(place)) {
      const id = savedPlaces.getSavedId(place);
      newList = savedPlaces.remove(id);
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      newList = savedPlaces.add(place);
      wx.showToast({ title: '已收藏', icon: 'success' });
    }
    // 更新搜索结果里的 isSaved 状态
    const searchResults = this.data.searchResults.map(p => ({ ...p, isSaved: savedPlaces.isSaved(p) }));
    this.setData({ savedList: newList, searchResults });
  },

  // ── 删除收藏 ─────────────────────────────────────────────
  removeSaved(e) {
    const id = e.currentTarget.dataset.id;
    const newList = savedPlaces.remove(id);
    this.setData({ savedList: newList });
  },

  // ══════════════════════════════════════════════════════════
  // 14天日历
  // ══════════════════════════════════════════════════════════

  selectDay(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    if (isNaN(idx)) return;
    const { allDays, todayIdx, atmosByDay } = this.data;
    this.setData({ selectedDayIdx: idx });
    this._applyDayChart(idx, allDays, idx === todayIdx ? new Date().getHours() : -1, atmosByDay);
  },

  // 计算选中天的折线图 + 极值 + 浪况趋势 + 鱼口评分
  _applyDayChart(idx, allDays, currentHour = -1, atmosByDay = {}) {
    const day = allDays[idx];
    if (!day) return;

    const tideChart = day.tideChart || [];
    const extremes  = day.extremes  || [];
    const hourly    = day.hourly    || [];

    // 折线图
    const { points, segments } = buildChartPoints(tideChart);
    const levels = tideChart.map(t => t.level).filter(v => v != null);
    const extremePoints = markExtremePoints(points, extremes);
    const dayWave24hPoints = build48hLinePoints(hourly, 'waveHeight');
    const dayCurrentPointX = currentHour >= 0
      ? parseFloat(((currentHour / 23) * 100).toFixed(1)) : -1;

    // ── 鱼口评分 ──────────────────────────────────────────
    const atmosHourly = atmosByDay[day.date] || [];
    const { heatmap, bestWindows, dayGrade } = fishScore.calcDayScores(hourly, atmosHourly);

    this.setData({
      selectedDayData:  day,
      dayChartPoints:   points,
      dayChartSegments: segments,
      dayExtremePoints: extremePoints,
      dayChartMinLevel: levels.length ? parseFloat(Math.min(...levels).toFixed(2)) : 0,
      dayChartMaxLevel: levels.length ? parseFloat(Math.max(...levels).toFixed(2)) : 0,
      dayWave24hPoints,
      dayCurrentPointX,
      // 鱼口
      dayFishHeatmap:  heatmap,
      dayBestWindows:  bestWindows,
      dayGrade,
    });
    this.setData({ probeVisible: false });
    this._chartRect = null;
  },

  // ══════════════════════════════════════════════════════════
  // 探针游标
  // ══════════════════════════════════════════════════════════
  onChartTouchStart(e) { this._chartProbeUpdate(e); },
  onChartTouchMove(e)  { this._chartProbeUpdate(e); },
  onChartTouchEnd() {
    clearTimeout(this._probeHideTimer);
    this._probeHideTimer = setTimeout(() => this.setData({ probeVisible: false }), 1500);
  },

  _chartProbeUpdate(e) {
    const touch = e.touches[0];
    if (!touch) return;
    // 优先使用选中天的数据（日历模式），否则用今日数据
    const { selectedDayData, tideChart24h, dayChartPoints, chartPoints } = this.data;
    const tideChart = selectedDayData?.tideChart?.length ? selectedDayData.tideChart : tideChart24h;
    const cPoints   = dayChartPoints?.length ? dayChartPoints : chartPoints;
    if (!tideChart?.length) return;
    clearTimeout(this._probeHideTimer);

    const doUpdate = (rect) => {
      if (!rect) return;
      const xPct = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const n = tideChart.length - 1;
      const rawIdx = (xPct / 100) * n;
      const i0 = Math.min(Math.floor(rawIdx), n - 1);
      const i1 = i0 + 1;
      const frac = rawIdx - i0;
      const d0 = tideChart[i0], d1 = tideChart[i1];
      const level = d0.level + (d1.level - d0.level) * frac;
      const t0m = parseInt(d0.timeStr.split(':')[0]) * 60 + parseInt(d0.timeStr.split(':')[1]);
      const t1m = parseInt(d1.timeStr.split(':')[0]) * 60 + parseInt(d1.timeStr.split(':')[1]);
      const tMin = t0m + (t1m - t0m) * frac;
      const timeStr = `${String(Math.floor(tMin / 60) % 24).padStart(2,'0')}:${String(Math.round(tMin % 60)).padStart(2,'0')}`;
      const slope = d1.level - d0.level;
      const cp0 = cPoints[i0], cp1 = cPoints[Math.min(i1, cPoints.length - 1)];
      this.setData({
        probeVisible: true,
        probeX: parseFloat(xPct.toFixed(1)),
        probePointY: cp0 && cp1 ? parseFloat((cp0.y + (cp1.y - cp0.y) * frac).toFixed(1)) : 50,
        probeTooltip: {
          timeStr, level: parseFloat(level.toFixed(2)),
          tideState: slope > 0.05 ? '⬆ 涨潮' : slope < -0.05 ? '⬇ 退潮' : '— 平潮',
          hourIdx: i0,
        },
      });
    };

    if (this._chartRect) {
      doUpdate(this._chartRect);
    } else {
      wx.createSelectorQuery()
        .select('.tide-chart-body')
        .boundingClientRect(rect => { this._chartRect = rect; doUpdate(rect); })
        .exec();
    }
  },

  // ══════════════════════════════════════════════════════════
  // 跳转
  // ══════════════════════════════════════════════════════════
  goMap()    { wx.switchTab({ url: '/pages/spot-map/spot-map' }); },
  goRecord() { wx.navigateTo({ url: '/pages/catch-log/catch-log' }); },
});
