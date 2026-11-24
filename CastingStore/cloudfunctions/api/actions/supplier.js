const { fail, pick, escapeReg, getDoc, audit, querySorted } = require('../lib/util')

async function list(ctx, payload) {
  const db = ctx.db
  let query = {}
  if (payload.keyword) {
    const reg = db.RegExp({ regexp: escapeReg(String(payload.keyword).trim()), options: 'i' })
    query = db.command.or([{ name: reg }, { contact: reg }, { phone: reg }])
  }
  const list = await querySorted(db, 'suppliers', query, { limit: 100 })
  return { list }
}

async function save(ctx, payload) {
  const db = ctx.db
  const fields = pick(payload, [
    'name',
    'type',
    'contact',
    'phone',
    'settlement',
    'lead_time_days',
    'note',
  ])
  if (!fields.name) fail(400, '请填写供应商名称')
  if (fields.lead_time_days !== undefined) fields.lead_time_days = Number(fields.lead_time_days) || 0
  fields.updated_at = new Date()

  if (payload.id) {
    const before = await getDoc(db, 'suppliers', payload.id)
    await db.collection('suppliers').doc(payload.id).update({ data: fields })
    await audit(db, ctx.user, {
      module: 'supplier',
      action: 'update',
      ref_type: 'supplier',
      ref_id: payload.id,
      summary: `修改供应商 ${before.name}`,
      before: { name: before.name, phone: before.phone, settlement: before.settlement },
      after: fields,
    })
    return { id: payload.id }
  }

  fields.created_at = new Date()
  const res = await db.collection('suppliers').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'supplier',
    action: 'create',
    ref_type: 'supplier',
    ref_id: res._id,
    summary: `新增供应商 ${fields.name}`,
    after: fields,
  })
  return { id: res._id }
}

async function remove(ctx, payload) {
  const db = ctx.db
  const supplier = await getDoc(db, 'suppliers', payload.id)
  const used = await db.collection('purchase_orders').where({ supplier_id: payload.id }).count()
  if (used.total > 0) fail(400, `该供应商已有 ${used.total} 张采购单，不能删除`)
  const orders = await db.collection('orders').where({ supplier_id: payload.id }).count()
  if (orders.total > 0) fail(400, `该供应商已有 ${orders.total} 张代发订单，不能删除`)
  const products = await db.collection('products').where({ supplier_id: payload.id }).count()
  if (products.total > 0) fail(400, `该供应商是 ${products.total} 个商品的默认供应商，请先调整商品供应商`)
  await db.collection('suppliers').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'supplier',
    action: 'delete',
    ref_type: 'supplier',
    ref_id: payload.id,
    summary: `删除供应商 ${supplier.name}`,
  })
  return { ok: true }
}

module.exports = {
  'supplier.list': { module: 'supplier', action: 'read', handler: list },
  'supplier.save': { module: 'supplier', action: 'create', handler: save },
  'supplier.remove': { module: 'supplier', action: 'delete', handler: remove },
}
