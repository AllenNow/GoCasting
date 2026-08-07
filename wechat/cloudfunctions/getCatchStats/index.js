// cloudfunctions/getCatchStats/index.js
// 云函数：聚合查询当前用户的渔获统计（在云端执行，绕过小程序端 limit 20 限制）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const $ = db.command.aggregate;
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    // 聚合查询：只统计当前用户数据
    const agg = await db.collection('catch_logs')
      .aggregate()
      .match({ _openid: OPENID })
      .group({
        _id: null,
        totalCount:   $.sum(1),
        totalWeight:  $.sum('$weight_g'),
        releasedCount:$.sum($.cond({ if: '$released', then: 1, else: 0 })),
      })
      .end();

    // 鱼种分布（前 5）
    const speciesAgg = await db.collection('catch_logs')
      .aggregate()
      .match({ _openid: OPENID, species: _.exists(true) })
      .group({ _id: '$species', count: $.sum(1) })
      .sort({ count: -1 })
      .limit(5)
      .end();

    // 月度趋势（近 6 个月）
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString().slice(0, 7);

    const monthlyAgg = await db.collection('catch_logs')
      .aggregate()
      .match({
        _openid: OPENID,
        date: _.gte(sixMonthsAgo),
      })
      .group({
        _id: $.substr(['$date', 0, 7]),  // YYYY-MM
        count: $.sum(1),
      })
      .sort({ _id: 1 })
      .end();

    const summary = agg.list[0] || { totalCount: 0, totalWeight: 0, releasedCount: 0 };

    return {
      success: true,
      data: {
        totalCount:    summary.totalCount    || 0,
        totalWeight_g: summary.totalWeight   || 0,
        releasedCount: summary.releasedCount || 0,
        speciesRanking: speciesAgg.list.map(s => ({ species: s._id, count: s.count })),
        monthlyTrend:   monthlyAgg.list.map(m => ({ month: m._id, count: m.count })),
      },
    };
  } catch (err) {
    console.error('getCatchStats error', err);
    return { success: false, error: err.message };
  }
};
