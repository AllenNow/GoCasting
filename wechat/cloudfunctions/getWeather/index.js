// cloudfunctions/getWeather/index.js
// 云函数：调用腾讯地图位置服务 + 天气信息
// 在云端运行，不受小程序端域名白名单限制

const cloud = require('wx-server-sdk');
const fetch = require('node-fetch');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 腾讯位置服务 Web Key（替换为你的真实 Key）
// 申请地址：https://lbs.qq.com/dev/console/application/mine
// 创建应用 → 添加 Key → 产品选「WebServiceAPI」
const QQ_MAP_KEY = 'YOUR_QQ_MAP_KEY_HERE';

// 天气描述 → emoji
const WEATHER_ICONS = {
  '晴':   '☀️', '多云': '⛅', '阴': '☁️',
  '小雨': '🌦️', '中雨': '🌧️', '大雨': '🌧️',
  '暴雨': '⛈️', '雷阵雨': '⛈️', '雪': '❄️',
  '大雪': '🌨️', '雾': '🌫️', '霾': '😷',
  '阵雨': '🌦️',
};

function weatherIcon(desc) {
  for (const [k, v] of Object.entries(WEATHER_ICONS)) {
    if (desc && desc.includes(k)) return v;
  }
  return '🌤️';
}

exports.main = async (event, context) => {
  const { lat, lon } = event;

  try {
    // Step 1：腾讯地图逆地理编码获取城市
    const geoUrl = `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lon}&key=${QQ_MAP_KEY}&get_poi=0`;
    const geoRes  = await fetch(geoUrl).then(r => r.json());
    const adInfo  = geoRes?.result?.ad_info;
    const city    = adInfo?.city || adInfo?.district || adInfo?.province || '未知城市';
    const cityId  = adInfo?.adcode || '';

    // Step 2：腾讯天气 API — 实况
    const liveUrl = `https://apis.map.qq.com/ws/weather/v1/?province=${encodeURIComponent(adInfo?.province || '')}&city=${encodeURIComponent(city)}&key=${QQ_MAP_KEY}`;
    const liveRes = await fetch(liveUrl).then(r => r.json());
    const observe = liveRes?.result?.observe;

    const current = observe ? {
      temp:       observe.degree,
      desc:       observe.weather,
      humidity:   observe.humidity,
      wind_speed: observe.wind_speed,
      visibility: observe.visibility || '—',
    } : null;

    // Step 3：腾讯天气 API — 预报
    const castUrl = `https://apis.map.qq.com/ws/weather/v1/?province=${encodeURIComponent(adInfo?.province || '')}&city=${encodeURIComponent(city)}&key=${QQ_MAP_KEY}&forecast_days=3`;
    const castRes = await fetch(castUrl).then(r => r.json());
    const forecasts = castRes?.result?.forecast || [];

    const weekDays = ['周日','周一','周二','周三','周四','周五','周六'];
    const today = new Date().getDay();

    const forecast = forecasts.slice(0, 3).map((c, i) => ({
      date:     i === 0 ? '今天' : weekDays[(today + i) % 7],
      desc:     c.day_weather,
      icon:     weatherIcon(c.day_weather),
      tempHigh: c.max_degree,
      tempLow:  c.min_degree,
    }));

    return {
      success: true,
      data: { city, current, forecast },
    };

  } catch (err) {
    console.error('getWeather error:', err);
    return { success: false, error: err.message };
  }
};

// 天气描述 → emoji
const WEATHER_ICONS = {
  '晴':     '☀️', '多云': '⛅', '阴': '☁️',
  '小雨':   '🌦️', '中雨': '🌧️', '大雨': '🌧️',
  '暴雨':   '⛈️', '雷阵雨': '⛈️', '雪': '❄️',
  '大雪':   '🌨️', '雾': '🌫️', '霾': '😷',
  '阵雨':   '🌦️',
};

function weatherIcon(desc) {
  for (const [k, v] of Object.entries(WEATHER_ICONS)) {
    if (desc.includes(k)) return v;
  }
  return '🌤️';
}

exports.main = async (event, context) => {
  const { lat, lon } = event;

  try {
    // Step 1：逆地理编码获取城市
    const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lon},${lat}&key=${AMAP_KEY}&extensions=base&output=json`;
    const geoRes  = await fetch(geoUrl).then(r => r.json());
    const city    = geoRes?.regeocode?.addressComponent?.city ||
                    geoRes?.regeocode?.addressComponent?.province || '未知城市';
    const adcode  = geoRes?.regeocode?.addressComponent?.adcode || '';

    // Step 2：实况天气
    const liveUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${AMAP_KEY}&extensions=base&output=json`;
    const liveRes = await fetch(liveUrl).then(r => r.json());
    const live    = liveRes?.lives?.[0];

    // Step 3：预报天气（3天）
    const castUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${AMAP_KEY}&extensions=all&output=json`;
    const castRes = await fetch(castUrl).then(r => r.json());
    const casts   = castRes?.forecasts?.[0]?.casts || [];

    // 格式化当前天气
    const current = live ? {
      temp:       live.temperature,
      desc:       live.weather,
      humidity:   live.humidity,
      wind_speed: live.windpower,
      visibility: live.visibility || '—',
    } : null;

    // 格式化 3 天预报
    const forecast = casts.slice(0, 3).map(c => {
      const dateObj = new Date(c.date);
      const weekDays = ['周日','周一','周二','周三','周四','周五','周六'];
      const dayLabel = dateObj.getDay() === new Date().getDay() ? '今天' : weekDays[dateObj.getDay()];
      return {
        date:     dayLabel,
        desc:     c.dayweather,
        icon:     weatherIcon(c.dayweather),
        tempHigh: c.daytemp,
        tempLow:  c.nighttemp,
      };
    });

    return {
      success: true,
      data: { city, current, forecast },
    };

  } catch (err) {
    console.error('getWeather error:', err);
    return { success: false, error: err.message };
  }
};
