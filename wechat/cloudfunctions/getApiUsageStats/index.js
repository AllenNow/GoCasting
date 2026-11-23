// cloudfunctions/getApiUsageStats/index.js
// 第三方 API 用量与费用统计（仅超级管理员可调用）
// 数据源：api_usage_logs（各云函数在真实回源第三方接口时写入）
// 口径：埋点只在缓存未命中、真正请求上游时写入，因此等同于「第三方实际调用量」

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ── 价目表（元/次）────────────────────────────────────────────
// unit: 单次费用；freeQuota: 每月免费调用次数（超出部分才计费）
const PRICE_TABLE = {
  'amap:regeo':                { label: '高德 · 逆地理编码',   unit: 0,      freeQuota: 0,     note: '免费额度内（15万/月）' },
  'amap:weather_live':         { label: '高德 · 天气实况',     unit: 0,      freeQuota: 0,     note: '免费额度内（15万/月）' },
  'amap:weather_forecast':     { label: '高德 · 天气预报',     unit: 0,      freeQuota: 0,     note: '免费额度内（15万/月）' },
  'amap:place_text':           { label: '高德 · POI 搜索',     unit: 0,      freeQuota: 0,     note: '免费额度内（15万/月）' },
  'amap:district':             { label: '高德 · 行政区划',     unit: 0,      freeQuota: 0,     note: '免费额度内（15万/月）' },
  'open_meteo:marine':         { label: 'Open-Meteo · 海浪',   unit: 0,      freeQuota: 0,     note: '完全免费' },
  'open_meteo:atmos_forecast': { label: 'Open-Meteo · 气压预报', unit: 0,    freeQuota: 0,     note: '完全免费' },
  'qweather:extra_astro':      { label: '和风 · 天文',         unit: 0,      freeQuota: 0,     note: '套餐内（不计单次）' },
  'qweather:extra_indices':    { label: '和风 · 生活指数',     unit: 0,      freeQuota: 0,     note: '套餐内（不计单次）' },
  'qweather:extra_warning':    { label: '和风 · 灾害预警',     unit: 0,      freeQuota: 0,     note: '套餐内（不计单次）' },
  'qweather:extra_minutely':   { label: '和风 · 分钟降水',     unit: 0,      freeQuota: 0,     note: '套餐内（不计单次）' },
  'qweather:tide':             { label: '和风 · 潮汐',         unit: 0.003,  freeQuota: 0,     note: '按次计费 0.003 元' },
  'qweather:geo_api':          { label: '和风 · GeoAPI 找站',  unit: 0.0007, freeQuota: 50000, note: '每月前 5 万次免费，超出 0.0007 元/次' },
  'qweather:weather_now_7d':   { label: '和风 · 实况+7天预报', unit: 0,      freeQuota: 0,     note: '套餐内（不计单次）' },
  'qweather:weather_atmos':    { label: '和风 · 逐小时大气',   unit: 0,      freeQuota: 0,     note: '套餐内（不计单次）' },
};

const round4 = v => Number(Number(v || 0).toFixed(4));

function priceOf(apiGroup, apiName) {
  const key = `${apiGroup}:${apiName}`;
  const p = PRICE_TABLE[key];
  if (p) return Object.assign({ key: key }, p);
  return { key: key, label: `${apiGroup} · ${apiName}`, unit: 0, freeQuota: 0, note: '未配置单价' };
}

// 按调用量计算计费次数与费用（免费额度按月扣除）
function calcCost(price, calls) {
  const billed = Math.max(0, calls - (price.freeQuota || 0));
  return { billed: billed, cost: billed * (price.unit || 0) };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;

  // ── 超级管理员校验 ─────────────────────────────────────────
  let isSuper = false;
  try {
    const cfgRes = await db.collection('admin_config').limit(1).get();
    if (cfgRes.data.length) {
      const cfg = cfgRes.data[0];
      const supers = cfg.super_admins || cfg.admins || [];
      isSuper = supers.indexOf(OPENID) >= 0;
    }
  } catch (e) {
    console.warn('[getApiUsageStats] 读取 admin_config 失败:', e.message);
  }
  if (!isSuper) return { success: false, error: '无权限' };

  // ── 月份参数 ───────────────────────────────────────────────
  let month = (event && event.month) || currentMonth();
  if (!/^\d{4}-\d{2}$/.test(month)) month = currentMonth();

  const year = Number(month.slice(0, 4));
  const mon  = Number(month.slice(5, 7));
  const start = `${month}-01`;
  const next  = mon === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

  // ── 聚合：按 天 + API 分组 ─────────────────────────────────
  let rows = [];
  let collectionMissing = false;
  try {
    const $ = db.command.aggregate;
    const res = await db.collection('api_usage_logs').aggregate()
      .match({ dateKey: _.gte(start).and(_.lt(next)) })
      .group({
        _id: { d: '$dateKey', g: '$apiGroup', n: '$apiName' },
        calls:   $.sum(1),
        success: $.sum($.cond({ if: $.eq(['$success', true]), then: 1, else: 0 })),
        latency: $.sum('$latencyMs'),
      })
      .limit(2000)
      .end();
    rows = res.list || [];
  } catch (e) {
    console.warn('[getApiUsageStats] 聚合失败:', e.message);
    collectionMissing = true;
  }

  // ── 第一次遍历：API 汇总 + 按天调用量 ──────────────────────
  const apiMap = {};
  const dayMap = {};
  let totalCalls = 0;
  let totalSuccess = 0;

  rows.forEach(r => {
    const d = r._id.d, g = r._id.g, n = r._id.n;
    const calls = r.calls || 0;
    const succ  = r.success || 0;
    const lat   = r.latency || 0;

    totalCalls   += calls;
    totalSuccess += succ;

    const key = `${g}:${n}`;
    if (!apiMap[key]) {
      apiMap[key] = { apiGroup: g, apiName: n, calls: 0, success: 0, latency: 0, days: {} };
    }
    const api = apiMap[key];
    api.calls += calls;
    api.success += succ;
    api.latency += lat;
    api.days[d] = (api.days[d] || 0) + calls;

    if (!dayMap[d]) dayMap[d] = { date: d, calls: 0, success: 0, cost: 0 };
    dayMap[d].calls += calls;
    dayMap[d].success += succ;
  });

  // ── 第二次遍历：按 API 计费，并按天分摊费用 ────────────────
  let totalCost = 0;
  let totalBilled = 0;

  const items = Object.keys(apiMap).map(key => {
    const api = apiMap[key];
    const price = priceOf(api.apiGroup, api.apiName);
    const billedInfo = calcCost(price, api.calls);

    totalCost   += billedInfo.cost;
    totalBilled += billedInfo.billed;

    // 费用按天分摊（免费额度已在月维度扣除，按调用占比分摊到天）
    if (api.calls > 0 && billedInfo.cost > 0) {
      Object.keys(api.days).forEach(d => {
        const share = api.days[d] / api.calls;
        if (dayMap[d]) dayMap[d].cost += billedInfo.cost * share;
      });
    }

    return {
      key: key,
      apiGroup: api.apiGroup,
      apiName: api.apiName,
      label: price.label,
      calls: api.calls,
      success: api.success,
      failed: api.calls - api.success,
      successRate: api.calls ? Number(((api.success / api.calls) * 100).toFixed(1)) : 0,
      avgLatency: api.calls ? Math.round(api.latency / api.calls) : 0,
      unit: price.unit,               // 单次费用（元）
      freeQuota: price.freeQuota,
      billed: billedInfo.billed,      // 计费次数
      cost: round4(billedInfo.cost),  // 本期费用（元）
      note: price.note,
    };
  }).sort((a, b) => (b.cost - a.cost) || (b.calls - a.calls));

  // ── 按天序列（补齐整月，便于画柱状图）──────────────────────
  const daysInMonth = new Date(year, mon, 0).getDate();
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dk = `${month}-${String(i).padStart(2, '0')}`;
    const d = dayMap[dk] || { calls: 0, success: 0, cost: 0 };
    days.push({
      date: dk,
      day: i,
      calls: d.calls,
      success: d.success,
      cost: round4(d.cost),
    });
  }

  return {
    success: true,
    month: month,
    collectionMissing: collectionMissing,
    totals: {
      calls: totalCalls,
      success: totalSuccess,
      failed: totalCalls - totalSuccess,
      successRate: totalCalls ? Number(((totalSuccess / totalCalls) * 100).toFixed(1)) : 0,
      billed: totalBilled,
      cost: round4(totalCost),
      apiCount: items.length,
    },
    items: items,
    days: days,
    updatedAt: new Date().toISOString(),
  };
};
