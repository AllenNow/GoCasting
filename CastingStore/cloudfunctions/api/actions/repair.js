const { fail, nextNo, getDoc, audit, round2, round4, querySorted } = require('../lib/util')
const { assertNoStocktake } = require('./inventory')

const STATUS = ['维修中', '已完成', '已取消']
const REPAIR_CONDITIONS = ['磕碰', '故障']

async function ensureCollection(db) {
  try {
    await db.createCollection('repairs')
  } catch (err) {
    // 集合已存在时忽略
  }
}

function operatorOf(ctx) {
  return { openid: ctx.openid, name: ctx.user ? ctx.user.name : '' }
}

async function list(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const query = {}
  if (payload.product_id) query.product_id = payload.product_id
  if (payload.status && STATUS.indexOf(payload.status) >= 0) query.status = payload.status
  let rows = []
  try {
    rows = await querySorted(db, 'repairs', query, { limit: 100 })
  } catch (err) {
    rows = []
  }
  return { list: rows }
}

async function get(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  return { repair: await getDoc(db, 'repairs', payload.id) }
}

/**
 * 发起维修：仅磕碰/故障商品可发起，库存从「可用」转入「维修中」。
 */
async function create(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  await assertNoStocktake(db, '发起维修')

  const product = await getDoc(db, 'products', payload.product_id)
  if (REPAIR_CONDITIONS.indexOf(product.condition) < 0) {
    fail(400, '只有商品状况为「磕碰」或「故障」的商品可以发起维修')
  }

  const qty = round4(payload.qty)
  if (!(qty > 0)) fail(400, '请填写维修数量')

  const repairChannel = String(payload.repair_channel || '').trim()
  if (!repairChannel) fail(400, '请填写修复渠道')
  const repairMethod = String(payload.repair_method || '').trim()
  if (!repairMethod) fail(400, '请填写修复方式')

  const rawCost = payload.repair_cost
  if (rawCost === undefined || rawCost === null || String(rawCost).trim() === '') {
    fail(400, '请填写修复费用')
  }
  const repairCost = round2(rawCost)
  if (!(repairCost >= 0)) fail(400, '修复费用不能为负数')

  const warehouseId = payload.warehouse_id
  if (!warehouseId) fail(400, '请选择仓库')
  const warehouse = await getDoc(db, 'warehouses', warehouseId)

  const no = await nextNo(db, 'WX')
  const invId = `${product._id}_${warehouseId}`
  let repairId = ''

  await db.runTransaction(async (transaction) => {
    let inv = null
    try {
      const res = await transaction.collection('inventory').doc(invId).get()
      inv = res.data
    } catch (err) {
      inv = null
    }
    if (!inv) fail(400, '该仓库暂无可用库存')

    const available = Number(inv.qty_available || 0)
    if (qty > available + 0.0001) fail(400, `可用库存不足，当前 ${available}`)
    const repairing = Number(inv.qty_repairing || 0)
    const avgCost = Number(inv.avg_cost || 0)
    const now = new Date()

    await transaction.collection('inventory').doc(invId).update({
      data: {
        qty_available: round4(available - qty),
        qty_repairing: round4(repairing + qty),
        updated_at: now,
      },
    })

    await transaction.collection('inventory_txns').add({
      data: {
        type: '维修出库',
        product_id: product._id,
        product_name: product.name,
        sku_code: product.sku_code || '',
        warehouse_id: warehouseId,
        qty: -qty,
        unit_cost: round4(avgCost),
        amount: round2(qty * avgCost),
        ref_type: 'repair',
        ref_id: no,
        ref_no: no,
        operator_openid: ctx.openid,
        operator_name: operatorOf(ctx).name,
        note: `发起维修：${repairChannel}`,
        created_at: now,
      },
    })

    const res = await transaction.collection('repairs').add({
      data: {
        no,
        product_id: product._id,
        product_name: product.name,
        sku_code: product.sku_code || '',
        condition: product.condition,
        warehouse_id: warehouseId,
        warehouse_name: warehouse.name,
        qty,
        repair_channel: repairChannel,
        repair_method: repairMethod,
        repair_cost: repairCost,
        status: '维修中',
        note: String(payload.note || '').trim(),
        operator_openid: ctx.openid,
        operator_name: operatorOf(ctx).name,
        created_at: now,
        updated_at: now,
      },
    })
    repairId = res._id
  })

  await audit(db, ctx.user, {
    module: 'repair',
    action: 'create',
    ref_type: 'repair',
    ref_id: repairId,
    summary: `${product.name} 发起维修 ${qty}，渠道 ${repairChannel}，费用 ${repairCost}`,
    after: { no, qty, repair_channel: repairChannel, repair_method: repairMethod, repair_cost: repairCost },
  })

  return { id: repairId, no }
}

/**
 * 完成维修：维修中数量转回可用，修复费用计入库存成本。
 */
async function complete(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  await assertNoStocktake(db, '完成维修')

  const repair = await getDoc(db, 'repairs', payload.id)
  if (repair.status !== '维修中') {
    fail(400, `维修单当前状态为「${repair.status}」，不能完成`)
  }
  const invId = `${repair.product_id}_${repair.warehouse_id}`

  await db.runTransaction(async (transaction) => {
    const freshRes = await transaction.collection('repairs').doc(payload.id).get()
    const fresh = freshRes.data
    if (fresh.status !== '维修中') {
      fail(400, `维修单当前状态为「${fresh.status}」，不能完成`)
    }

    let inv = null
    try {
      const res = await transaction.collection('inventory').doc(invId).get()
      inv = res.data
    } catch (err) {
      inv = null
    }
    if (!inv) fail(400, '维修库存记录不存在')

    const qty = Number(fresh.qty || 0)
    const cost = round2(fresh.repair_cost || 0)
    const available = Number(inv.qty_available || 0)
    const repairing = Number(inv.qty_repairing || 0)
    if (repairing + 0.0001 < qty) fail(400, '维修中数量不足，无法完成')

    const now = new Date()
    const newAvailable = round4(available + qty)
    const newAvg = newAvailable > 0
      ? round4((available * Number(inv.avg_cost || 0) + cost) / newAvailable)
      : 0

    await transaction.collection('inventory').doc(invId).update({
      data: {
        qty_available: newAvailable,
        qty_repairing: round4(repairing - qty),
        avg_cost: newAvg,
        last_in_at: now,
        updated_at: now,
      },
    })

    await transaction.collection('inventory_txns').add({
      data: {
        type: '维修入库',
        product_id: fresh.product_id,
        product_name: fresh.product_name,
        sku_code: fresh.sku_code || '',
        warehouse_id: fresh.warehouse_id,
        qty,
        unit_cost: qty > 0 ? round4(cost / qty) : 0,
        amount: cost,
        ref_type: 'repair',
        ref_id: fresh.no,
        ref_no: fresh.no,
        operator_openid: ctx.openid,
        operator_name: operatorOf(ctx).name,
        note: '维修完成',
        created_at: now,
      },
    })

    await transaction.collection('repairs').doc(payload.id).update({
      data: {
        status: '已完成',
        completed_at: now,
        updated_at: now,
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'repair',
    action: 'update',
    ref_type: 'repair',
    ref_id: payload.id,
    summary: `完成维修 ${repair.no}，数量 ${repair.qty}，费用 ${repair.repair_cost}`,
  })

  return { ok: true }
}

/**
 * 取消维修：维修中数量退回可用，不并入修复费用。
 */
async function cancel(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  await assertNoStocktake(db, '取消维修')

  const repair = await getDoc(db, 'repairs', payload.id)
  if (repair.status !== '维修中') {
    fail(400, `维修单当前状态为「${repair.status}」，不能取消`)
  }
  const invId = `${repair.product_id}_${repair.warehouse_id}`

  await db.runTransaction(async (transaction) => {
    const freshRes = await transaction.collection('repairs').doc(payload.id).get()
    const fresh = freshRes.data
    if (fresh.status !== '维修中') {
      fail(400, `维修单当前状态为「${fresh.status}」，不能取消`)
    }

    let inv = null
    try {
      const res = await transaction.collection('inventory').doc(invId).get()
      inv = res.data
    } catch (err) {
      inv = null
    }
    if (!inv) fail(400, '维修库存记录不存在')

    const qty = Number(fresh.qty || 0)
    const available = Number(inv.qty_available || 0)
    const repairing = Number(inv.qty_repairing || 0)
    if (repairing + 0.0001 < qty) fail(400, '维修中数量不足，无法取消')

    const now = new Date()
    await transaction.collection('inventory').doc(invId).update({
      data: {
        qty_available: round4(available + qty),
        qty_repairing: round4(repairing - qty),
        updated_at: now,
      },
    })

    await transaction.collection('inventory_txns').add({
      data: {
        type: '维修取消',
        product_id: fresh.product_id,
        product_name: fresh.product_name,
        sku_code: fresh.sku_code || '',
        warehouse_id: fresh.warehouse_id,
        qty,
        unit_cost: round4(inv.avg_cost || 0),
        amount: round2(qty * Number(inv.avg_cost || 0)),
        ref_type: 'repair',
        ref_id: fresh.no,
        ref_no: fresh.no,
        operator_openid: ctx.openid,
        operator_name: operatorOf(ctx).name,
        note: String(payload.reason || '').trim() || '取消维修',
        created_at: now,
      },
    })

    await transaction.collection('repairs').doc(payload.id).update({
      data: {
        status: '已取消',
        cancel_reason: String(payload.reason || '').trim(),
        completed_at: now,
        updated_at: now,
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'repair',
    action: 'update',
    ref_type: 'repair',
    ref_id: payload.id,
    summary: `取消维修 ${repair.no}`,
  })

  return { ok: true }
}

module.exports = {
  'repair.list': { module: 'repair', action: 'read', handler: list },
  'repair.get': { module: 'repair', action: 'read', handler: get },
  'repair.create': { module: 'repair', action: 'create', handler: create },
  'repair.complete': { module: 'repair', action: 'update', handler: complete },
  'repair.cancel': { module: 'repair', action: 'update', handler: cancel },
}
