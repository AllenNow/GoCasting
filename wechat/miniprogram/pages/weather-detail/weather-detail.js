// pages/weather-detail/weather-detail.js — 天气详情
// 从潮汐页右上角进入，聚合展示实况 / 24 小时 / 7 天 / 天文 / 预警 / 海洋潮汐
// 数据优先读客户端缓存，缺失再调云函数；下拉或点刷新可强制更新

const apiCache = require('../../utils/apiCache');

const DEFAULT_PLACE = { lat: 24.4798, lon: 118.0894, city: '厦门市' };
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const DIRS8 = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];

const pad2 = n => String(n).padStart(2, '0');

function dateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function safeDecode(v) {
  try { return decodeURIComponent(v); } catch (e) { return v; }
}

// 角度 → 八方位风向
function dirText(deg) {
  const v = Number(deg);
  if (!Number.isFinite(v)) return '';
  return `${DIRS8[Math.round((((v % 360) + 360) % 360) / 45) % 8]}风`;
}

// 天气文字 → emoji（逐小时和风/Open-Meteo 通用）
const WX_ICONS = [
  [/雷/, '⛈️'], [/暴雨|大雨/, '🌧️'], [/中雨|小雨|阵雨|雨/, '🌦️'],
  [/雪/, '🌨️'], [/雾|霾/, '🌫️'], [/阴/, '☁️'], [/多云|少云/, '⛅'], [/晴/, '☀️'],
];
function labelIcon(label) {
  const s = String(label || '');
  for (const [re, icon] of WX_ICONS) {
    if (re.test(s)) return icon;
  }
  return '🌤️';
}

function uvLabel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  if (n <= 2) return '弱';
  if (n <= 4) return '较弱';
  if (n <= 6) return '中等';
  if (n <= 9) return '强';
  return '很强';
}

function ageText(ts) {
  if (!ts) return '--';
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min <= 0) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

function durationText(min) {
  if (min == null || min <= 0) return '--';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}小时${m ? m + '分' : ''}` : `${m}分钟`;
}

function hhmmToMin(str) {
  const m = String(str || '').match(/(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

// 和风逐小时 + Open-Meteo 逐小时 → 未来 24 小时列表
function buildHourly(byDay) {
  if (!byDay) return [];
  const now = new Date();
  const todayKey = dateKey(now);
  const tomorrowKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const rows = [];
  [todayKey, tomorrowKey].forEach(key => {
    (byDay[key] || []).forEach(r => rows.push({ ...r, _key: key }));
  });
  const nowHour = now.getHours();
  return rows
    .filter(r => r._key !== todayKey || r.hour >= nowHour)
    .slice(0, 24)
    .map(r => ({
      key: `${r._key}-${r.hour}`,
      label: r._key === todayKey
        ? (r.hour === nowHour ? '现在' : `${pad2(r.hour)}时`)
        : `明 ${pad2(r.hour)}时`,
      icon: labelIcon(r.wmoLabel),
      wxLabel: r.wmoLabel || '--',
      temp: r.tempAir,
      precip: r.precip,
      pop: r.pop,
      windText: [
        r.windDirText || dirText(r.windDir),
        r.windScale != null ? `${r.windScale}级`
          : (r.windSpeed != null ? `${Math.round(r.windSpeed)}km/h` : ''),
      ].filter(Boolean).join(' ') || null,
      humidity: r.humidity,
      pressure: r.pressure,
      cloud: r.cloud,
      source: r.source || 'open_meteo',
    }));
}

// 潮型：验潮站按绝对潮差分档，模型数据在同源日内相对比较
function tideTypeOf(allDays, todayIdx) {
  const today = allDays[todayIdx];
  if (!today || today.tideLevelMax == null || today.tideLevelMin == null) return null;
  const range = parseFloat((today.tideLevelMax - today.tideLevelMin).toFixed(1));
  const srcOf = d => String(d.tideSource || 'model').indexOf('qweather') === 0 ? 'station' : 'model';

  if (srcOf(today) === 'station') {
    const label = range > 5 ? '大潮' : range >= 4 ? '中潮' : '小潮';
    return { label, range };
  }

  const sameSrc = allDays.filter(d =>
    srcOf(d) === 'model' && d.tideLevelMax != null && d.tideLevelMin != null
  );
  if (sameSrc.length < 5) return { label: '--', range };
  const ranges = sameSrc.map(d => d.tideLevelMax - d.tideLevelMin);
  const max = Math.max(...ranges);
  const min = Math.min(...ranges);
  const ratio = max > min ? (range - min) / (max - min) : 0.5;
  const label = ratio >= 0.66 ? '大潮' : ratio <= 0.33 ? '小潮' : '中潮';
  return { label, range };
}

// 未来 6 小时是否有降水（决定是否请求和风分钟级降水，避免无谓调用）
function needRainSoon(atmos, weather) {
  const byDay = (atmos && atmos.byDay) || {};
  const d = new Date();
  const hours = byDay[dateKey(d)] || [];
  const h0 = d.getHours();
  if (hours.some(h => h.hour >= h0 && h.hour <= h0 + 6 && (h.precip || 0) > 0)) return true;
  const descs = ((weather && weather.forecast) || []).slice(0, 2).map(f => f.desc || '').join('');
  return /雨|雪|雷/.test(descs);
}

Page({
  data: {
    loading: true,
    refreshing: false,
    errorMsg: '',
    city: '',

    current: null,        // 实况
    hourly: [],           // 未来 24 小时
    daily: [],            // 未来 7 天
    expandedDay: -1,
    astro: null,          // 日出日落 / 日照
    moonInfo: null,       // 月相 / 月升月落
    fishing: null,        // 钓鱼指数
    warnings: [],
    minutely: null,       // 分钟级降水
    marine: null,         // 潮汐与海况
    sources: [],          // 数据来源

    weatherAgeText: '--',
    marineAgeText: '--',
  },

  onLoad(options) {
    const lat = parseFloat(options && options.lat);
    const lon = parseFloat(options && options.lon);
    this._coords = Number.isFinite(lat) && Number.isFinite(lon)
      ? { lat, lon }
      : { lat: DEFAULT_PLACE.lat, lon: DEFAULT_PLACE.lon };
    this._city = options && options.city ? safeDecode(options.city) : DEFAULT_PLACE.city;
    this._times = {};
    this.setData({ city: this._city });
    this.loadAll(false);
  },

  onPullDownRefresh() {
    this.loadAll(true).finally(() => wx.stopPullDownRefresh());
  },

  refresh() {
    if (this.data.refreshing) return;
    this.loadAll(true).then(() => {
      wx.showToast({ title: '已刷新', icon: 'none' });
    });
  },

  toggleDay(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({ expandedDay: this.data.expandedDay === idx ? -1 : idx });
  },

  // ══════════════════════════════════════════════════════════
  // 数据加载：缓存优先，缺失再请求云端
  // ══════════════════════════════════════════════════════════
  async loadAll(force) {
    const { lat, lon } = this._coords;
    this.setData({ refreshing: !!force, errorMsg: '' });

    const keys = {
      weather: apiCache.geoKey('weather', lat, lon),
      atmos:   apiCache.geoKey('atmos', lat, lon),
      astro:   apiCache.geoKey('astro', lat, lon),
      indices: apiCache.geoKey('indices', lat, lon),
      now:     apiCache.geoKey('extra_now', lat, lon),
      marine:  apiCache.geoKey('marine', lat, lon),
    };
    this._keys = keys;

    const entries = {};
    Object.keys(keys).forEach(k => {
      entries[k] = force ? null : apiCache.getEntry(keys[k]);
    });

    // 旧版天气缓存不含详情字段：视为无效，重新拉取
    const wData = entries.weather && entries.weather.data;
    if (entries.weather && (!wData || !wData.current || wData.current.feelsLike === undefined)) {
      entries.weather = null;
    }

    let weather = entries.weather ? entries.weather.data : null;
    let atmos   = entries.atmos ? entries.atmos.data : null;
    let marine  = entries.marine ? entries.marine.data : null;
    // 跨天的海况缓存整体错一天，直接丢弃
    if (marine && !apiCache.isMarineToday(marine)) {
      apiCache.remove(keys.marine);
      marine = null;
      delete entries.marine;
    }
    let extra = {
      sun:      entries.astro ? entries.astro.data.sun : null,
      moon:     entries.astro ? entries.astro.data.moon : null,
      fishing:  entries.indices ? entries.indices.data.fishing : null,
      warnings: entries.now ? (entries.now.data.warnings || []) : [],
      minutely: entries.now ? (entries.now.data.minutely || null) : null,
    };
    if (entries.weather && entries.weather.cachedAt) this._times.weather = entries.weather.cachedAt;
    if (entries.marine && entries.marine.cachedAt)   this._times.marine = entries.marine.cachedAt;
    if (entries.astro && entries.astro.cachedAt)     this._times.astro = entries.astro.cachedAt;
    if (entries.indices && entries.indices.cachedAt) this._times.indices = entries.indices.cachedAt;
    if (entries.now && entries.now.cachedAt)         this._times.now = entries.now.cachedAt;

    // 有缓存先渲染，避免白屏
    if (weather || atmos || marine) {
      this._raw = { weather, atmos, marine, extra };
      this._render();
      this.setData({ loading: false });
    }
    const prevRaw = this._raw;

    // ── 组装缺失模块的请求 ──────────────────────────────────
    const needExtra = !entries.astro || !entries.indices || !entries.now;
    // 强制刷新时 atmos/weather 为空，用上一次数据判断是否需要分钟级降水
    const baseAtmos = atmos || (this._raw && this._raw.atmos);
    const baseWeather = weather || (this._raw && this._raw.weather);
    const needRain = needRainSoon(baseAtmos, baseWeather);
    const tasks = [];
    if (!weather) tasks.push({ key: 'weather', fn: wx.cloud.callFunction({ name: 'getWeather', data: { lat, lon } }) });
    if (!atmos)   tasks.push({ key: 'atmos',   fn: wx.cloud.callFunction({ name: 'getWeatherForecast', data: { lat, lon } }) });
    if (!marine)  tasks.push({ key: 'marine',  fn: wx.cloud.callFunction({ name: 'getMarineData', data: { lat, lon } }) });
    if (needExtra) {
      tasks.push({
        key: 'extra',
        fn: wx.cloud.callFunction({ name: 'getWeatherExtra', data: { lat, lon, needRain } }),
      });
    }

    if (!tasks.length) {
      this.setData({ loading: false, refreshing: false });
      return;
    }

    try {
      const results = await Promise.allSettled(tasks.map(t => t.fn));
      results.forEach((r, i) => {
        const key = tasks[i].key;
        if (r.status !== 'fulfilled') return;
        const res = r.value.result || {};
        if (!res.success || !res.data) return;
        const d = res.data;
        const cachedAt = res._fromCache && res._cachedAt ? new Date(res._cachedAt).getTime() : Date.now();

        if (key === 'weather') {
          weather = d;
          apiCache.set(keys.weather, d, apiCache.TTL.weather_live);
          this._times.weather = cachedAt;
        } else if (key === 'atmos') {
          atmos = d;
          apiCache.set(keys.atmos, d, apiCache.TTL.atmos);
          this._times.atmos = cachedAt;
        } else if (key === 'marine') {
          if (this._isValidMarine(d)) {
            marine = d;
            if (apiCache.isMarineToday(d)) apiCache.set(keys.marine, d, apiCache.TTL.marine);
            this._times.marine = cachedAt;
          }
        } else if (key === 'extra') {
          if (d.source === 'none') return;
          extra = {
            sun:      d.sun || extra.sun,
            moon:     d.moon || extra.moon,
            fishing:  d.fishing || extra.fishing,
            warnings: Array.isArray(d.warnings) ? d.warnings : extra.warnings,
            minutely: d.minutely !== undefined ? d.minutely : extra.minutely,
          };
          const at = d.cachedAt || {};
          const flag = res._cache || {};
          if (d.sun || d.moon) {
            apiCache.set(keys.astro, { sun: d.sun, moon: d.moon }, apiCache.TTL.astro);
            this._times.astro = flag.astro === false ? Date.now() : (at.astro ? new Date(at.astro).getTime() : Date.now());
          }
          if (d.fishing) {
            apiCache.set(keys.indices, { fishing: d.fishing }, apiCache.TTL.indices);
            this._times.indices = flag.indices === false ? Date.now() : (at.indices ? new Date(at.indices).getTime() : Date.now());
          }
          apiCache.set(keys.now, {
            warnings: extra.warnings,
            minutely: extra.minutely,
            minutelyRequested: needRain,
          }, apiCache.TTL.extra_now);
          this._times.now = flag.now === false ? Date.now() : (at.now ? new Date(at.now).getTime() : Date.now());
        }
      });

      if (!weather && !atmos && !marine) {
        if (prevRaw) {
          this.setData({ errorMsg: '刷新失败，当前显示上次数据' });
        } else {
          this._raw = { weather, atmos, marine, extra };
          this._render();
          this.setData({ errorMsg: '天气数据加载失败，请下拉刷新重试' });
        }
      } else {
        this._raw = { weather, atmos, marine, extra };
        this._render();
      }
    } catch (e) {
      console.warn('[weather-detail] 加载失败:', e && (e.errMsg || e.message));
      if (!this.data.current) this.setData({ errorMsg: '天气数据加载失败，请下拉刷新重试' });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  _isValidMarine(d) {
    return !!(d && d.currentData && Array.isArray(d.allDays) && d.allDays.length > 0);
  },

  // ══════════════════════════════════════════════════════════
  // 视图组装
  // ══════════════════════════════════════════════════════════
  _render() {
    const { weather, atmos, marine, extra } = this._raw || {};
    const w = weather || {};
    const c = w.current || null;

    const current = c ? {
      temp:       c.temp != null && c.temp !== '' ? c.temp : null,
      desc:       c.desc || '',
      feelsLike:  c.feelsLike != null ? c.feelsLike : null,
      humidity:   c.humidity != null ? c.humidity : null,
      windText:   [
        c.windDir || '',
        c.windScale != null ? `${c.windScale}级` : '',
      ].filter(Boolean).join(' ') || null,
      windSpeed:  c.windSpeed != null ? c.windSpeed : null,
      pressure:   c.pressure != null ? c.pressure : null,
      visibility: c.visibility && c.visibility !== '—' ? c.visibility : (c.vis != null ? c.vis : null),
      cloud:      c.cloud != null ? c.cloud : null,
      precip:     c.precip != null ? c.precip : null,
      dew:        c.dew != null ? c.dew : null,
      obsTime:    c.obsTime || '',
    } : null;

    const hourly = buildHourly(atmos && atmos.byDay);

    const daily = (w.forecast || []).map(f => ({
      ...f,
      dateLabel: f.dateStr ? `${Number(f.dateStr.slice(5, 7))}/${Number(f.dateStr.slice(8, 10))}` : '',
      week: f.dateStr ? WEEK[new Date(`${f.dateStr}T12:00:00`).getDay()] : '',
      uvLabel: uvLabel(f.uvIndex),
      windText: [
        f.windDirDay || '',
        f.windScaleDay ? `${f.windScaleDay}级` : '',
      ].filter(Boolean).join(' ') || '',
    }));

    // ── 天文 ──────────────────────────────────────────────
    const sun = extra && extra.sun;
    let astro = null;
    if (sun && (sun.sunrise || sun.sunset)) {
      const sr = hhmmToMin(sun.sunrise);
      const ss = hhmmToMin(sun.sunset);
      astro = {
        sunrise: sun.sunrise || '--',
        sunset:  sun.sunset || '--',
        dayLength: sr != null && ss != null && ss > sr ? durationText(ss - sr) : '--',
      };
    }

    const moon = extra && extra.moon;
    let moonInfo = null;
    if (moon) {
      const phase = moon.phase || {};
      const illum = phase.illum != null
        ? `${Math.round(phase.illum <= 1 ? phase.illum * 100 : phase.illum)}%`
        : null;
      moonInfo = {
        rise:  moon.moonrise || '--',
        set:   moon.moonset || '--',
        name:  phase.name || '--',
        icon:  phase.icon || '🌙',
        illum,
      };
    }

    // ── 海洋与潮汐 ────────────────────────────────────────
    let marineView = null;
    if (this._isValidMarine(marine)) {
      const cd = marine.currentData || {};
      const meta = marine.tideMeta || {};
      const days = marine.allDays || [];
      const today = days[marine.todayIdx] || {};
      const type = tideTypeOf(days, marine.todayIdx);
      const isStation = cd.seaLevelDatum
        ? cd.seaLevelDatum === 'station'
        : meta.datum === 'station';
      marineView = {
        seaLevel:     cd.seaLevelMSL,
        tideState:    cd.tideState || null,
        tideType:     type ? type.label : '--',
        tideRange:    type ? type.range : null,
        waveHeight:   cd.waveHeight,
        waveDesc:     cd.waveDesc || '',
        swellWaveHeight: cd.swellWaveHeight,
        windWaveHeight:  cd.windWaveHeight,
        wavePeriod:   cd.wavePeriod,
        waveDir:      cd.waveDirectionStr,
        sst:          cd.sst,
        currentVelocity:    cd.currentVelocity,
        currentDirectionStr: cd.currentDirectionStr,
        extremes:     today.extremes || [],
        sourceLabel:  meta.label || '--',
        siteName:     meta.siteName || '',
        distanceKm:   meta.distanceKm != null ? meta.distanceKm : null,
        datumNote: isStation
          ? `潮高采用${meta.siteName || '验潮站'}当地基准面${meta.distanceKm != null ? `（距当前位置约 ${meta.distanceKm}km）` : ''}，与 MSL 平均海平面不可直接对比`
          : '潮高为 MSL 平均海平面基准，与港口潮汐表基准不同，数值不可直接对比',
      };
    }

    // ── 数据来源 ─────────────────────────────────────────
    const sources = [];
    if (weather) {
      sources.push({
        name: w.source === 'qweather' ? '和风天气' : '高德天气',
        detail: '实况 · 7 天预报',
      });
    }
    if (hourly.length) {
      sources.push({
        name: hourly.some(h => h.source === 'qweather') ? '和风天气 + Open-Meteo' : 'Open-Meteo',
        detail: '逐小时天气 · 气压 · 风 · 降水',
      });
    }
    if (extra && (extra.sun || extra.moon || extra.fishing)) {
      sources.push({ name: '和风天气', detail: '天文 · 生活指数' });
    }
    if (marineView) {
      sources.push({
        name: marineView.siteName ? `和风验潮站 ${marineView.siteName}` : 'Open-Meteo Marine',
        detail: '潮汐 · 海况',
      });
    }

    const minutely = extra && extra.minutely ? {
      summary: extra.minutely.summary || '',
      hasRain: !!extra.minutely.hasRain,
      nextRainMin: extra.minutely.nextRainMin,
    } : null;

    this.setData({
      current,
      hourly,
      daily,
      astro,
      moonInfo,
      fishing: (extra && extra.fishing) || null,
      warnings: (extra && extra.warnings) || [],
      minutely,
      marine: marineView,
      sources,
      weatherAgeText: ageText(this._times.weather || this._times.atmos),
      marineAgeText:  ageText(this._times.marine),
      errorMsg: '',
    });
  },
});
