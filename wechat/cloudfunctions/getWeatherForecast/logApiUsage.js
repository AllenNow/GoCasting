// cloudfunctions/getMarineData/logApiUsage.js
// 公共埋点模块（与 getWeather/logApiUsage.js 保持同步）
// 微信云函数每个目录独立打包，所以各目录各放一份

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
