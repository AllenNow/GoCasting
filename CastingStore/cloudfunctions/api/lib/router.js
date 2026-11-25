const { can, permissionsOf, ROLE_LABELS, shouldHideCost } = require('./permissions')
const { sanitize } = require('./sanitize')
const { fail } = require('./util')
const { getUser } = require('./auth')

const routes = {}

function register(map) {
  Object.keys(map).forEach((name) => {
    const route = map[name]
    // 模块可同时导出内部辅助函数，只有带 handler 的配置才注册为接口
    if (!route || typeof route.handler !== 'function') return
    routes[name] = route
  })
}

register(require('../actions/auth'))
register(require('../actions/init'))
register(require('../actions/product'))
register(require('../actions/supplier'))
register(require('../actions/purchase'))
register(require('../actions/inventory'))
register(require('../actions/repair'))
register(require('../actions/tradeIn'))
register(require('../actions/dismantle'))
register(require('../actions/order'))
register(require('../actions/afterSale'))
register(require('../actions/cash'))
register(require('../actions/settlement'))
register(require('../actions/report'))
register(require('../actions/user'))

async function dispatch(ctx, action, payload) {
  const route = routes[action]
  if (!route) fail(404, `未知接口：${action}`)

  let user = null
  if (!route.public) {
    user = await getUser(ctx.db, ctx.openid)
    if (!user) fail(401, '账号未授权，请先在“我的”页面完成初始化或联系老板分配角色')
    if (user.status && user.status !== 'active') fail(403, '账号已停用')
    if (!can(user.role, route.module, route.action)) {
      fail(403, '当前角色无该操作权限')
    }
  }

  ctx.user = user
  ctx.permissions = user ? permissionsOf(user.role) : {}
  ctx.roleLabel = user ? ROLE_LABELS[user.role] || user.role : ''

  const data = await route.handler(ctx, payload || {})

  if (user && shouldHideCost(user.role) && route.sanitize !== false) {
    return sanitize(data, user.role)
  }
  return data
}

module.exports = { dispatch }
