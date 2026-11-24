const {
  fail,
  nextNo,
  getDoc,
  audit,
  round2,
  round4,
  fetchAll,
  escapeReg,
  querySorted,
} = require('../lib/util')
const { applyRefund, calcProfit, completedReturns, createRecord, completeRecord } = require('./afterSale')
const { syncOrderCash, removeOrderCash } = require('./cash')
const { assertNoStocktake } = require('./inventory')

const EDITABLE_STATUS = ['待付款', '待发货', '已取消']
const PLATFORMS = ['淘宝', '抖音', '闲鱼', '私域', '线下', '微店']
const FULFILL_MODES = ['自仓', '代发']

const FEE_FIELDS = [
  { key: 'shipping_fee', type: '快递费' },
  { key: 'packaging_fee', type: '包装费' },
  { key: 'gift_cost', type: '赠品' },
  { key: 'referral_fee', type: '介绍费' },
  { key: 'commission', type: '平台佣金' },
  { key: 'payment_fee', type: '支付手续费' },
  { key: 'other_fee', type: '其他' },
]

async function averageCost(db, productId) {
  const res = await db.collection('inventory').where({ product_id: productId }).limit(50).get()
  let qty = 0
  let value = 0
  res.data.forEach((row) => {
    const available = Number(row.qty_available || 0)
    qty += available
    value += available * Number(row.avg_cost || 0)
  })
  return qty > 0 ? round4(value / qty) : 0
}

async function normalizeItems(db, items, fulfillMode) {
  const list = (items || []).filter((item) => item && item.product_id && Number(item.qty) > 0)
  if (!list.length) fail(400, '请至少添加一条商品明细')

  const ids = list.map((item) => item.product_id)
  const products = await fetchAll(db, 'products', { _id: db.command.in(ids) })
  const productMap = {}
  products.forEach((p) => {
    productMap[p._id] = p
  })

  const result = []
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i]
    const product = productMap[item.product_id]
    if (!product) fail(400, '订单明细中存在已删除的商品')
    const qty = Number(item.qty)
    const price = round2(item.price)
    let snapshot = item.cost_snapshot
    const hasSnapshot = snapshot !== undefined && snapshot !== null && snapshot !== ''
    if (fulfillMode === '代发') {
      // 代发以供应商报价为成本，不能回退到自仓平均成本
      if (!hasSnapshot) fail(400, `${product.name} 请填写代发进价`)
      snapshot = round4(snapshot)
    } else if (!hasSnapshot) {
      snapshot = await averageCost(db, item.product_id)
    }
    result.push({
      product_id: item.product_id,
      product_name: product.name,
      sku_code: product.sku_code,
      spec: product.spec || '',
      unit: product.unit || '',
      price,
      qty,
      amount: round2(price * qty),
      cost_snapshot: round4(snapshot),
    })
  }
  return result
}

async function writeExpenses(db, order, orderId) {
  await db.collection('expenses').where({ order_id: orderId }).remove()
  const now = new Date()
  const docs = []
  FEE_FIELDS.forEach((field) => {
    const amount = Number(order[field.key] || 0)
    if (!amount) return
    docs.push({
      type: field.type,
      amount: round2(amount),
      order_id: orderId,
      order_no: order.no,
      platform: order.platform,
      payee: field.key === 'referral_fee' ? order.referral_payee || '' : '',
      occurred_at: order.order_date || now,
      created_at: now,
      source: 'order',
    })
  })
  for (let i = 0; i < docs.length; i += 1) {
    await db.collection('expenses').add({ data: docs[i] })
  }
}

async function list(ctx, payload) {
  const db = ctx.db
  const _ = db.command
  const base = {}
  if (payload.status) base.status = payload.status

  const conditions = []
  if (Object.keys(base).length) conditions.push(base)
  if (payload.keyword) {
    const reg = db.RegExp({ regexp: escapeReg(String(payload.keyword).trim()), options: 'i' })
    conditions.push(_.or([{ no: reg }, { platform_order_no: reg }, { buyer_name: reg }]))
  }

  let created = null
  if (payload.start && payload.end) {
    created = _.gte(new Date(payload.start)).and(_.lte(new Date(payload.end)))
  } else if (payload.start) {
    created = _.gte(new Date(payload.start))
  } else if (payload.end) {
    created = _.lte(new Date(payload.end))
  }
  if (created) conditions.push({ created_at: created })

  let query = {}
  if (conditions.length === 1) query = conditions[0]
  else if (conditions.length > 1) query = _.and(conditions)

  const list = await querySorted(db, 'orders', query, {
    limit: Math.min(100, Number(payload.limit) || 50),
  })
  return { list }
}

async function get(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  const expenses = await db.collection('expenses').where({ order_id: payload.id }).limit(50).get()

  let afterSales = []
  try {
    const res = await db.collection('after_sales').where({ order_id: payload.id }).limit(50).get()
    afterSales = (res.data || []).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )
  } catch (err) {
    afterSales = []
  }

  const returnedMap = {}
  afterSales
    .filter((row) => row.status === '已完成')
    .forEach((row) => {
      ;(row.items || []).forEach((item) => {
        returnedMap[item.product_id] = round4((returnedMap[item.product_id] || 0) + Number(item.qty || 0))
      })
    })
  const items = (order.items || []).map((item) => {
    const returned = returnedMap[item.product_id] || 0
    return {
      ...item,
      returned_qty: round4(returned),
      remaining_qty: round4(Math.max(0, Number(item.qty || 0) - returned)),
    }
  })

  return { order: { ...order, items }, expenses: expenses.data, afterSales }
}

async function save(ctx, payload) {
  const db = ctx.db
  const fulfillMode = FULFILL_MODES.indexOf(payload.fulfill_mode) >= 0 ? payload.fulfill_mode : '自仓'
  const items = await normalizeItems(db, payload.items, fulfillMode)

  let supplier = null
  if (fulfillMode === '代发') {
    if (!payload.supplier_id) fail(400, '代发订单请选择供应商')
    supplier = await getDoc(db, 'suppliers', payload.supplier_id)
  }

  const status =
    payload.status && EDITABLE_STATUS.indexOf(payload.status) >= 0 ? payload.status : '待发货'
  const platform = PLATFORMS.indexOf(payload.platform) >= 0 ? payload.platform : '私域'
  const goodsAmount = round2(items.reduce((sum, item) => sum + item.amount, 0))
  const discount = round2(payload.discount)
  const paidAmount =
    payload.paid_amount === undefined || payload.paid_amount === null || payload.paid_amount === ''
      ? round2(goodsAmount - discount)
      : round2(payload.paid_amount)

  const fees = {}
  FEE_FIELDS.forEach((field) => {
    fees[field.key] = round2(payload[field.key])
  })

  const goodsCost = round2(items.reduce((sum, item) => sum + item.cost_snapshot * item.qty, 0))
  const feeTotal = round2(
    FEE_FIELDS.reduce((sum, field) => sum + fees[field.key], 0)
  )
  const dropshipFreight = fulfillMode === '代发' ? round2(payload.dropship_freight) : 0
  const supplierPayable = fulfillMode === '代发' ? round2(goodsCost + dropshipFreight) : 0

  const before = payload.id ? await getDoc(db, 'orders', payload.id) : null
  const profitInfo = calcProfit({
    paid_amount: paidAmount,
    goods_cost: goodsCost,
    fee_total: feeTotal,
    dropship_freight: dropshipFreight,
    refund_amount: before ? before.refund_amount : 0,
    refund_cost: before ? before.refund_cost : 0,
  })

  const fields = {
    platform,
    platform_order_no: payload.platform_order_no || '',
    buyer_name: payload.buyer_name || '',
    buyer_phone: payload.buyer_phone || '',
    address: payload.address || '',
    status,
    fulfill_mode: fulfillMode,
    supplier_id: fulfillMode === '代发' ? payload.supplier_id : '',
    supplier_name: fulfillMode === '代发' ? supplier.name : '',
    warehouse_id: payload.warehouse_id || '',
    goods_amount: goodsAmount,
    discount,
    paid_amount: paidAmount,
    referral_payee: payload.referral_payee || '',
    goods_cost: goodsCost,
    fee_total: feeTotal,
    dropship_freight: dropshipFreight,
    supplier_payable: supplierPayable,
    net_paid: profitInfo.net_paid,
    profit: profitInfo.profit,
    profit_rate: profitInfo.profit_rate,
    items,
    note: payload.note || '',
    order_date: payload.order_date ? new Date(payload.order_date) : new Date(),
    updated_at: new Date(),
  }
  FEE_FIELDS.forEach((field) => {
    fields[field.key] = fees[field.key]
  })

  if (payload.id) {
    if (['已发货', '已完成', '已退款'].indexOf(before.status) >= 0) {
      fail(400, '已发货或已完成的订单不能直接修改，请走退款流程')
    }
    if (fulfillMode !== '代发' && Number(before.supplier_paid_amount || 0) > 0) {
      fail(400, '已结算过供应商货款的代发订单不能改为自仓发货')
    }
    fields.refund_amount = round2(before.refund_amount)
    fields.refund_cost = round2(before.refund_cost)
    fields.loss_amount = round2(before.loss_amount)
    fields.refund_status = before.refund_status || ''
    if (status !== '已取消') {
      fields.cancelled_at = null
      fields.cancel_reason = ''
    }
    if (fulfillMode === '代发') {
      const paid = round2(before.supplier_paid_amount)
      fields.supplier_paid_amount = paid
      fields.supplier_pay_status =
        supplierPayable <= 0
          ? ''
          : paid <= 0
            ? '未结算'
            : paid >= supplierPayable - 0.01
              ? '已结算'
              : '部分结算'
      fields.supplier_payments = before.supplier_payments || []
    } else {
      fields.supplier_paid_amount = 0
      fields.supplier_pay_status = ''
      fields.supplier_payments = []
    }
    await db.collection('orders').doc(payload.id).update({ data: fields })
    await writeExpenses(db, { ...fields, no: before.no, order_date: fields.order_date }, payload.id)
    await syncOrderCash(db, { ...fields, _id: payload.id, no: before.no })
    await audit(db, ctx.user, {
      module: 'order',
      action: 'update',
      ref_type: 'order',
      ref_id: payload.id,
      summary: `修改订单 ${before.no}`,
      before: { paid_amount: before.paid_amount, profit: before.profit, status: before.status },
      after: { paid_amount: fields.paid_amount, profit: fields.profit, status: fields.status },
    })
    return { id: payload.id, no: before.no }
  }

  fields.no = await nextNo(db, 'SO')
  fields.created_at = new Date()
  fields.shipped_at = null
  fields.refund_amount = 0
  fields.refund_cost = 0
  fields.loss_amount = 0
  fields.refund_status = ''
  fields.supplier_paid_amount = 0
  fields.supplier_pay_status = fulfillMode === '代发' ? '未结算' : ''
  fields.supplier_payments = []
  const res = await db.collection('orders').add({ data: fields })
  await writeExpenses(db, fields, res._id)
  await syncOrderCash(db, { ...fields, _id: res._id })
  await audit(db, ctx.user, {
    module: 'order',
    action: 'create',
    ref_type: 'order',
    ref_id: res._id,
    summary: `新建订单 ${fields.no}，实收 ${fields.paid_amount}${fulfillMode === '代发' ? '（代发）' : ''}`,
    after: { no: fields.no, paid_amount: fields.paid_amount, profit: fields.profit },
  })
  return { id: res._id, no: fields.no }
}

async function update(ctx, payload) {
  if (!payload.id) fail(400, '缺少订单 ID')
  return save(ctx, payload)
}

async function ship(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  if (order.status !== '待发货' && order.status !== '待付款') {
    fail(400, `订单当前状态为「${order.status}」，不能发货`)
  }
  const trackingNo = String(payload.tracking_no || '').trim()
  if (!trackingNo) fail(400, '请填写快递单号')

  if (order.fulfill_mode === '代发') {
    // 代发由供应商直发，不占用自仓库存，也不产生销售出库流水
    let shippedNo = order.no
    let supplierName = order.supplier_name || ''
    await db.runTransaction(async (transaction) => {
      const res = await transaction.collection('orders').doc(payload.id).get()
      const fresh = res.data
      if (fresh.status !== '待发货' && fresh.status !== '待付款') {
        fail(400, `订单当前状态为「${fresh.status}」，不能发货`)
      }
      shippedNo = fresh.no
      supplierName = fresh.supplier_name || ''
      await transaction.collection('orders').doc(payload.id).update({
        data: {
          status: '已发货',
          ship_mode: '代发',
          tracking_no: trackingNo,
          shipped_at: new Date(),
          updated_at: new Date(),
        },
      })
    })
    await audit(db, ctx.user, {
      module: 'order',
      action: 'ship',
      ref_type: 'order',
      ref_id: payload.id,
      summary: `订单 ${shippedNo} 供应商代发发货（${supplierName || '未填供应商'}），快递单号 ${trackingNo}`,
    })
    return { ok: true, dropship: true }
  }

  await assertNoStocktake(db, '销售出库')
  let warehouseId = payload.warehouse_id || order.warehouse_id
  if (!warehouseId) {
    const defaults = await fetchAll(db, 'warehouses', { is_default: true })
    if (defaults.length) warehouseId = defaults[0]._id
  }
  if (!warehouseId) {
    const all = await fetchAll(db, 'warehouses', {})
    warehouseId = all.length ? all[0]._id : ''
  }
  if (!warehouseId) fail(400, '请先创建仓库')

  let shippedNo = order.no
  await db.runTransaction(async (transaction) => {
    // 事务内重新读取订单，避免重复点击/并发导致重复扣库存
    const res = await transaction.collection('orders').doc(payload.id).get()
    const fresh = res.data
    if (fresh.status !== '待发货' && fresh.status !== '待付款') {
      fail(400, `订单当前状态为「${fresh.status}」，不能发货`)
    }
    shippedNo = fresh.no
    const txWarehouseId = payload.warehouse_id || fresh.warehouse_id || warehouseId
    const items = fresh.items || []

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      const invId = `${item.product_id}_${txWarehouseId}`
      let inv = null
      try {
        const invRes = await transaction.collection('inventory').doc(invId).get()
        inv = invRes.data
      } catch (err) {
        inv = null
      }
      const available = inv ? Number(inv.qty_available || 0) : 0
      if (available < item.qty) {
        fail(400, `${item.product_name} 库存不足：可用 ${available}，需要 ${item.qty}`)
      }
      const now = new Date()
      await transaction.collection('inventory').doc(invId).update({
        data: { qty_available: round4(available - item.qty), updated_at: now },
      })
      await transaction.collection('inventory_txns').add({
        data: {
          type: '销售出库',
          product_id: item.product_id,
          product_name: item.product_name,
          sku_code: item.sku_code || '',
          warehouse_id: txWarehouseId,
          qty: -item.qty,
          unit_cost: Number(item.cost_snapshot || 0),
          amount: round2(item.cost_snapshot * item.qty),
          ref_type: 'order',
          ref_id: payload.id,
          ref_no: fresh.no,
          tracking_no: trackingNo,
          operator_openid: ctx.openid,
          operator_name: ctx.user ? ctx.user.name : '',
          note: '发货出库',
          created_at: now,
        },
      })
    }

    await transaction.collection('orders').doc(payload.id).update({
      data: {
        status: '已发货',
        warehouse_id: txWarehouseId,
        tracking_no: trackingNo,
        shipped_at: new Date(),
        updated_at: new Date(),
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'order',
    action: 'ship',
    ref_type: 'order',
    ref_id: payload.id,
    summary: `订单 ${shippedNo} 发货，快递单号 ${trackingNo}`,
  })
  return { ok: true }
}

async function complete(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  if (order.status !== '已发货') fail(400, '只有已发货订单可以确认完成')
  await db.collection('orders').doc(payload.id).update({
    data: { status: '已完成', completed_at: new Date(), updated_at: new Date() },
  })
  await audit(db, ctx.user, {
    module: 'order',
    action: 'complete',
    ref_type: 'order',
    ref_id: payload.id,
    summary: `订单 ${order.no} 完成`,
  })
  return { ok: true }
}

async function refund(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  if (['已退款', '已取消'].indexOf(order.status) >= 0) fail(400, '订单已退款或已取消')

  const returned = await completedReturns(db, order._id)
  const items = []
  ;(order.items || []).forEach((item) => {
    const remain = round4(Number(item.qty || 0) - (returned[item.product_id] || 0))
    if (remain > 0) items.push({ product_id: item.product_id, qty: remain })
  })
  if (!items.length) fail(400, '订单商品已全部退款')

  const remaining = round2(Number(order.paid_amount || 0) - Number(order.refund_amount || 0))
  if (!(remaining > 0)) fail(400, '订单已无可退金额')

  const shipped = order.status === '已发货' || order.status === '已完成' || !!order.shipped_at
  const dropship = order.fulfill_mode === '代发'
  const reason = payload.reason || '手工退款'

  // 一键退款同样落一张独立售后单，保证退款、库存回补与毛利冲减口径一致
  const created = await createRecord(ctx, {
    order_id: order._id,
    type: '退货退款',
    items,
    refund_amount: remaining,
    restock: shipped && !dropship,
    warehouse_id: order.warehouse_id,
    reason,
    note: '一键全额退款',
  })
  await completeRecord(ctx, { id: created.id })

  await audit(db, ctx.user, {
    module: 'order',
    action: 'refund',
    ref_type: 'order',
    ref_id: payload.id,
    summary: `订单 ${order.no} 退款 ${remaining}（售后单 ${created.no}${shipped ? '，已回补库存' : ''}）`,
  })
  return { ok: true, after_sale_no: created.no }
}

async function settleSupplier(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  if (order.fulfill_mode !== '代发') fail(400, '只有代发订单需要结算供应商货款')

  const payable = round2(order.supplier_payable)
  const paid = round2(order.supplier_paid_amount)
  const remain = round2(payable - paid)
  const amount =
    payload.amount === undefined || payload.amount === null || payload.amount === ''
      ? remain
      : round2(payload.amount)
  if (!(amount > 0)) fail(400, '结算金额必须大于 0')
  if (amount > remain + 0.01) fail(400, `结算金额超过未结金额 ${remain}`)

  let account = null
  if (payload.account_id) account = await getDoc(db, 'cash_accounts', payload.account_id)

  const newPaid = round2(paid + amount)
  const payments = (order.supplier_payments || []).concat([
    {
      amount,
      account_id: account ? account._id : '',
      account_name: account ? account.name : '未指定账户',
      note: payload.note || '',
      paid_at: new Date(),
      operator_openid: ctx.openid,
      operator_name: ctx.user ? ctx.user.name : '',
    },
  ])

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
        note: payload.note || `代发货款 ${order.no}`,
        occurred_at: new Date(),
        ref_type: 'order',
        ref_id: payload.id,
        ref_no: order.no,
        operator_openid: ctx.openid,
        operator_name: ctx.user ? ctx.user.name : '',
        created_at: new Date(),
      },
    })
  }

  await db.collection('orders').doc(payload.id).update({
    data: {
      supplier_paid_amount: newPaid,
      supplier_pay_status: newPaid >= payable - 0.01 ? '已结算' : '部分结算',
      supplier_payments: payments,
      updated_at: new Date(),
    },
  })

  await audit(db, ctx.user, {
    module: 'order',
    action: 'settle',
    ref_type: 'order',
    ref_id: payload.id,
    summary: `代发订单 ${order.no} 结算供应商 ${amount}，未结 ${round2(payable - newPaid)}`,
    before: { supplier_paid_amount: paid },
    after: { supplier_paid_amount: newPaid },
  })

  return { ok: true, supplier_paid_amount: newPaid, remaining: round2(payable - newPaid) }
}

async function cancel(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  if (['待付款', '待发货'].indexOf(order.status) < 0) {
    fail(400, `订单当前状态为「${order.status}」，不能取消`)
  }
  if (round2(Number(order.paid_amount || 0) - Number(order.refund_amount || 0)) > 0.01) {
    fail(400, '该订单已收款，请通过退款流程处理')
  }

  let fresh = null
  await db.runTransaction(async (transaction) => {
    const res = await transaction.collection('orders').doc(payload.id).get()
    fresh = res.data
    if (['待付款', '待发货'].indexOf(fresh.status) < 0) {
      fail(400, `订单当前状态为「${fresh.status}」，不能取消`)
    }
    if (round2(Number(fresh.paid_amount || 0) - Number(fresh.refund_amount || 0)) > 0.01) {
      fail(400, '该订单已收款，请通过退款流程处理')
    }
    await transaction.collection('orders').doc(payload.id).update({
      data: {
        status: '已取消',
        cancelled_at: new Date(),
        cancel_reason: payload.reason || '',
        updated_at: new Date(),
      },
    })
  })

  await syncOrderCash(db, { ...fresh, status: '已取消' })
  await audit(db, ctx.user, {
    module: 'order',
    action: 'update',
    ref_type: 'order',
    ref_id: payload.id,
    summary: `取消订单 ${order.no}${payload.reason ? '（' + payload.reason + '）' : ''}`,
    before: { status: order.status },
    after: { status: '已取消' },
  })
  return { ok: true }
}

async function remove(ctx, payload) {
  const db = ctx.db
  const order = await getDoc(db, 'orders', payload.id)
  if (['待付款', '已取消'].indexOf(order.status) < 0) {
    fail(400, '只有待付款或已取消的订单可以删除')
  }
  await db.collection('expenses').where({ order_id: payload.id }).remove()
  await removeOrderCash(db, payload.id)
  await db.collection('orders').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'order',
    action: 'delete',
    ref_type: 'order',
    ref_id: payload.id,
    summary: `删除订单 ${order.no}`,
  })
  return { ok: true }
}

module.exports = {
  'order.list': { module: 'order', action: 'read', handler: list },
  'order.get': { module: 'order', action: 'read', handler: get },
  'order.save': { module: 'order', action: 'create', handler: save },
  'order.update': { module: 'order', action: 'update', handler: update },
  'order.ship': { module: 'order', action: 'ship', handler: ship },
  'order.complete': { module: 'order', action: 'update', handler: complete },
  'order.cancel': { module: 'order', action: 'update', handler: cancel },
  'order.refund': { module: 'order', action: 'refund', handler: refund },
  'order.settleSupplier': { module: 'order', action: 'settle', handler: settleSupplier },
  'order.remove': { module: 'order', action: 'delete', handler: remove },
}
