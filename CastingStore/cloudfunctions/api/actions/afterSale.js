const {
  fail,
  nextNo,
  getDoc,
  audit,
  round2,
  round4,
  fetchAll,
} = require('../lib/util')
const { assertNoStocktake } = require('./inventory')
const { syncOrderCash } = require('./cash')

const STATUS = ['待处理', '已完成', '已拒绝']
const TYPES = ['退货退款', '仅退款']

async function ensureCollection(db) {
  try {
    await db.createCollection('after_sales')
  } catch (err) {
    // 集合已存在
  }
}

function isShipped(order) {
  return order.status === '已发货' || order.status === '已完成' || !!order.shipped_at
}

function isDropship(order) {
  return order.fulfill_mode === '代发'
}

async function completedReturns(db, orderId) {
  const map = {}
  try {
    const list = await fetchAll(db, 'after_sales', { order_id: orderId })
    list
      .filter((row) => row.status === '已完成')
      .forEach((row) => {
        ;(row.items || []).forEach((item) => {
          if (!item.product_id) return
          map[item.product_id] = round4((map[item.product_id] || 0) + Number(item.qty || 0))
        })
      })
  } catch (err) {
    return map
  }
  return map
}

/**
 * 统一毛利口径：实收（现金）+ 旧竿折价 - 退款 - 净商品成本 - 代发运费 - 可归因费用。
 * 以旧换新的旧竿按折价单独入库存成本，因此毛利必须把折价加回收入，避免重复扣减。
 * 代发订单的商品成本使用代发进价快照，不占用自仓库存。
 */
function calcProfit(fields) {
  const refunded = round2(fields.refund_amount || 0)
  const refundCost = round2(fields.refund_cost || 0)
  const dropshipFreight = round2(fields.dropship_freight || 0)
  const tradeInCredit = round2(fields.trade_in_credit || 0)
  const netPaid = round2(Number(fields.paid_amount || 0) + tradeInCredit - refunded)
  const netCost = round2(Number(fields.goods_cost || 0) - refundCost)
  const profit = round2(netPaid - netCost - dropshipFreight - Number(fields.fee_total || 0))
  return {
    net_paid: netPaid,
    profit,
    profit_rate: netPaid > 0 ? round4(profit / netPaid) : 0,
  }
}

async function defaultWarehouse(db) {
  const defaults = await fetchAll(db, 'warehouses', { is_default: true })
  if (defaults.length) return defaults[0]._id
  const all = await fetchAll(db, 'warehouses', {})
  return all.length ? all[0]._id : ''
}

async function readInventory(transaction, id) {
  try {
    const res = await transaction.collection('inventory').doc(id).get()
    return res.data
  } catch (err) {
    return null
  }
}

/**
 * 执行退款：按选中明细回补库存或计入损耗，并重算订单退款与毛利。
 * 已发货且选择回补的自仓商品 → 退货入库；已发货代发或不回补 → 计入损耗；
 * 未发货 → 商品未出库，仅冲减收入并在毛利中回冲成本。
 */
async function applyRefund(ctx, params) {
  const db = ctx.db
  const order = params.order || (await getDoc(db, 'orders', params.order_id))
  if (['已退款', '已取消'].indexOf(order.status) >= 0) fail(400, '订单已退款或已取消')
  if (Number(order.trade_in_credit || 0) > 0 && (!ctx.user || ctx.user.role !== 'owner')) {
    fail(400, '以旧换新订单涉及旧竿折价冲销，退款仅老板可操作')
  }

  const refundAmount = round2(params.refund_amount)
  if (!(refundAmount > 0)) fail(400, '退款金额必须大于 0')

  const orderItemMap = {}
  ;(order.items || []).forEach((item) => {
    orderItemMap[item.product_id] = item
  })

  const returned = await completedReturns(db, order._id)
  const lines = []
  ;(params.items || []).forEach((raw) => {
    const source = orderItemMap[raw.product_id]
    if (!source) fail(400, '售后商品不在该订单中')
    const qty = round4(raw.qty)
    if (!(qty > 0)) return
    const remain = round4(Number(source.qty || 0) - (returned[source.product_id] || 0))
    if (qty > remain + 0.0001) fail(400, `${source.product_name} 最多可退 ${remain}`)
    lines.push({ item: source, qty })
  })
  if (!lines.length) fail(400, '请填写售后数量')

  const shipped = isShipped(order)
  const dropship = isDropship(order)
  const doRestock = !!params.restock && shipped && !dropship

  let refundCost = 0
  let lossAmount = 0
  const entries = lines.map((line) => {
    const unitCost = Number(line.item.cost_snapshot || 0)
    const cost = round4(unitCost * line.qty)
    if (!shipped) refundCost = round2(refundCost + cost)
    else if (dropship) lossAmount = round2(lossAmount + cost)
    else if (doRestock) refundCost = round2(refundCost + cost)
    else lossAmount = round2(lossAmount + cost)
    return { item: line.item, qty: line.qty, unitCost, cost }
  })

  let warehouseId = params.warehouse_id || order.warehouse_id || ''
  if (doRestock && !warehouseId) warehouseId = await defaultWarehouse(db)
  if (doRestock && !warehouseId) fail(400, '请选择退货入库仓库')
  if (doRestock) await assertNoStocktake(db, '退货入库')

  let result = null
  await db.runTransaction(async (transaction) => {
    // 事务内重读订单，避免并发/重复提交造成退款金额覆盖或超退
    const freshRes = await transaction.collection('orders').doc(order._id).get()
    const fresh = freshRes.data
    if (['已退款', '已取消'].indexOf(fresh.status) >= 0) fail(400, '订单已退款或已取消')
    if (Number(fresh.trade_in_credit || 0) > 0 && (!ctx.user || ctx.user.role !== 'owner')) {
      fail(400, '以旧换新订单涉及旧竿折价冲销，退款仅老板可操作')
    }

    const remainingAmount = round2(Number(fresh.paid_amount || 0) - Number(fresh.refund_amount || 0))
    if (refundAmount > remainingAmount + 0.01) fail(400, `可退金额上限 ${remainingAmount}`)

    const newRefund = round2(Number(fresh.refund_amount || 0) + refundAmount)
    const newRefundCost = round2(Number(fresh.refund_cost || 0) + refundCost)
    const newLoss = round2(Number(fresh.loss_amount || 0) + lossAmount)
    const profitInfo = calcProfit({
      ...fresh,
      refund_amount: newRefund,
      refund_cost: newRefundCost,
    })
    const fullyRefunded = newRefund >= Number(fresh.paid_amount || 0) - 0.01

    const orderFields = {
      refund_amount: newRefund,
      refund_cost: newRefundCost,
      loss_amount: newLoss,
      net_paid: profitInfo.net_paid,
      profit: profitInfo.profit,
      profit_rate: profitInfo.profit_rate,
      refund_status: fullyRefunded ? '已退款' : '部分退款',
      updated_at: new Date(),
    }
    if (fullyRefunded) {
      orderFields.status = '已退款'
      orderFields.refunded_at = new Date()
      orderFields.refund_reason = params.reason || fresh.refund_reason || ''
    }

    if (doRestock) {
      for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i]
        const invId = `${entry.item.product_id}_${warehouseId}`
        const inv = await readInventory(transaction, invId)
        const now = new Date()
        const oldQty = inv ? Number(inv.qty_available || 0) : 0
        const oldAvg = inv ? Number(inv.avg_cost || 0) : 0
        const newQty = round4(oldQty + entry.qty)
        const newAvg = newQty > 0 ? round4((oldQty * oldAvg + entry.qty * entry.unitCost) / newQty) : entry.unitCost
        if (inv) {
          await transaction.collection('inventory').doc(invId).update({
            data: { qty_available: newQty, avg_cost: newAvg, last_in_at: now, updated_at: now },
          })
        } else {
          await transaction.collection('inventory').doc(invId).set({
            data: {
              product_id: entry.item.product_id,
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
            type: '退货入库',
            product_id: entry.item.product_id,
            product_name: entry.item.product_name,
            sku_code: entry.item.sku_code || '',
            warehouse_id: warehouseId,
            qty: entry.qty,
            unit_cost: entry.unitCost,
            amount: entry.cost,
            ref_type: 'order',
            ref_id: order._id,
            ref_no: fresh.no || order.no,
            operator_openid: ctx.openid,
            operator_name: ctx.user ? ctx.user.name : '',
            note: params.reason || '售后退货入库',
            created_at: now,
          },
        })
      }
    }

    if (params.after_sale_id) {
      const afterSaleRes = await transaction.collection('after_sales').doc(params.after_sale_id).get()
      const freshAfterSale = afterSaleRes.data
      if (freshAfterSale.status !== '待处理') {
        fail(400, `售后单当前状态为「${freshAfterSale.status}」，不能重复处理`)
      }
      const afterSaleFields = {
        status: '已完成',
        refund_cost: refundCost,
        loss_amount: lossAmount,
        order_profit: profitInfo.profit,
        completed_at: new Date(),
        updated_at: new Date(),
      }
      if (doRestock) afterSaleFields.warehouse_id = warehouseId
      await transaction.collection('after_sales').doc(params.after_sale_id).update({ data: afterSaleFields })
    }

    await transaction.collection('orders').doc(order._id).update({ data: orderFields })

    result = {
      refund_amount: refundAmount,
      refund_cost: refundCost,
      loss_amount: lossAmount,
      refund_total: newRefund,
      fully_refunded: fullyRefunded,
      profit: profitInfo.profit,
      warehouse_id: doRestock ? warehouseId : '',
    }
  })

  try {
    const updated = await getDoc(db, 'orders', order._id)
    await syncOrderCash(db, updated)
  } catch (err) {
    console.error('sync order cash failed:', err)
  }

  return result
}

async function list(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const query = {}
  if (payload.status && STATUS.indexOf(payload.status) >= 0) query.status = payload.status
  if (payload.order_id) query.order_id = payload.order_id
  let request = db.collection('after_sales')
  if (Object.keys(query).length) request = request.where(query)
  const res = await request.limit(100).get()
  const list = res.data
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, Math.min(100, Number(payload.limit) || 50))
  return { list }
}

async function get(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const afterSale = await getDoc(db, 'after_sales', payload.id)
  let order = null
  try {
    order = await getDoc(db, 'orders', afterSale.order_id)
  } catch (err) {
    order = null
  }
  return { afterSale, order }
}

async function createRecord(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const order = await getDoc(db, 'orders', payload.order_id)
  if (['已退款', '已取消'].indexOf(order.status) >= 0) fail(400, '订单已退款或已取消')
  if (Number(order.trade_in_credit || 0) > 0 && (!ctx.user || ctx.user.role !== 'owner')) {
    fail(400, '以旧换新订单涉及旧竿折价冲销，退款仅老板可操作')
  }

  const type = TYPES.indexOf(payload.type) >= 0 ? payload.type : '退货退款'
  const returned = await completedReturns(db, order._id)
  const orderItemMap = {}
  ;(order.items || []).forEach((item) => {
    orderItemMap[item.product_id] = item
  })

  const items = []
  ;(payload.items || []).forEach((raw) => {
    const source = orderItemMap[raw.product_id]
    if (!source) fail(400, '售后商品不在该订单中')
    const qty = round4(raw.qty)
    if (!(qty > 0)) return
    const remain = round4(Number(source.qty || 0) - (returned[source.product_id] || 0))
    if (qty > remain + 0.0001) fail(400, `${source.product_name} 最多可退 ${remain}`)
    items.push({
      product_id: source.product_id,
      product_name: source.product_name,
      sku_code: source.sku_code || '',
      qty,
      price: round2(source.price),
      cost_snapshot: round4(source.cost_snapshot),
      amount: round2(Number(source.price || 0) * qty),
      cost: round4(Number(source.cost_snapshot || 0) * qty),
    })
  })
  if (!items.length) fail(400, '请选择售后商品')

  const refundAmount = round2(payload.refund_amount)
  if (!(refundAmount > 0)) fail(400, '请填写退款金额')
  const remainingAmount = round2(Number(order.paid_amount || 0) - Number(order.refund_amount || 0))
  if (refundAmount > remainingAmount + 0.01) fail(400, `可退金额上限 ${remainingAmount}`)

  const shipped = isShipped(order)
  if (!shipped) {
    // 未发货时商品还没出库，只允许整单退款，避免退款后继续发货造成库存扣减口径混乱
    const remainMap = {}
    ;(order.items || []).forEach((item) => {
      const remain = round4(Number(item.qty || 0) - (returned[item.product_id] || 0))
      if (remain > 0) remainMap[item.product_id] = remain
    })
    const coversAll = Object.keys(remainMap).every((productId) => {
      const requested = items
        .filter((item) => item.product_id === productId)
        .reduce((sum, item) => sum + Number(item.qty || 0), 0)
      return requested >= remainMap[productId] - 0.0001
    })
    if (!coversAll || refundAmount < remainingAmount - 0.01) {
      fail(400, '未发货订单仅支持整单退款，请使用订单详情的一键退款')
    }
  }

  const dropship = isDropship(order)
  const restock = !!payload.restock && shipped && !dropship
  const returnCost = round2(items.reduce((sum, item) => sum + item.cost, 0))

  const fields = {
    order_id: order._id,
    order_no: order.no,
    platform: order.platform || '',
    buyer_name: order.buyer_name || '',
    type,
    status: '待处理',
    fulfill_mode: order.fulfill_mode || '自仓',
    supplier_id: order.supplier_id || '',
    supplier_name: order.supplier_name || '',
    items,
    refund_amount: refundAmount,
    restock,
    warehouse_id: restock ? payload.warehouse_id || order.warehouse_id || '' : '',
    return_cost: returnCost,
    refund_cost: 0,
    loss_amount: 0,
    reason: payload.reason || '',
    note: payload.note || '',
    operator_openid: ctx.openid,
    operator_name: ctx.user ? ctx.user.name : '',
    created_at: new Date(),
    updated_at: new Date(),
  }
  fields.no = await nextNo(db, 'SH')
  const res = await db.collection('after_sales').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'afterSale',
    action: 'create',
    ref_type: 'after_sale',
    ref_id: res._id,
    summary: `新建售后单 ${fields.no}（${order.no}，退款 ${refundAmount}）`,
    after: { no: fields.no, order_no: order.no, refund_amount: refundAmount, restock },
  })
  return { id: res._id, no: fields.no }
}

async function completeRecord(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const afterSale = await getDoc(db, 'after_sales', payload.id)
  if (afterSale.status !== '待处理') fail(400, `售后单当前状态为「${afterSale.status}」，不能重复处理`)
  const order = await getDoc(db, 'orders', afterSale.order_id)

  const result = await applyRefund(ctx, {
    order,
    after_sale_id: payload.id,
    items: afterSale.items,
    refund_amount: afterSale.refund_amount,
    restock: afterSale.restock,
    warehouse_id: payload.warehouse_id || afterSale.warehouse_id,
    reason: afterSale.reason || '售后退款',
  })

  await audit(db, ctx.user, {
    module: 'afterSale',
    action: 'complete',
    ref_type: 'after_sale',
    ref_id: payload.id,
    summary: `售后单 ${afterSale.no} 完成：退款 ${result.refund_amount}，回补成本 ${result.refund_cost}，损耗 ${result.loss_amount}`,
    before: { status: '待处理', order_refund: order.refund_amount || 0 },
    after: { status: '已完成', refund_total: result.refund_total, loss_amount: result.loss_amount },
  })

  return { ok: true, refund_cost: result.refund_cost, loss_amount: result.loss_amount, fully_refunded: result.fully_refunded }
}

async function create(ctx, payload) {
  return createRecord(ctx, payload)
}

async function complete(ctx, payload) {
  return completeRecord(ctx, payload)
}

async function reject(ctx, payload) {
  const db = ctx.db
  const afterSale = await getDoc(db, 'after_sales', payload.id)
  if (afterSale.status !== '待处理') fail(400, '只有待处理的售后单可以拒绝')
  const reason = String(payload.reason || '').trim()
  if (!reason) fail(400, '请填写拒绝原因')

  let no = afterSale.no
  await db.runTransaction(async (transaction) => {
    const res = await transaction.collection('after_sales').doc(payload.id).get()
    const fresh = res.data
    if (fresh.status !== '待处理') fail(400, `售后单当前状态为「${fresh.status}」，不能拒绝`)
    no = fresh.no
    await transaction.collection('after_sales').doc(payload.id).update({
      data: {
        status: '已拒绝',
        reject_reason: reason,
        completed_at: new Date(),
        updated_at: new Date(),
      },
    })
  })

  await audit(db, ctx.user, {
    module: 'afterSale',
    action: 'reject',
    ref_type: 'after_sale',
    ref_id: payload.id,
    summary: `售后单 ${no} 拒绝：${reason}`,
    before: { status: '待处理' },
    after: { status: '已拒绝', reject_reason: reason },
  })
  return { ok: true }
}

async function remove(ctx, payload) {
  const db = ctx.db
  const afterSale = await getDoc(db, 'after_sales', payload.id)
  if (['待处理', '已拒绝'].indexOf(afterSale.status) < 0) {
    fail(400, '已完成的售后单不能删除')
  }
  await db.collection('after_sales').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'afterSale',
    action: 'delete',
    ref_type: 'after_sale',
    ref_id: payload.id,
    summary: `删除售后单 ${afterSale.no}`,
    before: { no: afterSale.no, refund_amount: afterSale.refund_amount },
  })
  return { ok: true }
}

module.exports = {
  applyRefund,
  calcProfit,
  completedReturns,
  createRecord,
  completeRecord,
  'afterSale.list': { module: 'afterSale', action: 'read', handler: list },
  'afterSale.get': { module: 'afterSale', action: 'read', handler: get },
  'afterSale.create': { module: 'afterSale', action: 'create', handler: create },
  'afterSale.complete': { module: 'afterSale', action: 'update', handler: complete },
  'afterSale.reject': { module: 'afterSale', action: 'update', handler: reject },
  'afterSale.remove': { module: 'afterSale', action: 'delete', handler: remove },
}
