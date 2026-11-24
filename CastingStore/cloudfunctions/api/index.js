const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const router = require('./lib/router')

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action
  const payload = event.payload || {}

  if (!action) {
    return { code: 400, message: '缺少 action 参数' }
  }

  try {
    const data = await router.dispatch({ db, cloud, openid: OPENID }, action, payload)
    return { code: 0, data }
  } catch (err) {
    console.error(`[api] ${action} failed:`, err)
    return {
      code: err.code || 500,
      message: err.message || '服务异常，请稍后重试',
    }
  }
}
