// cloudfunctions/getWeatherExtra/logApiUsage.js
// 公共埋点模块：记录第三方 API 调用日志到 api_usage_logs 集合
// 设计：fire-and-forget（异步写入，不阻塞主流程，写入失败静默忽略）

async function logApiUsage(db, opts) {
  try {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const hourKey = String(now.getHours()).padStart(2,'0') + ':00';

    await db.collection('api_usage_logs').add({
      data: {
        openid:    opts.openid    || 'anonymous',
        apiGroup:  opts.apiGroup,
        apiName:   opts.apiName,
        endpoint:  opts.endpoint  || '',
        success:   opts.success   !== false,
        latencyMs: opts.latencyMs || 0,
        error:     opts.error     || null,
        dateKey,
        hourKey,
        calledAt:  db.serverDate(),
      },
    });
  } catch (e) {
    console.warn('[logApiUsage] 写入失败:', e.message || e);
  }
}

module.exports = { logApiUsage };
