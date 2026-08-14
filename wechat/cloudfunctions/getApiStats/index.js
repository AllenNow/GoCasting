// cloudfunctions/getApiStats/index.js
// 管理员专用：第三方 API 用量统计
// 支持多维度查询：总览 / 按 API 分组 / 按用户 / 按日期 / 用户明细
// 所有操作均进行服务端管理员鉴权

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ── 管理员鉴权（与其他云函数保持一致）────────────────────────
async function isAdmin(db, openid) {
  try {
    const res = await db.collection('admin_config').limit(1).get();
    if (!res.data.length) return false;
    return (res.data[0].admins || []).includes(openid);
  } catch (e) {
    return false;
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db  = cloud.database();
  const cmd = db.command;

  // 鉴权
  if (!(await isAdmin(db, OPENID))) {
    return { success: false, error: '无权限' };
  }

  const { action, dateKey, openid: targetUser } = event;

  try {

    // ══════════════════════════════════════════════════════
    // action: 'overview'
    // 返回：总调用次数、成功次数、失败次数、平均耗时
    //       + 各 API 分组调用量汇总（用于饼图/柱图）
    // ══════════════════════════════════════════════════════
    if (action === 'overview') {
      const col = db.collection('api_usage_logs');

      // 总量（前端权限限制，分批累加）
      const [totalRes, successRes, failRes] = await Promise.all([
        col.count(),
        col.where({ success: true  }).count(),
        col.where({ success: false }).count(),
      ]);

      // 近 500 条计算平均耗时 & 分组统计
      const recent = await col
        .orderBy('calledAt', 'desc')
        .limit(500)
        .get();

      const logs = recent.data;

      // 按 apiGroup+apiName 聚合
      const apiMap = {};
      let totalLatency = 0;
      let latencyCount = 0;

      logs.forEach(log => {
        const key = `${log.apiGroup}::${log.apiName}`;
        if (!apiMap[key]) {
          apiMap[key] = { apiGroup: log.apiGroup, apiName: log.apiName, total: 0, success: 0, fail: 0, totalLatency: 0 };
        }
        apiMap[key].total++;
        if (log.success) apiMap[key].success++;
        else             apiMap[key].fail++;
        if (log.latencyMs) {
          apiMap[key].totalLatency += log.latencyMs;
          totalLatency += log.latencyMs;
          latencyCount++;
        }
      });

      // 整理成数组，计算平均耗时
      const byApi = Object.values(apiMap).map(item => ({
        ...item,
        avgLatencyMs: item.total > 0 ? Math.round(item.totalLatency / item.total) : 0,
        successRate:  item.total > 0 ? parseFloat((item.success / item.total * 100).toFixed(1)) : 0,
      })).sort((a, b) => b.total - a.total);

      return {
        success: true,
        data: {
          total:       totalRes.total,
          totalSuccess: successRes.total,
          totalFail:   failRes.total,
          avgLatencyMs: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
          byApi,
        },
      };
    }

    // ══════════════════════════════════════════════════════
    // action: 'byDate'
    // 返回：最近 30 天每天各 API 的调用量（折线图数据）
    // ══════════════════════════════════════════════════════
    if (action === 'byDate') {
      // 构造最近 30 天的日期键列表
      const days = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        days.push(key);
      }

      // 取最近 30 天的日志（最多 1000 条）
      const startDate = days[0];
      const logs = await db.collection('api_usage_logs')
        .where({ dateKey: cmd.gte(startDate) })
        .orderBy('calledAt', 'desc')
        .limit(1000)
        .get();

      // 按 dateKey + apiGroup 聚合
      const dateApiMap = {};
      logs.data.forEach(log => {
        const dk = log.dateKey;
        if (!dateApiMap[dk]) dateApiMap[dk] = {};
        const ag = log.apiGroup;
        dateApiMap[dk][ag] = (dateApiMap[dk][ag] || 0) + 1;
      });

      // 补齐每天没有数据的 apiGroup 为 0
      const allGroups = [...new Set(logs.data.map(l => l.apiGroup))];
      const series = days.map(dk => {
        const entry = { dateKey: dk, total: 0 };
        allGroups.forEach(ag => {
          entry[ag] = dateApiMap[dk]?.[ag] || 0;
          entry.total += entry[ag];
        });
        return entry;
      });

      return { success: true, data: { days, allGroups, series } };
    }

    // ══════════════════════════════════════════════════════
    // action: 'byUser'
    // 返回：调用量 Top 用户列表（每个 openid 的总量 + 分 API 量）
    // ══════════════════════════════════════════════════════
    if (action === 'byUser') {
      const logs = await db.collection('api_usage_logs')
        .orderBy('calledAt', 'desc')
        .limit(1000)
        .get();

      // 按 openid 聚合
      const userMap = {};
      logs.data.forEach(log => {
        const uid = log.openid;
        if (!userMap[uid]) {
          userMap[uid] = { openid: uid, total: 0, success: 0, fail: 0, apis: {} };
        }
        userMap[uid].total++;
        if (log.success) userMap[uid].success++;
        else             userMap[uid].fail++;
        const apiKey = `${log.apiGroup}::${log.apiName}`;
        userMap[uid].apis[apiKey] = (userMap[uid].apis[apiKey] || 0) + 1;
        // 记录最后调用时间
        if (!userMap[uid].lastCalledAt || log.calledAt > userMap[uid].lastCalledAt) {
          userMap[uid].lastCalledAt = log.calledAt;
        }
      });

      // 整理成数组，按调用总量降序
      const byUser = Object.values(userMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 50)  // Top 50
        .map(u => ({
          ...u,
          apis: Object.entries(u.apis)
            .sort((a, b) => b[1] - a[1])
            .map(([apiKey, cnt]) => {
              const [apiGroup, apiName] = apiKey.split('::');
              return { apiGroup, apiName, count: cnt };
            }),
        }));

      return { success: true, data: { byUser } };
    }

    // ══════════════════════════════════════════════════════
    // action: 'userDetail'
    // 返回：某个 openid 的完整调用记录（最近 200 条）
    // ══════════════════════════════════════════════════════
    if (action === 'userDetail') {
      if (!targetUser) return { success: false, error: '缺少 openid 参数' };

      const logs = await db.collection('api_usage_logs')
        .where({ openid: targetUser })
        .orderBy('calledAt', 'desc')
        .limit(200)
        .get();

      // 汇总统计
      const summary = { total: 0, success: 0, fail: 0, apis: {} };
      logs.data.forEach(log => {
        summary.total++;
        if (log.success) summary.success++;
        else             summary.fail++;
        const key = `${log.apiGroup}::${log.apiName}`;
        if (!summary.apis[key]) {
          summary.apis[key] = { apiGroup: log.apiGroup, apiName: log.apiName, count: 0, fail: 0 };
        }
        summary.apis[key].count++;
        if (!log.success) summary.apis[key].fail++;
      });

      return {
        success: true,
        data: {
          openid: targetUser,
          summary: {
            ...summary,
            apis: Object.values(summary.apis).sort((a, b) => b.count - a.count),
          },
          records: logs.data.map(l => ({
            apiGroup:  l.apiGroup,
            apiName:   l.apiName,
            success:   l.success,
            latencyMs: l.latencyMs,
            error:     l.error,
            dateKey:   l.dateKey,
            hourKey:   l.hourKey,
            calledAt:  l.calledAt,
          })),
        },
      };
    }

    // ══════════════════════════════════════════════════════
    // action: 'failLogs'
    // 返回：最近失败记录（用于排错）
    // ══════════════════════════════════════════════════════
    if (action === 'failLogs') {
      const logs = await db.collection('api_usage_logs')
        .where({ success: false })
        .orderBy('calledAt', 'desc')
        .limit(100)
        .get();

      return {
        success: true,
        data: {
          records: logs.data.map(l => ({
            openid:    l.openid,
            apiGroup:  l.apiGroup,
            apiName:   l.apiName,
            error:     l.error,
            dateKey:   l.dateKey,
            hourKey:   l.hourKey,
            calledAt:  l.calledAt,
          })),
        },
      };
    }

    return { success: false, error: `未知 action: ${action}` };

  } catch (err) {
    console.error('getApiStats error:', err);
    return { success: false, error: String(err) };
  }
};
