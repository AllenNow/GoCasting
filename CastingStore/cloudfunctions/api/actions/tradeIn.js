const {
  fail,
  nextNo,
  getDoc,
  audit,
  round2,
  round4,
  fetchAll,
  querySorted,
} = require('../lib/util')
const { assertNoStocktake } = require('./inventory')

const STATUS = ['待回收', '待处置', '维修中', '已维修', '已拆解', '已取消']

async function ensureCollection(db) {
  try {
    await db.createCollection('trade_ins')
  } catch (err) {
    // 集合已存在时忽略
  }
}

function operatorOf(ctx) {
  return { openid: ctx.openid, name: ctx.user ? ctx.user.name : '' }
}

function oldRodName(tradeIn) {
  const parts = [tradeIn.old_brand, tradeIn.old_model, tradeIn.old_spec]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  return `${parts.length ? parts.join(' ') : '旧竿'} 故障回收`
}

async function list(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const query = {}
  if (payload.status && STATUS.indexOf(payload.status) >= 0) query.status = payload.status
  if (payload.order_id) query.order_id = payload.order_id
  let rows = []
  try {
    rows = await querySorted(db, 'trade_ins', query, { limit: Math.min(100, Number(payload.limit) || 50) })
  } catch (err) {
    rows = []
  }
  return { list: rows }
}

async function get(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const tradeIn = await getDoc(db, 'trade_ins', payload.id)

  let order = null
  if (tradeIn.order_id) {
    try {
      order = await getDoc(db, 'orders', tradeIn.order_id)
    } catch (err) {
      order = null
    }
  }
  let repair = null
  if (tradeIn.repair_id) {
    try {
      repair = await getDoc(db, 'repairs', tradeIn.repair_id)
    } catch (err) {
      repair = null
    }
  }
  let dismantle = null
  if (tradeIn.dismantle_id) {
    try {
      dismantle = await getDoc(db, 'dismantles', tradeIn.dismantle_id)
    } catch (err) {
      dismantle = null
    }
  }
  return { tradeIn, order, repair, dismantle }
}

async function findOrCreateRod(db, tradeIn) {
  const name = oldRodName(tradeIn)
  const exists = await fetchAll(db, 'products', { name, condition: '故障' })
  if (exists.length) return exists[0]

  const now = new Date()
  const fields = {
    sku_code: await nextNo(db, 'SKU'),
    name,
    category: '鱼竿',
    brand: String(tradeIn.old_brand || '').trim(),
    condition: '故障',
    item_type: '整竿',
    spec: String(tradeIn.old_spec || '').trim(),
    unit: '件',
    barcode: '',
    safety_stock: 0,
    status: '在售',
    note: `以旧换新回收 ${tradeIn.no}`,
    created_at: now,
    updated_at: now,
  }
  const res = await db.collection('products').add({ data: fields })
  return { ...fields, _id: res._id }
}

async function defaultWarehouse(db) {
  const defaults = await fetchAll(db, 'warehouses', { is_default: true })
  if (defaults.length) return defaults[0]._id
  const all = await fetchAll(db, 'warehouses', {})
  return all.length ? all[0]._id : ''
}

/**
 * 旧竿回收入库：按折价金额作为库存成本入账，状态改为待处置。
 * 订单保存阶段只登记回收单，不动库存，避免订单与库存跨集合的原子性问题。
 */
async function intake(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  await assertNoStocktake(db, '旧竿回收入库')

  const tradeIn = await getDoc(db, 'trade_ins', payload.id)
  if (tradeIn.status !== '待回收') {
    fail(400, `回收单当前状态为「${tradeIn.status}」，不能入库`)
  }

  const qty = round4(payload.qty === undefined || payload.qty === null || payload.qty === '' ? 1 : payload.qty)
  if (!(qty > 0)) fail(400, '请填写回收数量')

  const credit = round2(tradeIn.credit_amount)
  if (!(credit >= 0)) fail(400, '回收单折价金额异常')

  let warehouseId = payload.warehouse_id || tradeIn.warehouse_id || (await defaultWarehouse(db))
  if (!warehouseId) fail(400, '请先创建仓库')
  const warehouse = await getDoc(db, 'warehouses', warehouseId)

  let product = null
  if (payload.product_id) {
    product = await getDoc(db, 'products', payload.product_id)
  } else if (tradeIn.product_id) {
    product = await getDoc(db, 'products', tradeIn.product_id)
  } else {
    product = await findOrCreateRod(db, tradeIn)
  }

  const unitCost = round4(credit / qty)
  const invId = `${product._id}_${warehouseId}`

  await db.runTransaction(async (transaction) => {
    const freshRes = await transaction.collection('trade_ins').doc(payload.id).get()
    const fresh = freshRes.data
    if (fresh.status !== '待回收') fail(400, `回收单当前状态为「${fresh.status}」，不能入库`)

    let inv = null
    try {
      const res = await transaction.collection('inventory').doc(invId).get()
      inv = res.data
    } catch (err) {
      inv = null
    }

    const now = new Date()
    const oldQty = inv ? Number(inv.qty_available || 0) : 0
    const oldAvg = inv ? Number(inv.avg_cost || 0) : 0
    const newQty = round4(oldQty + qty)
    const newAvg = newQty > 0 ? round4((oldQty * oldAvg + credit) / newQty) : unitCost

    if (inv) {
      await transaction.collection('inventory').doc(invId).update({
        data: { qty_available: newQty, avg_cost: newAvg, last_in_at: now, updated_at: now },
      })
    } else {
      await transaction.collection('inventory').doc(invId).set({
        data: {
          product_id: product._id,
          warehouse_id: warehouseId,
          qty_available: newQty,
          qty_locked: 0,
          qty_in_transit: 0,
          qty_repairing: 0,
          avg_cost: newAvg,
          last_in_at: now,
          created_at: now,
          updated_at: now,
        },
      })
    }

    await transaction.collection('inventory_txns').add({
      data: {
        type: '回收入库',
        product_id: product._id,
        product_name: product.name,
        sku_code: product.sku_code || '',
        warehouse_id: warehouseId,
        qty,
        unit_cost: unitCost,
        amount: credit,
        ref_type: 'trade_in',
        ref_id: payload.id,
        ref_no: fresh.no,
        operator_openid: ctx.openid,
        operator_name: operatorOf(ctx).name,
        note: `以旧换新回收（订单 ${fresh.order_no}）`,
        created_at: now,
      },
    })

    await transaction.collection('trade_ins').doc(payload.id).update({
      data: {
        status: '待处置',
        product_id: product._id,
        product_name: product.name,
        sku_code: product.sku_code || '',
        warehouse_id: warehouseId,
        warehouse_name: warehouse.name,
        qty,
        intake_at: now,
        updated_at: now,
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'tradeIn',
    action: 'create',
    ref_type: 'trade_in',
    ref_id: payload.id,
    summary: `回收单 ${tradeIn.no} 入库：${product.name} ${qty}，折价 ${credit}`,
    after: { product_id: product._id, qty, unit_cost: unitCost, warehouse_id: warehouseId },
  })

  return { ok: true, product_id: product._id, product_name: product.name, unit_cost: unitCost }
}

/**
 * 取消回收：仅未入库的回收单可以取消。
 */
async function cancel(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const tradeIn = await getDoc(db, 'trade_ins', payload.id)
  if (tradeIn.status !== '待回收') {
    fail(400, `回收单当前状态为「${tradeIn.status}」，已入库不能取消`)
  }

  if (tradeIn.order_id) {
    let order = null
    try {
      order = await getDoc(db, 'orders', tradeIn.order_id)
    } catch (err) {
      order = null
    }
    if (order && order.status !== '已取消') {
      fail(400, '订单仍在进行中，请先取消订单或在订单中改为普通业务')
    }
  }

  await db.runTransaction(async (transaction) => {
    const freshRes = await transaction.collection('trade_ins').doc(payload.id).get()
    const fresh = freshRes.data
    if (fresh.status !== '待回收') fail(400, `回收单当前状态为「${fresh.status}」，已入库不能取消`)
    await transaction.collection('trade_ins').doc(payload.id).update({
      data: {
        status: '已取消',
        cancel_reason: String(payload.reason || '').trim(),
        updated_at: new Date(),
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'tradeIn',
    action: 'update',
    ref_type: 'trade_in',
    ref_id: payload.id,
    summary: `取消回收单 ${tradeIn.no}`,
  })

  return { ok: true }
}

module.exports = {
  ensureCollection,
  'tradeIn.list': { module: 'tradeIn', action: 'read', handler: list },
  'tradeIn.get': { module: 'tradeIn', action: 'read', handler: get },
  'tradeIn.intake': { module: 'tradeIn', action: 'create', handler: intake },
  'tradeIn.cancel': { module: 'tradeIn', action: 'update', handler: cancel },
}
