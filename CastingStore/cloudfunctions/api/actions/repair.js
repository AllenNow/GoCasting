const { fail, nextNo, getDoc, audit, round2, round4, fetchAll, querySorted } = require('../lib/util')
const { assertNoStocktake, updateStock } = require('./inventory')

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

  const rawParts = (payload.parts || []).filter((part) => part && part.product_id && Number(part.qty) > 0)
  const partIds = rawParts.map((part) => part.product_id)
  const partProducts = partIds.length
    ? await fetchAll(db, 'products', { _id: db.command.in(partIds) })
    : []
  const partMap = {}
  partProducts.forEach((row) => {
    partMap[row._id] = row
  })
  const partAgg = {}
  rawParts.forEach((part) => {
    if (!partMap[part.product_id]) fail(400, '配节中存在已删除的商品')
    const num = round4(part.qty)
    partAgg[part.product_id] = round4((partAgg[part.product_id] || 0) + num)
  })
  const parts = Object.keys(partAgg).map((productId) => ({
    product_id: productId,
    product_name: partMap[productId].name,
    sku_code: partMap[productId].sku_code || '',
    qty: partAgg[productId],
  }))

  let targetProduct = null
  if (payload.target_product_id) {
    targetProduct = await getDoc(db, 'products', payload.target_product_id)
  }

  let tradeIn = null
  if (payload.trade_in_id) {
    tradeIn = await getDoc(db, 'trade_ins', payload.trade_in_id)
    if (tradeIn.status !== '待处置') {
      fail(400, `回收单当前状态为「${tradeIn.status}」，不能发起维修`)
    }
  }

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
        parts,
        parts_cost: 0,
        target_product_id: targetProduct ? targetProduct._id : '',
        target_product_name: targetProduct ? targetProduct.name : '',
        trade_in_id: tradeIn ? tradeIn._id : '',
        total_cost: 0,
        status: '维修中',
        note: String(payload.note || '').trim(),
        operator_openid: ctx.openid,
        operator_name: operatorOf(ctx).name,
        created_at: now,
        updated_at: now,
      },
    })
    repairId = res._id

    if (tradeIn) {
      await transaction.collection('trade_ins').doc(tradeIn._id).update({
        data: {
          status: '维修中',
          disposal: '维修',
          repair_id: repairId,
          updated_at: now,
        },
      })
    }
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
  const targetId = repair.target_product_id || repair.product_id
  const crossSku = targetId !== repair.product_id
  let targetProduct = null
  if (crossSku) targetProduct = await getDoc(db, 'products', targetId)

  await db.runTransaction(async (transaction) => {
    const freshRes = await transaction.collection('repairs').doc(payload.id).get()
    const fresh = freshRes.data
    if (fresh.status !== '维修中') {
      fail(400, `维修单当前状态为「${fresh.status}」，不能完成`)
    }

    const qty = Number(fresh.qty || 0)
    const repairCost = round2(fresh.repair_cost || 0)
    const now = new Date()
    const operator = operatorOf(ctx)

    // 先领用配节：按当前移动加权成本扣减配件库存
    let partsCost = 0
    const usedParts = []
    const parts = fresh.parts || []
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      const partQty = Number(part.qty || 0)
      if (!(partQty > 0)) continue
      const partInvId = `${part.product_id}_${fresh.warehouse_id}`
      let partInv = null
      try {
        const res = await transaction.collection('inventory').doc(partInvId).get()
        partInv = res.data
      } catch (err) {
        partInv = null
      }
      const available = partInv ? Number(partInv.qty_available || 0) : 0
      if (available + 0.0001 < partQty) {
        fail(400, `配节 ${part.product_name} 库存不足，当前 ${available}`)
      }
      const partUnitCost = round4(partInv ? partInv.avg_cost || 0 : 0)
      const amount = round2(partUnitCost * partQty)
      partsCost = round2(partsCost + amount)
      await updateStock(transaction, {
        productId: part.product_id,
        warehouseId: fresh.warehouse_id,
        delta: -partQty,
        unitCost: partUnitCost,
        type: '维修领料',
        refType: 'repair',
        refId: payload.id,
        refNo: fresh.no,
        operator,
        note: `维修单 ${fresh.no} 领用配节`,
        product: { name: part.product_name, sku_code: part.sku_code || '' },
      })
      usedParts.push({ ...part, qty: partQty, unit_cost: partUnitCost, amount })
    }

    let inv = null
    try {
      const res = await transaction.collection('inventory').doc(invId).get()
      inv = res.data
    } catch (err) {
      inv = null
    }
    if (!inv) fail(400, '维修库存记录不存在')

    const available = Number(inv.qty_available || 0)
    const repairing = Number(inv.qty_repairing || 0)
    if (repairing + 0.0001 < qty) fail(400, '维修中数量不足，无法完成')
    const sourceUnitCost = round4(inv.avg_cost || 0)
    const totalCost = round2(sourceUnitCost * qty + partsCost + repairCost)

    if (crossSku) {
      // 转独立二手 SKU：源 SKU 只减少维修中数量，价值随数量转移到目标 SKU
      await transaction.collection('inventory').doc(invId).update({
        data: { qty_repairing: round4(repairing - qty), updated_at: now },
      })

      const targetInvId = `${targetId}_${fresh.warehouse_id}`
      let targetInv = null
      try {
        const res = await transaction.collection('inventory').doc(targetInvId).get()
        targetInv = res.data
      } catch (err) {
        targetInv = null
      }
      const tQty = targetInv ? Number(targetInv.qty_available || 0) : 0
      const tAvg = targetInv ? Number(targetInv.avg_cost || 0) : 0
      const newQty = round4(tQty + qty)
      const newAvg = newQty > 0 ? round4((tQty * tAvg + totalCost) / newQty) : 0

      if (targetInv) {
        await transaction.collection('inventory').doc(targetInvId).update({
          data: { qty_available: newQty, avg_cost: newAvg, last_in_at: now, updated_at: now },
        })
      } else {
        await transaction.collection('inventory').doc(targetInvId).set({
          data: {
            product_id: targetId,
            warehouse_id: fresh.warehouse_id,
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
          type: '维修入库',
          product_id: targetId,
          product_name: targetProduct.name,
          sku_code: targetProduct.sku_code || '',
          warehouse_id: fresh.warehouse_id,
          qty,
          unit_cost: qty > 0 ? round4(totalCost / qty) : 0,
          amount: totalCost,
          ref_type: 'repair',
          ref_id: payload.id,
          ref_no: fresh.no,
          operator_openid: ctx.openid,
          operator_name: operator.name,
          note: `维修完成转入 ${targetProduct.name}`,
          created_at: now,
        },
      })
    } else {
      const newAvailable = round4(available + qty)
      const newAvg = newAvailable > 0
        ? round4((available * sourceUnitCost + partsCost + repairCost) / newAvailable)
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
          unit_cost: qty > 0 ? round4((partsCost + repairCost) / qty) : 0,
          amount: round2(partsCost + repairCost),
          ref_type: 'repair',
          ref_id: payload.id,
          ref_no: fresh.no,
          operator_openid: ctx.openid,
          operator_name: operator.name,
          note: '维修完成',
          created_at: now,
        },
      })
    }

    await transaction.collection('repairs').doc(payload.id).update({
      data: {
        status: '已完成',
        parts: usedParts,
        parts_cost: partsCost,
        total_cost: totalCost,
        target_product_id: targetId,
        target_product_name: crossSku ? targetProduct.name : fresh.product_name,
        completed_at: now,
        updated_at: now,
      },
    })

    if (fresh.trade_in_id) {
      await transaction.collection('trade_ins').doc(fresh.trade_in_id).update({
        data: {
          status: '已维修',
          disposal: '维修',
          repair_id: payload.id,
          product_id: targetId,
          product_name: crossSku ? targetProduct.name : fresh.product_name,
          sku_code: crossSku ? targetProduct.sku_code || '' : fresh.sku_code || '',
          completed_at: now,
          updated_at: now,
        },
      })
    }
  })

  await audit(db, ctx.user, {
    module: 'repair',
    action: 'update',
    ref_type: 'repair',
    ref_id: payload.id,
    summary: `完成维修 ${repair.no}，数量 ${repair.qty}${crossSku ? '，转二手 SKU' : ''}`,
  })

  return { ok: true, target_product_id: targetId, cross_sku: crossSku }
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

    if (fresh.trade_in_id) {
      await transaction.collection('trade_ins').doc(fresh.trade_in_id).update({
        data: {
          status: '待处置',
          disposal: '',
          repair_id: '',
          updated_at: now,
        },
      })
    }
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
