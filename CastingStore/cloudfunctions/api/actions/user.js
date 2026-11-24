const { fail, getDoc, audit, querySorted } = require('../lib/util')
const { ROLE_LABELS } = require('../lib/permissions')

const ROLES = Object.keys(ROLE_LABELS)

async function list(ctx) {
  const res = await ctx.db.collection('users').orderBy('created_at', 'asc').limit(100).get()
  return {
    list: res.data.map((user) => ({
      _id: user._id,
      openid: user.openid,
      name: user.name,
      role: user.role,
      role_label: ROLE_LABELS[user.role] || user.role,
      status: user.status || 'active',
      created_at: user.created_at,
    })),
  }
}

async function save(ctx, payload) {
  const db = ctx.db
  const fields = {
    name: payload.name || '',
    role: payload.role,
    status: payload.status || 'active',
  }
  if (!fields.name) fail(400, '请填写姓名')
  if (ROLES.indexOf(fields.role) < 0) fail(400, '角色不合法')
  if (['active', 'disabled'].indexOf(fields.status) < 0) fail(400, '状态不合法')

  if (payload.id) {
    const before = await getDoc(db, 'users', payload.id)
    if (before.role === 'owner' && fields.role !== 'owner') {
      const owners = await db.collection('users').where({ role: 'owner' }).count()
      if (owners.total <= 1) fail(400, '至少保留一个老板账号')
    }
    await db.collection('users').doc(payload.id).update({ data: fields })
    await audit(db, ctx.user, {
      module: 'user',
      action: 'update',
      ref_type: 'user',
      ref_id: payload.id,
      summary: `修改用户 ${before.name} 角色为 ${fields.role}`,
      before: { role: before.role, status: before.status },
      after: fields,
    })
    return { id: payload.id }
  }

  const openid = String(payload.openid || '').trim()
  if (!openid) fail(400, '请填写对方微信号 openid（让对方先打开一次小程序，在“我的”页复制）')
  const exists = await db.collection('users').where({ openid }).count()
  if (exists.total > 0) fail(400, '该微信号已存在账号')

  const data = {
    openid,
    name: fields.name,
    role: fields.role,
    status: fields.status,
    created_at: new Date(),
  }
  const res = await db.collection('users').add({ data })
  await audit(db, ctx.user, {
    module: 'user',
    action: 'create',
    ref_type: 'user',
    ref_id: res._id,
    summary: `新增用户 ${data.name}（${data.role}）`,
    after: { name: data.name, role: data.role },
  })
  return { id: res._id }
}

async function remove(ctx, payload) {
  const db = ctx.db
  const user = await getDoc(db, 'users', payload.id)
  if (user.openid === ctx.openid) fail(400, '不能删除自己的账号')
  if (user.role === 'owner') {
    const owners = await db.collection('users').where({ role: 'owner' }).count()
    if (owners.total <= 1) fail(400, '至少保留一个老板账号')
  }
  await db.collection('users').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'user',
    action: 'delete',
    ref_type: 'user',
    ref_id: payload.id,
    summary: `删除用户 ${user.name}`,
  })
  return { ok: true }
}

async function logs(ctx, payload) {
  const db = ctx.db
  let query = {}
  if (payload.module) query.module = payload.module
  const list = await querySorted(db, 'audit_logs', query, {
    limit: Math.min(200, Number(payload.limit) || 100),
  })
  return { list }
}

module.exports = {
  'user.list': { module: 'user', action: 'read', handler: list },
  'user.save': { module: 'user', action: 'create', handler: save },
  'user.remove': { module: 'user', action: 'delete', handler: remove },
  'audit.list': { module: 'user', action: 'read', handler: logs },
}
