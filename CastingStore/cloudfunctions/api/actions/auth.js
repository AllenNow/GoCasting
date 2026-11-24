const { getUser } = require('../lib/auth')
const { permissionsOf, ROLE_LABELS } = require('../lib/permissions')
const { safeCount } = require('../lib/util')

function shape(user) {
  return {
    _id: user._id,
    name: user.name,
    role: user.role,
    role_label: ROLE_LABELS[user.role] || user.role,
    status: user.status || 'active',
  }
}

async function me(ctx) {
  const user = await getUser(ctx.db, ctx.openid)
  if (!user) {
    const total = await safeCount(ctx.db, 'users')
    return { needInit: total === 0, user: null, permissions: {}, openid: ctx.openid }
  }
  return {
    needInit: false,
    user: shape(user),
    permissions: permissionsOf(user.role),
  }
}

module.exports = {
  'auth.me': { public: true, sanitize: false, handler: me },
  'auth.roles': {
    public: true,
    sanitize: false,
    handler: async () => ({ roleLabels: ROLE_LABELS, permissions: permissionsOf }),
  },
}
