// cloudfunctions/getWeather/logApiUsage.js
// 公共埋点模块：记录第三方 API 调用日志到 api_usage_logs 集合
// 设计：fire-and-forget（异步写入，不阻塞主流程，写入失败静默忽略）

/**
 * 记录一次 API 调用
 * @param {object} db        - wx-server-sdk 数据库实例
 * @param {object} opts
 * @param {string} opts.openid     - 调用者 openid（'anonymous' 表示未登录）
 * @param {string} opts.apiGroup   - API 分组，如 'amap'、'open_meteo'
 * @param {string} opts.apiName    - 具体接口名，如 'regeo'、'weather_live'、'marine'
 * @param {string} opts.endpoint   - 完整请求 URL（敏感参数可脱敏后传入）
 * @param {boolean} opts.success   - 是否成功
 * @param {number}  opts.latencyMs - 耗时（毫秒）
 * @param {string}  [opts.error]   - 失败时的错误信息
 */
async function logApiUsage(db, opts) {
  try {
    const now = new Date();
    // 按天分区键，方便按天/月聚合查询
    const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const hourKey = String(now.getHours()).padStart(2,'0') + ':00';

    await db.collection('api_usage_logs').add({
      data: {
        openid:    opts.openid    || 'anonymous',
        apiGroup:  opts.apiGroup,
        apiName:   opts.apiName,
        endpoint:  opts.endpoint  || '',
        success:   opts.success   !== false,  // 默认 true
        latencyMs: opts.latencyMs || 0,
        error:     opts.error     || null,
        dateKey,       // "2026-08-14"，按天聚合用
        hourKey,       // "16:00"，按小时聚合用
        calledAt:  db.serverDate(),
      },
    });
  } catch (e) {
    // 埋点写入失败不影响主流程
    console.warn('[logApiUsage] 写入失败:', e.message || e);
  }
}

module.exports = { logApiUsage };
