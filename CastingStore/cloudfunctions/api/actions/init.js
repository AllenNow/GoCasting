const {
  ensureCollections,
  safeCount,
  audit,
  fail,
} = require('../lib/util')
const { getUser } = require('../lib/auth')

async function status(ctx) {
  const db = ctx.db
  const names = ['users', 'products', 'suppliers', 'warehouses', 'inventory', 'orders', 'purchase_orders']
  const counts = {}
  for (let i = 0; i < names.length; i += 1) {
    counts[names[i]] = await safeCount(db, names[i])
  }
  return { initialized: counts.users > 0, counts }
}

async function setup(ctx, payload) {
  const db = ctx.db
  await ensureCollections(db)

  const userCount = await safeCount(db, 'users')
  let createdUser = null

  if (userCount === 0) {
    createdUser = {
      openid: ctx.openid,
      name: payload.name || '老板',
      role: 'owner',
      status: 'active',
      created_at: new Date(),
    }
    await db.collection('users').add({ data: createdUser })
  } else {
    const user = await getUser(db, ctx.openid)
    if (!user || user.role !== 'owner') {
      fail(403, '系统已初始化，请联系老板为你的微信号分配角色')
    }
  }

  const warehouseCount = await safeCount(db, 'warehouses')
  if (warehouseCount === 0) {
    await db.collection('warehouses').add({
      data: { name: '默认仓', code: 'WH01', is_default: true, created_at: new Date() },
    })
  }

  await audit(db, createdUser || { openid: ctx.openid, name: 'system' }, {
    module: 'init',
    action: 'setup',
    summary: createdUser ? '初始化系统并创建老板账号' : '补齐基础数据',
  })

  return { ok: true, createdOwner: !!createdUser }
}

module.exports = {
  'init.status': { public: true, sanitize: false, handler: status },
  'init.setup': { public: true, sanitize: false, handler: setup },
}
