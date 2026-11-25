const {
  fail,
  nextNo,
  getDoc,
  audit,
  round2,
  round4,
  fetchAll,
  dayKey,
  querySorted,
} = require('../lib/util')

const COST_KEY = 'avg_cost'

async function list(ctx, payload) {
  const db = ctx.db
  const products = await fetchAll(db, 'products', {})
  const inventory = await fetchAll(db, 'inventory', {})
  const warehouses = await fetchAll(db, 'warehouses', {})

  const warehouseMap = {}
  warehouses.forEach((w) => {
    warehouseMap[w._id] = w.name
  })

  const stockMap = {}
  inventory.forEach((row) => {
    const key = row.product_id
    const item = stockMap[key] || { qty: 0, locked: 0, repairing: 0, stock_value: 0, last_in_at: 0, warehouses: [] }
    const qty = Number(row.qty_available || 0)
    item.qty += qty
    item.locked += Number(row.qty_locked || 0)
    item.repairing += Number(row.qty_repairing || 0)
    item.stock_value += qty * Number(row[COST_KEY] || 0)
    item.warehouses.push({
      warehouse_id: row.warehouse_id,
      warehouse_name: warehouseMap[row.warehouse_id] || '未知仓库',
      qty,
      qty_repairing: Number(row.qty_repairing || 0),
      avg_cost: Number(row[COST_KEY] || 0),
    })
    if (row.last_in_at) {
      const t = new Date(row.last_in_at).getTime()
      if (t > item.last_in_at) item.last_in_at = t
    }
    stockMap[key] = item
  })

  let rows = products.map((product) => {
    const stock = stockMap[product._id] || { qty: 0, locked: 0, repairing: 0, stock_value: 0, last_in_at: 0, warehouses: [] }
    return {
      _id: product._id,
      name: product.name,
      sku_code: product.sku_code,
      category: product.category,
      brand: product.brand,
      condition: product.condition || '',
      item_type: product.item_type || '整竿',
      spec: product.spec,
      unit: product.unit,
      status: product.status,
      supplier_id: product.supplier_id || '',
      supplier_name: product.supplier_name || '',
      safety_stock: Number(product.safety_stock || 0),
      stock_qty: round2(stock.qty),
      qty_locked: round2(stock.locked),
      qty_repairing: round2(stock.repairing),
      stock_value: round2(stock.stock_value),
      last_in_at: stock.last_in_at || null,
      warehouses: stock.warehouses,
    }
  })

  if (payload.category) {
    rows = rows.filter((row) => row.category === payload.category)
  }
  if (payload.keyword) {
    const kw = String(payload.keyword).trim().toLowerCase()
    rows = rows.filter(
      (row) =>
        (row.name || '').toLowerCase().indexOf(kw) >= 0 ||
        (row.sku_code || '').toLowerCase().indexOf(kw) >= 0
    )
  }
  if (payload.lowStock) {
    rows = rows.filter((row) => row.stock_qty < row.safety_stock)
  }
  if (payload.inStock) {
    rows = rows.filter((row) => row.stock_qty > 0)
  }

  rows.sort((a, b) => {
    if (payload.sort === 'value') return b.stock_value - a.stock_value
    if (payload.sort === 'qty') return b.stock_qty - a.stock_qty
    return String(a.name || '').localeCompare(String(b.name || ''))
  })

  return { list: rows, warehouses }
}

async function detail(ctx, payload) {
  const db = ctx.db
  const product = await getDoc(db, 'products', payload.product_id)
  const invRes = await db.collection('inventory').where({ product_id: payload.product_id }).limit(50).get()
  const warehouses = await fetchAll(db, 'warehouses', {})
  const warehouseMap = {}
  warehouses.forEach((w) => {
    warehouseMap[w._id] = w.name
  })

  const inventory = invRes.data.map((row) => ({
    warehouse_id: row.warehouse_id,
    warehouse_name: warehouseMap[row.warehouse_id] || '未知仓库',
    qty_available: Number(row.qty_available || 0),
    qty_locked: Number(row.qty_locked || 0),
    qty_repairing: Number(row.qty_repairing || 0),
    avg_cost: Number(row[COST_KEY] || 0),
    last_in_at: row.last_in_at || null,
  }))

  const txns = await querySorted(db, 'inventory_txns', { product_id: payload.product_id }, { limit: 50 })

  return { product, inventory, txns, warehouses }
}

async function defaultWarehouse(db) {
  const res = await fetchAll(db, 'warehouses', { is_default: true })
  if (res.length) return res[0]._id
  const all = await fetchAll(db, 'warehouses', {})
  return all.length ? all[0]._id : ''
}

async function pendingStocktake(db) {
  try {
    const rows = await fetchAll(db, 'stocktakes', { status: '盘点中' })
    return rows.length ? rows[0] : null
  } catch (err) {
    return null
  }
}

/**
 * 盘点进行中暂停所有库存变更，避免实盘数与账面数在同一时点被改写。
 * 盘点完成/删除、创建盘点单本身不受此限制。
 */
async function assertNoStocktake(db, actionLabel) {
  const row = await pendingStocktake(db)
  if (!row) return
  const scope = [row.period, row.warehouse_name].filter(Boolean).join(' ')
  fail(
    400,
    `盘点单 ${row.no}${scope ? `（${scope}）` : ''} 进行中，盘点期间暂停${actionLabel || '出入库'}，请先完成或删除盘点单`
  )
}

async function updateStock(transaction, params) {
  const { productId, warehouseId, delta, unitCost, type, refType, refId, refNo, operator, note, product } = params
  const invId = `${productId}_${warehouseId}`
  let inv = null
  try {
    const res = await transaction.collection('inventory').doc(invId).get()
    inv = res.data
  } catch (err) {
    inv = null
  }

  const now = new Date()
  const oldQty = inv ? Number(inv.qty_available || 0) : 0
  const oldAvg = inv ? Number(inv[COST_KEY] || 0) : 0
  const newQty = round4(oldQty + delta)
  if (newQty < 0) fail(400, `库存不足，当前可用 ${oldQty}`)

  let newAvg = oldAvg
  if (delta > 0 && unitCost > 0) {
    newAvg = newQty > 0 ? round4((oldQty * oldAvg + delta * unitCost) / newQty) : unitCost
  }
  if (newQty === 0) newAvg = 0

  if (inv) {
    await transaction.collection('inventory').doc(invId).update({
      data: {
        qty_available: newQty,
        [COST_KEY]: newAvg,
        last_in_at: delta > 0 ? now : inv.last_in_at || null,
        updated_at: now,
      },
    })
  } else {
    await transaction.collection('inventory').doc(invId).set({
      data: {
        product_id: productId,
        warehouse_id: warehouseId,
        qty_available: newQty,
        qty_locked: 0,
        qty_in_transit: 0,
        [COST_KEY]: newAvg,
        last_in_at: now,
        created_at: now,
        updated_at: now,
      },
    })
  }

  await transaction.collection('inventory_txns').add({
    data: {
      type,
      product_id: productId,
      product_name: product ? product.name : '',
      sku_code: product ? product.sku_code : '',
      warehouse_id: warehouseId,
      qty: round2(delta),
      unit_cost: round4(unitCost),
      amount: round2(Math.abs(delta) * unitCost),
      ref_type: refType || '',
      ref_id: refId || '',
      ref_no: refNo || '',
      operator_openid: operator ? operator.openid : '',
      operator_name: operator ? operator.name : '',
      note: note || '',
      created_at: now,
    },
  })

  return { qty: newQty, avg_cost: newAvg }
}

async function stockin(ctx, payload) {
  const db = ctx.db
  await assertNoStocktake(db, '入库')
  const product = await getDoc(db, 'products', payload.product_id)
  const qty = Number(payload.qty)
  if (!(qty > 0)) fail(400, '入库数量必须大于 0')

  const warehouseId = payload.warehouse_id || (await defaultWarehouse(db))
  if (!warehouseId) fail(400, '请先创建仓库')

  const unitPrice = round4(payload.unit_price)
  const freight = round2(payload.freight)
  const otherCost = round2(payload.other_cost)
  if (!(unitPrice > 0)) fail(400, '请填写进价，入库成本必须大于 0')
  const totalCost = round2(qty * unitPrice + freight + otherCost)
  const unitCost = round4(totalCost / qty)

  const result = await db.runTransaction(async (transaction) =>
    updateStock(transaction, {
      productId: payload.product_id,
      warehouseId,
      delta: qty,
      unitCost,
      type: '采购入库',
      refType: payload.ref_type || 'manual',
      refNo: payload.ref_no || '',
      operator: { openid: ctx.openid, name: ctx.user ? ctx.user.name : '' },
      note: payload.note || '手工入库',
      product,
    })
  )

  await audit(db, ctx.user, {
    module: 'inventory',
    action: 'stockin',
    ref_type: 'inventory_txn',
    ref_id: `${payload.product_id}_${warehouseId}`,
    summary: `${product.name} 入库 ${qty}，单位成本 ${unitCost}`,
    after: { qty, unit_cost: unitCost, total_cost: totalCost },
  })

  return { ok: true, unit_cost: unitCost, total_cost: totalCost, avg_cost: result.avg_cost }
}

/**
 * 手动调整库存：增加 / 减少 / 设为指定数量，必须填写原因。
 */
async function manualAdjust(ctx, payload) {
  const db = ctx.db
  await assertNoStocktake(db, '库存调整')
  const product = await getDoc(db, 'products', payload.product_id)

  const reason = String(payload.reason || '').trim()
  if (!reason) fail(400, '请填写调整原因')

  const mode = payload.mode === 'decrease' ? 'decrease' : payload.mode === 'set' ? 'set' : 'increase'
  const num = Number(payload.qty)
  if (!isFinite(num) || num < 0) fail(400, '请填写正确的调整数量')
  if (mode !== 'set' && !(num > 0)) fail(400, '调整数量必须大于 0')

  const warehouseId = payload.warehouse_id || (await defaultWarehouse(db))
  if (!warehouseId) fail(400, '请先创建仓库')

  const invId = `${payload.product_id}_${warehouseId}`
  let current = 0
  let avgCost = 0
  try {
    const res = await db.collection('inventory').doc(invId).get()
    current = Number(res.data.qty_available || 0)
    avgCost = Number(res.data[COST_KEY] || 0)
  } catch (err) {
    current = 0
    avgCost = 0
  }

  let delta = 0
  if (mode === 'increase') delta = num
  else if (mode === 'decrease') delta = -num
  else delta = round4(num - current)

  if (delta === 0) return { ok: true, delta: 0, qty: round4(current) }
  if (current + delta < 0) fail(400, `库存不足，当前可用 ${current}`)

  let unitCost = avgCost
  if (delta > 0) {
    unitCost = round4(payload.unit_cost)
    if (!(unitCost > 0)) fail(400, '增加库存必须填写单位成本')
  }

  const label = mode === 'increase' ? '增加' : mode === 'decrease' ? '减少' : '设为'

  await db.runTransaction(async (transaction) =>
    updateStock(transaction, {
      productId: payload.product_id,
      warehouseId,
      delta,
      unitCost,
      type: '手动调整',
      refType: 'manual_adjust',
      refId: invId,
      operator: { openid: ctx.openid, name: ctx.user ? ctx.user.name : '' },
      note: `${label}：${reason}`,
      product,
    })
  )

  await audit(db, ctx.user, {
    module: 'inventory',
    action: 'manual_adjust',
    ref_type: 'inventory',
    ref_id: invId,
    summary: `${product.name} 手动调整 ${delta > 0 ? '+' : ''}${delta}（${reason}）`,
    before: { qty: current },
    after: { qty: round4(current + delta), mode, reason },
  })

  return { ok: true, delta, qty: round4(current + delta) }
}

function monthKey() {
  const key = dayKey()
  return `${key.slice(0, 4)}-${key.slice(4, 6)}`
}

function summarizeItems(items) {
  let diffCount = 0
  let gainQty = 0
  let lossQty = 0
  let gainAmount = 0
  let lossAmount = 0
  items.forEach((item) => {
    const diff = Number(item.diff || 0)
    if (!diff) return
    diffCount += 1
    const cost = Number(item.cost_snapshot || 0)
    if (diff > 0) {
      gainQty += diff
      gainAmount += diff * cost
    } else {
      lossQty += -diff
      lossAmount += -diff * cost
    }
  })
  return {
    diff_count: diffCount,
    gain_qty: round2(gainQty),
    loss_qty: round2(lossQty),
    gain_amount: round2(gainAmount),
    loss_amount: round2(lossAmount),
  }
}

async function ensureStocktakes(db) {
  try {
    await db.createCollection('stocktakes')
  } catch (err) {
    // 集合已存在时忽略
  }
}

async function listStocktakes(ctx, payload) {
  const db = ctx.db
  let all = []
  try {
    all = await fetchAll(db, 'stocktakes', {})
  } catch (err) {
    all = []
  }

  const current = monthKey()
  const monthRows = all.filter((row) => row.period === current)

  let list = all
  if (payload.period) list = list.filter((row) => row.period === payload.period)
  if (payload.warehouse_id) list = list.filter((row) => row.warehouse_id === payload.warehouse_id)
  if (payload.status) list = list.filter((row) => row.status === payload.status)

  list = list.slice().sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })

  return {
    // 列表只返回汇总，明细由 stocktake.get 按需加载
    list: list.map((row) => {
      const summary = { ...row }
      delete summary.items
      return summary
    }),
    current_period: current,
    month_completed: monthRows.filter((row) => row.status === '已完成').length,
    month_pending: monthRows.filter((row) => row.status === '盘点中').length,
  }
}

async function getStocktake(ctx, payload) {
  return { stocktake: await getDoc(ctx.db, 'stocktakes', payload.id) }
}

async function createStocktake(ctx, payload) {
  const db = ctx.db
  const warehouseId = payload.warehouse_id || (await defaultWarehouse(db))
  if (!warehouseId) fail(400, '请先创建仓库')
  const warehouse = await getDoc(db, 'warehouses', warehouseId)

  const period = String(payload.period || monthKey())
  if (!/^\d{4}-\d{2}$/.test(period)) fail(400, '盘点期间格式应为 YYYY-MM')

  let supplierId = ''
  let supplierName = ''
  if (payload.supplier_id) {
    const supplier = await getDoc(db, 'suppliers', payload.supplier_id)
    supplierId = supplier._id
    supplierName = supplier.name
  }

  let exists = []
  try {
    exists = await fetchAll(db, 'stocktakes', { warehouse_id: warehouseId, period })
  } catch (err) {
    exists = []
  }
  const pending = exists.filter((row) => row.status === '盘点中')
  if (pending.length) fail(400, `${period} 已有进行中的盘点单 ${pending[0].no}，请先完成或删除`)

  const running = await pendingStocktake(db)
  if (running) fail(400, `已有进行中的盘点单 ${running.no}（${running.period} ${running.warehouse_name || ''}），请先完成或删除`)

  const products = await fetchAll(db, 'products', {})
  const invRows = await fetchAll(db, 'inventory', { warehouse_id: warehouseId })
  let supplierMap = {}
  try {
    const supplierRows = await fetchAll(db, 'suppliers', {})
    supplierRows.forEach((row) => {
      supplierMap[row._id] = row.name
    })
  } catch (err) {
    supplierMap = {}
  }
  const invMap = {}
  invRows.forEach((row) => {
    invMap[row.product_id] = row
  })

  const items = []
  products.forEach((product) => {
    if (supplierId && product.supplier_id !== supplierId) return
    const inv = invMap[product._id]
    const systemQty = round2(inv ? inv.qty_available : 0)
    if (product.status === '停售' && systemQty <= 0) return
    items.push({
      product_id: product._id,
      product_name: product.name,
      sku_code: product.sku_code || '',
      unit: product.unit || '',
      supplier_id: product.supplier_id || '',
      supplier_name: supplierMap[product.supplier_id] || product.supplier_name || '',
      system_qty: systemQty,
      counted_qty: systemQty,
      diff: 0,
      cost_snapshot: round4(inv ? inv.avg_cost : 0),
    })
  })
  items.sort((a, b) => String(a.product_name || '').localeCompare(String(b.product_name || '')))
  if (!items.length) fail(400, supplierId ? '该供应商没有需要盘点的商品' : '没有可盘点的商品')

  const no = await nextNo(db, 'PD')
  const now = new Date()
  const fields = {
    no,
    warehouse_id: warehouseId,
    warehouse_name: warehouse.name,
    period,
    supplier_id: supplierId,
    supplier_name: supplierName,
    status: '盘点中',
    items,
    item_count: items.length,
    diff_count: 0,
    gain_qty: 0,
    loss_qty: 0,
    gain_amount: 0,
    loss_amount: 0,
    note: String(payload.note || ''),
    operator_openid: ctx.openid || '',
    operator_name: ctx.user ? ctx.user.name : '',
    created_at: now,
    updated_at: now,
  }

  await ensureStocktakes(db)
  const res = await db.collection('stocktakes').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'inventory',
    action: 'create',
    ref_type: 'stocktake',
    ref_id: res._id,
    summary: `创建盘点单 ${no}（${period} ${warehouse.name}，${items.length} 个商品）`,
    after: { no, period, warehouse_id: warehouseId, item_count: items.length },
  })

  return { id: res._id, no }
}

async function saveStocktake(ctx, payload) {
  const db = ctx.db
  const doc = await getDoc(db, 'stocktakes', payload.id)
  if (doc.status !== '盘点中') fail(400, '盘点单已完成，不能再修改')

  const input = {}
  ;(payload.items || []).forEach((item) => {
    if (!item || !item.product_id) return
    const val = Number(item.counted_qty)
    if (isFinite(val)) input[item.product_id] = Math.max(0, round2(val))
  })

  const items = (doc.items || []).map((item) => {
    const counted = input[item.product_id] !== undefined ? input[item.product_id] : Number(item.counted_qty || 0)
    return {
      ...item,
      counted_qty: round2(counted),
      diff: round2(counted - Number(item.system_qty || 0)),
    }
  })

  const summary = summarizeItems(items)
  await db.collection('stocktakes').doc(payload.id).update({
    data: {
      items,
      item_count: items.length,
      ...summary,
      note: payload.note !== undefined ? String(payload.note) : doc.note || '',
      updated_at: new Date(),
    },
  })

  return { ok: true, ...summary }
}

async function completeStocktake(ctx, payload) {
  const db = ctx.db
  const doc = await getDoc(db, 'stocktakes', payload.id)
  if (doc.status !== '盘点中') fail(400, '盘点单已完成')

  const items = doc.items || []
  const operator = { openid: ctx.openid || '', name: ctx.user ? ctx.user.name : '' }
  const note = payload.note !== undefined ? String(payload.note) : doc.note || ''
  let resultItems = []
  const txnNote = `月度盘点 ${doc.period}${note ? '：' + note : ''}`
  const CHUNK_SIZE = 20

  // 分批事务：单事务操作数有上限，且每批按事务内最新库存计算差异，重试不会重复调整
  for (let start = 0; start < items.length; start += CHUNK_SIZE) {
    const chunk = items.slice(start, start + CHUNK_SIZE)
    let chunkResults = []
    await db.runTransaction(async (transaction) => {
      const attemptItems = []
      for (let i = 0; i < chunk.length; i += 1) {
        const item = chunk[i]
        const invId = `${item.product_id}_${doc.warehouse_id}`
        let current = 0
        let avgCost = Number(item.cost_snapshot || 0)
        try {
          const res = await transaction.collection('inventory').doc(invId).get()
          current = Number(res.data.qty_available || 0)
          avgCost = Number(res.data[COST_KEY] || 0)
        } catch (err) {
          current = 0
        }
        const counted = Number(item.counted_qty || 0)
        const delta = round4(counted - current)
        if (delta !== 0) {
          await updateStock(transaction, {
            productId: item.product_id,
            warehouseId: doc.warehouse_id,
            delta,
            unitCost: avgCost,
            type: delta > 0 ? '盘盈' : '盘亏',
            refType: 'stocktake',
            refId: doc._id,
            refNo: doc.no,
            operator,
            note: txnNote,
            product: { name: item.product_name, sku_code: item.sku_code },
          })
        }
        attemptItems.push({
          ...item,
          snapshot_qty: round2(item.system_qty || 0),
          system_qty: round2(current),
          diff: round2(delta),
          cost_snapshot: round4(avgCost),
        })
      }
      chunkResults = attemptItems
    })
    resultItems = resultItems.concat(chunkResults)
  }

  const summary = summarizeItems(resultItems)
  const now = new Date()
  await db.collection('stocktakes').doc(payload.id).update({
    data: {
      items: resultItems,
      item_count: resultItems.length,
      ...summary,
      note,
      status: '已完成',
      completed_at: now,
      completed_by: operator.name,
      updated_at: now,
    },
  })

  await audit(db, ctx.user, {
    module: 'inventory',
    action: 'complete',
    ref_type: 'stocktake',
    ref_id: payload.id,
    summary: `完成盘点单 ${doc.no}：差异 ${summary.diff_count} 个，盘盈 ${summary.gain_qty}，盘亏 ${summary.loss_qty}`,
    after: { ...summary, status: '已完成' },
  })

  return { ok: true, ...summary }
}

async function removeStocktake(ctx, payload) {
  const db = ctx.db
  const doc = await getDoc(db, 'stocktakes', payload.id)
  if (doc.status !== '盘点中') fail(400, '已完成的盘点单不能删除')
  await db.collection('stocktakes').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'inventory',
    action: 'delete',
    ref_type: 'stocktake',
    ref_id: payload.id,
    summary: `删除盘点单 ${doc.no}`,
    before: { no: doc.no, period: doc.period, item_count: doc.item_count },
  })
  return { ok: true }
}

async function transfer(ctx, payload) {
  const db = ctx.db
  await assertNoStocktake(db, '调拨')
  const product = await getDoc(db, 'products', payload.product_id)
  const qty = Number(payload.qty)
  if (!(qty > 0)) fail(400, '调拨数量必须大于 0')

  const fromId = payload.from_warehouse_id
  const toId = payload.to_warehouse_id
  if (!fromId || !toId) fail(400, '请选择调出和调入仓库')
  if (fromId === toId) fail(400, '调出与调入仓库不能相同')

  const fromHouse = await getDoc(db, 'warehouses', fromId)
  const toHouse = await getDoc(db, 'warehouses', toId)

  let sourceQty = 0
  let unitCost = 0
  try {
    const res = await db.collection('inventory').doc(`${payload.product_id}_${fromId}`).get()
    sourceQty = Number(res.data.qty_available || 0)
    unitCost = Number(res.data[COST_KEY] || 0)
  } catch (err) {
    sourceQty = 0
  }
  if (sourceQty < qty) fail(400, `调出仓库存不足：可用 ${sourceQty}`)

  const refNo = payload.ref_no || (await nextNo(db, 'DB'))
  const operator = { openid: ctx.openid, name: ctx.user ? ctx.user.name : '' }
  const note = payload.note || `${fromHouse.name} → ${toHouse.name}`

  await db.runTransaction(async (transaction) => {
    await updateStock(transaction, {
      productId: payload.product_id,
      warehouseId: fromId,
      delta: -qty,
      unitCost,
      type: '调拨出库',
      refType: 'transfer',
      refNo,
      operator,
      note,
      product,
    })
    await updateStock(transaction, {
      productId: payload.product_id,
      warehouseId: toId,
      delta: qty,
      unitCost,
      type: '调拨入库',
      refType: 'transfer',
      refNo,
      operator,
      note,
      product,
    })
  })

  await audit(db, ctx.user, {
    module: 'inventory',
    action: 'transfer',
    ref_type: 'inventory',
    ref_id: `${payload.product_id}_${fromId}`,
    summary: `${product.name} 调拨 ${qty}：${fromHouse.name} → ${toHouse.name}`,
    before: { from_qty: sourceQty, unit_cost: unitCost },
    after: { from_qty: round4(sourceQty - qty) },
  })

  return { ok: true, ref_no: refNo, unit_cost: unitCost }
}

async function saveWarehouse(ctx, payload) {
  const db = ctx.db
  const name = String(payload.name || '').trim()
  if (!name) fail(400, '请填写仓库名称')

  const fields = {
    name,
    code: String(payload.code || '').trim(),
    updated_at: new Date(),
  }

  if (payload.id) {
    const before = await getDoc(db, 'warehouses', payload.id)
    await db.collection('warehouses').doc(payload.id).update({ data: fields })
    await audit(db, ctx.user, {
      module: 'setting',
      action: 'update',
      ref_type: 'warehouse',
      ref_id: payload.id,
      summary: `修改仓库 ${before.name} → ${name}`,
      before: { name: before.name, code: before.code || '' },
      after: { name, code: fields.code },
    })
    return { id: payload.id }
  }

  const count = await db.collection('warehouses').count()
  fields.is_default = count.total === 0
  fields.created_at = new Date()
  const res = await db.collection('warehouses').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'setting',
    action: 'create',
    ref_type: 'warehouse',
    ref_id: res._id,
    summary: `新增仓库 ${name}`,
    after: { name, code: fields.code, is_default: fields.is_default },
  })
  return { id: res._id }
}

async function setDefaultWarehouse(ctx, payload) {
  const db = ctx.db
  const target = await getDoc(db, 'warehouses', payload.id)
  const all = await fetchAll(db, 'warehouses', {})
  for (let i = 0; i < all.length; i += 1) {
    const item = all[i]
    if (!item.is_default) continue
    await db.collection('warehouses').doc(item._id).update({ data: { is_default: false } })
  }
  await db.collection('warehouses').doc(payload.id).update({
    data: { is_default: true, updated_at: new Date() },
  })
  await audit(db, ctx.user, {
    module: 'setting',
    action: 'update',
    ref_type: 'warehouse',
    ref_id: payload.id,
    summary: `设为默认仓库 ${target.name}`,
  })
  return { ok: true }
}

async function removeWarehouse(ctx, payload) {
  const db = ctx.db
  const target = await getDoc(db, 'warehouses', payload.id)
  const all = await fetchAll(db, 'warehouses', {})
  if (all.length <= 1) fail(400, '至少保留一个仓库')

  const inventory = await fetchAll(db, 'inventory', { warehouse_id: payload.id })
  const occupied = inventory.filter((row) => Number(row.qty_available || 0) > 0)
  if (occupied.length) fail(400, '该仓库还有库存，请先调拨或盘点清零')

  const pending = await fetchAll(db, 'purchase_orders', { warehouse_id: payload.id })
  const unfinished = pending.filter((order) => order.status !== '已入库')
  if (unfinished.length) fail(400, '该仓库还有未完成的采购单，不能删除')

  await db.collection('warehouses').doc(payload.id).remove()
  for (let i = 0; i < inventory.length; i += 1) {
    await db.collection('inventory').doc(inventory[i]._id).remove()
  }
  if (target.is_default) {
    const rest = await fetchAll(db, 'warehouses', {})
    if (rest.length) {
      await db.collection('warehouses').doc(rest[0]._id).update({ data: { is_default: true } })
    }
  }
  await audit(db, ctx.user, {
    module: 'setting',
    action: 'delete',
    ref_type: 'warehouse',
    ref_id: payload.id,
    summary: `删除仓库 ${target.name}`,
    before: { name: target.name, code: target.code || '' },
  })
  return { ok: true }
}

async function txns(ctx, payload) {
  const db = ctx.db
  const query = {}
  if (payload.product_id) query.product_id = payload.product_id
  if (payload.type) query.type = payload.type
  const list = await querySorted(db, 'inventory_txns', query, {
    limit: Math.min(200, Number(payload.limit) || 100),
  })
  return { list }
}

async function warehouses(ctx) {
  const res = await ctx.db.collection('warehouses').orderBy('created_at', 'asc').limit(50).get()
  return { list: res.data }
}

module.exports = {
  'inventory.list': { module: 'inventory', action: 'read', handler: list },
  'inventory.detail': { module: 'inventory', action: 'read', handler: detail },
  'inventory.stockin': { module: 'inventory', action: 'stockin', handler: stockin },
  'inventory.manualAdjust': { module: 'inventory', action: 'adjust', handler: manualAdjust },
  'inventory.transfer': { module: 'inventory', action: 'transfer', handler: transfer },
  'stocktake.list': { module: 'inventory', action: 'read', handler: listStocktakes },
  'stocktake.get': { module: 'inventory', action: 'read', handler: getStocktake },
  'stocktake.create': { module: 'inventory', action: 'adjust', handler: createStocktake },
  'stocktake.save': { module: 'inventory', action: 'adjust', handler: saveStocktake },
  'stocktake.complete': { module: 'inventory', action: 'adjust', handler: completeStocktake },
  'stocktake.remove': { module: 'inventory', action: 'adjust', handler: removeStocktake },
  'warehouse.save': { module: 'setting', action: 'create', handler: saveWarehouse },
  'warehouse.default': { module: 'setting', action: 'update', handler: setDefaultWarehouse },
  'warehouse.remove': { module: 'setting', action: 'delete', handler: removeWarehouse },
  'inventory.txns': { module: 'inventory', action: 'read', handler: txns },
  'warehouse.list': { module: 'inventory', action: 'read', handler: warehouses },
  assertNoStocktake,
  updateStock,
  defaultWarehouse,
}
