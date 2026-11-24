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

const EDITABLE_STATUS = ['草稿', '已下单', '在途']

async function list(ctx, payload) {
  const db = ctx.db
  let query = {}
  if (payload.status) query.status = payload.status
  if (payload.supplier_id) query.supplier_id = payload.supplier_id
  const res = {
    list: await querySorted(db, 'purchase_orders', query, { limit: 100 }),
  }
  return res
}

async function get(ctx, payload) {
  const order = await getDoc(ctx.db, 'purchase_orders', payload.id)
  const warehouse = order.warehouse_id
    ? await ctx.db.collection('warehouses').doc(order.warehouse_id).get().then((r) => r.data).catch(() => null)
    : null
  return { order, warehouse }
}

async function normalizeItems(db, items, warehouseId) {
  const list = (items || []).filter((item) => item && item.product_id && Number(item.qty) > 0)
  if (!list.length) fail(400, '请至少添加一条有效采购明细')

  const ids = list.map((item) => item.product_id)
  const products = await fetchAll(db, 'products', { _id: db.command.in(ids) })
  const productMap = {}
  products.forEach((p) => {
    productMap[p._id] = p
  })

  return list.map((item) => {
    const product = productMap[item.product_id]
    if (!product) fail(400, '采购明细中存在已删除的商品')
    const qty = Number(item.qty)
    const unitPrice = round2(item.unit_price)
    if (!(unitPrice > 0)) fail(400, `${product.name} 请填写采购单价，入库成本必须大于 0`)
    return {
      product_id: item.product_id,
      product_name: product.name,
      sku_code: product.sku_code,
      spec: product.spec || '',
      unit: product.unit || '',
      qty,
      unit_price: unitPrice,
      amount: round2(qty * unitPrice),
      received_qty: 0,
      received_extra: 0,
      warehouse_id: item.warehouse_id || warehouseId || '',
    }
  })
}

async function save(ctx, payload) {
  const db = ctx.db

  if (payload.id) {
    const before = await getDoc(db, 'purchase_orders', payload.id)
    const received =
      before.status === '已入库' || (before.items || []).some((item) => Number(item.received_qty || 0) > 0)
    if (received) {
      // 已入库后只允许补录/修改采购渠道与物流信息，商品、价格、数量一律锁定
      await db.collection('purchase_orders').doc(payload.id).update({
        data: {
          purchase_channel: String(payload.purchase_channel || '').trim(),
          channel_order_no: String(payload.channel_order_no || '').trim(),
          tracking_no: String(payload.tracking_no || '').trim(),
          updated_at: new Date(),
        },
      })
      await audit(db, ctx.user, {
        module: 'purchase',
        action: 'update',
        ref_type: 'purchase_order',
        ref_id: payload.id,
        summary: `更新采购单 ${before.no} 的渠道与物流信息`,
        before: {
          purchase_channel: before.purchase_channel || '',
          channel_order_no: before.channel_order_no || '',
          tracking_no: before.tracking_no || '',
        },
        after: {
          purchase_channel: String(payload.purchase_channel || '').trim(),
          channel_order_no: String(payload.channel_order_no || '').trim(),
          tracking_no: String(payload.tracking_no || '').trim(),
        },
      })
      return { id: payload.id, no: before.no }
    }
  }

  if (!payload.supplier_id) fail(400, '请选择供应商')

  const status = payload.status && EDITABLE_STATUS.indexOf(payload.status) >= 0 ? payload.status : '已下单'
  const items = await normalizeItems(db, payload.items, payload.warehouse_id)
  const goodsAmount = round2(items.reduce((sum, item) => sum + item.amount, 0))
  const freight = round2(payload.freight)
  const otherCost = round2(payload.other_cost)

  const fields = {
    supplier_id: payload.supplier_id,
    supplier_name: payload.supplier_name || '',
    warehouse_id: payload.warehouse_id || '',
    purchase_channel: String(payload.purchase_channel || '').trim(),
    channel_order_no: String(payload.channel_order_no || '').trim(),
    tracking_no: String(payload.tracking_no || '').trim(),
    status,
    freight,
    other_cost: otherCost,
    goods_amount: goodsAmount,
    total_cost: round2(goodsAmount + freight + otherCost),
    note: payload.note || '',
    items,
    updated_at: new Date(),
  }

  if (payload.id) {
    const before = await getDoc(db, 'purchase_orders', payload.id)
    await db.collection('purchase_orders').doc(payload.id).update({ data: fields })
    await audit(db, ctx.user, {
      module: 'purchase',
      action: 'update',
      ref_type: 'purchase_order',
      ref_id: payload.id,
      summary: `修改采购单 ${before.no}`,
      before: { status: before.status, total_cost: before.total_cost },
      after: { status: fields.status, total_cost: fields.total_cost },
    })
    return { id: payload.id, no: before.no }
  }

  fields.no = await nextNo(db, 'CG')
  fields.created_at = new Date()
  fields.received_at = null
  fields.received_cost = 0
  fields.paid_amount = 0
  fields.pay_status = '未付款'
  fields.payments = []
  const res = await db.collection('purchase_orders').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'purchase',
    action: 'create',
    ref_type: 'purchase_order',
    ref_id: res._id,
    summary: `新建采购单 ${fields.no}`,
    after: { no: fields.no, supplier_id: fields.supplier_id, total_cost: fields.total_cost },
  })
  return { id: res._id, no: fields.no }
}

async function readInventory(transaction, id) {
  try {
    const res = await transaction.collection('inventory').doc(id).get()
    return res.data
  } catch (err) {
    return null
  }
}

async function receive(ctx, payload) {
  const db = ctx.db
  await assertNoStocktake(db, '采购入库')
  const order = await getDoc(db, 'purchase_orders', payload.id)
  if (order.status === '已入库') fail(400, '该采购单已全部入库，请勿重复操作')

  let warehouseId = payload.warehouse_id || order.warehouse_id
  if (!warehouseId) {
    const defaults = await fetchAll(db, 'warehouses', { is_default: true })
    if (defaults.length) warehouseId = defaults[0]._id
  }
  if (!warehouseId) fail(400, '请先选择入库仓库')

  const items = order.items || []
  if (!items.length) fail(400, '采购单没有明细')

  const explicit = Array.isArray(payload.items) && payload.items.length > 0
  const batchMap = {}
  if (explicit) {
    payload.items.forEach((item) => {
      if (item && item.product_id) batchMap[item.product_id] = Number(item.qty) || 0
    })
  }

  const goodsAmount = round2(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
  const extraTotal = round2(Number(order.freight || 0) + Number(order.other_cost || 0))
  let allocatedExtra = 0
  const plan = []

  items.forEach((item, index) => {
    const qty = Number(item.qty || 0)
    if (qty <= 0) return
    const received = Number(item.received_qty || 0)
    const remaining = round4(qty - received)
    const batch = explicit ? batchMap[item.product_id] || 0 : remaining
    if (batch < 0) fail(400, `${item.product_name} 收货数量不能为负`)
    if (batch > remaining) fail(400, `${item.product_name} 本次收货超过未到数量 ${remaining}`)
    if (!(batch > 0)) return
    if (!(Number(item.unit_price || 0) > 0)) {
      fail(400, `${item.product_name} 采购单价为 0，请先补充采购单价后再入库`)
    }

    const isLast = index === items.length - 1
    const extraFull = isLast
      ? round2(extraTotal - allocatedExtra)
      : round2(goodsAmount > 0 ? (extraTotal * Number(item.amount || 0)) / goodsAmount : extraTotal / items.length)
    allocatedExtra = round2(allocatedExtra + extraFull)

    const done = round4(received + batch) >= qty
    const extraPrev = Number(item.received_extra || 0)
    const extraBatch = done ? round2(extraFull - extraPrev) : round2((extraFull * batch) / qty)
    const batchGoods = round2(Number(item.unit_price || 0) * batch)
    const totalCost = round2(batchGoods + extraBatch)

    plan.push({
      item,
      batch,
      totalCost,
      unitCost: round4(batch > 0 ? totalCost / batch : 0),
      receivedNext: round4(received + batch),
      extraNext: round2(extraPrev + extraBatch),
    })
  })

  if (!plan.length) fail(400, '请填写本次收货数量')

  const batchTotal = round2(plan.reduce((sum, entry) => sum + entry.totalCost, 0))
  const newItems = items.map((item) => {
    const entry = plan.find((row) => row.item.product_id === item.product_id)
    if (!entry) return item
    return { ...item, received_qty: entry.receivedNext, received_extra: entry.extraNext }
  })
  const allDone = newItems.every((item) => Number(item.received_qty || 0) >= Number(item.qty || 0))

  await db.runTransaction(async (transaction) => {
    for (let i = 0; i < plan.length; i += 1) {
      const entry = plan[i]
      const item = entry.item
      const invId = `${item.product_id}_${warehouseId}`
      const inv = await readInventory(transaction, invId)
      const oldQty = inv ? Number(inv.qty_available || 0) : 0
      const oldAvg = inv ? Number(inv.avg_cost || 0) : 0
      const newQty = oldQty + entry.batch
      const newAvg = newQty > 0 ? round4((oldQty * oldAvg + entry.totalCost) / newQty) : entry.unitCost
      const now = new Date()

      if (inv) {
        await transaction.collection('inventory').doc(invId).update({
          data: {
            qty_available: newQty,
            avg_cost: newAvg,
            last_in_at: now,
            updated_at: now,
          },
        })
      } else {
        await transaction.collection('inventory').doc(invId).set({
          data: {
            product_id: item.product_id,
            warehouse_id: warehouseId,
            qty_available: newQty,
            qty_locked: 0,
            qty_in_transit: 0,
            avg_cost: newAvg,
            last_in_at: now,
            created_at: now,
            updated_at: now,
          },
        })
      }

      await transaction.collection('inventory_txns').add({
        data: {
          type: '采购入库',
          product_id: item.product_id,
          product_name: item.product_name,
          sku_code: item.sku_code || '',
          warehouse_id: warehouseId,
          qty: entry.batch,
          unit_cost: entry.unitCost,
          amount: entry.totalCost,
          ref_type: 'purchase_order',
          ref_id: payload.id,
          ref_no: order.no,
          purchase_channel: order.purchase_channel || '',
          channel_order_no: order.channel_order_no || '',
          tracking_no: order.tracking_no || '',
          operator_openid: ctx.openid,
          operator_name: ctx.user ? ctx.user.name : '',
          note: allDone ? '含分摊运费与采购费用' : '分批到货，含分摊运费与采购费用',
          created_at: now,
        },
      })
    }

    await transaction.collection('purchase_orders').doc(payload.id).update({
      data: {
        items: newItems,
        status: allDone ? '已入库' : '部分到货',
        warehouse_id: warehouseId,
        received_at: new Date(),
        received_cost: round2(Number(order.received_cost || 0) + batchTotal),
        updated_at: new Date(),
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'purchase',
    action: 'receive',
    ref_type: 'purchase_order',
    ref_id: payload.id,
    summary: `采购单 ${order.no} ${allDone ? '全部入库' : '分批入库'}，本次成本 ${batchTotal}`,
    after: { status: allDone ? '已入库' : '部分到货', batch_total: batchTotal },
  })

  return { ok: true, warehouse_id: warehouseId, partial: !allDone, batch_total: batchTotal }
}

async function pay(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'purchase_orders', payload.id)
  const amount = round2(payload.amount)
  if (!(amount > 0)) fail(400, '付款金额必须大于 0')

  const total = round2(order.total_cost)
  const paid = round2(order.paid_amount)
  const remaining = round2(total - paid)
  if (total <= 0) fail(400, '采购单总成本为 0，无需付款')
  if (remaining <= 0) fail(400, '该采购单已付清')
  if (amount > remaining + 0.01) fail(400, `付款金额超过未付金额 ${remaining}`)

  let account = null
  if (payload.account_id) {
    account = await getDoc(db, 'cash_accounts', payload.account_id)
  }

  const payment = {
    amount,
    account_id: account ? account._id : '',
    account_name: account ? account.name : '未指定账户',
    note: payload.note || '',
    paid_at: new Date(),
    operator_openid: ctx.openid,
    operator_name: ctx.user ? ctx.user.name : '',
  }
  const newPaid = round2(paid + amount)
  const payStatus = newPaid >= total - 0.01 ? '已付款' : '部分付款'
  const payments = (order.payments || []).concat([payment])

  if (account) {
    try {
      await db.createCollection('cash_txns')
    } catch (err) {
      // 集合已存在
    }
    await db.collection('cash_txns').add({
      data: {
        type: '支出',
        amount,
        category: '采购付款',
        account_id: account._id,
        account_name: account.name,
        note: payment.note || `采购付款 ${order.no}`,
        occurred_at: payment.paid_at,
        ref_type: 'purchase_order',
        ref_id: payload.id,
        ref_no: order.no,
        operator_openid: ctx.openid,
        operator_name: ctx.user ? ctx.user.name : '',
        created_at: new Date(),
      },
    })
  }

  await db.collection('purchase_orders').doc(payload.id).update({
    data: {
      paid_amount: newPaid,
      pay_status: payStatus,
      payments,
      updated_at: new Date(),
    },
  })

  await audit(db, ctx.user, {
    module: 'purchase',
    action: 'pay',
    ref_type: 'purchase_order',
    ref_id: payload.id,
    summary: `采购单 ${order.no} 付款 ${amount}，剩余 ${round2(total - newPaid)}`,
    before: { paid_amount: paid, pay_status: order.pay_status || '未付款' },
    after: { paid_amount: newPaid, pay_status: payStatus },
  })

  return { ok: true, paid_amount: newPaid, pay_status: payStatus, remaining: round2(total - newPaid) }
}

async function remove(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'purchase_orders', payload.id)
  if (order.status === '已入库' || (order.items || []).some((item) => Number(item.received_qty || 0) > 0)) {
    fail(400, '已部分或全部入库的采购单不能删除')
  }
  await db.collection('purchase_orders').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'purchase',
    action: 'delete',
    ref_type: 'purchase_order',
    ref_id: payload.id,
    summary: `删除采购单 ${order.no}`,
  })
  return { ok: true }
}

module.exports = {
  'purchase.list': { module: 'purchase', action: 'read', handler: list },
  'purchase.get': { module: 'purchase', action: 'read', handler: get },
  'purchase.save': { module: 'purchase', action: 'create', handler: save },
  'purchase.receive': { module: 'purchase', action: 'receive', handler: receive },
  'purchase.pay': { module: 'purchase', action: 'pay', handler: pay },
  'purchase.remove': { module: 'purchase', action: 'delete', handler: remove },
}
