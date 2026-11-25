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
const { assertNoStocktake, updateStock, defaultWarehouse } = require('./inventory')

async function ensureCollections(db) {
  for (const name of ['dismantles', 'boms']) {
    try {
      await db.createCollection(name)
    } catch (err) {
      // 集合已存在时忽略
    }
  }
}

function operatorOf(ctx) {
  return { openid: ctx.openid, name: ctx.user ? ctx.user.name : '' }
}

async function bomGet(ctx, payload) {
  const db = ctx.db
  await ensureCollections(db)
  const sourceProductId = payload.source_product_id || ''
  if (!sourceProductId) fail(400, '请选择来源商品')
  try {
    const res = await db.collection('boms').doc(sourceProductId).get()
    return { bom: res.data }
  } catch (err) {
    return { bom: { source_product_id: sourceProductId, items: [] } }
  }
}

/**
 * 保存拆解 BOM：按来源商品维护标准零件清单与分摊权重。
 */
async function bomSave(ctx, payload) {
  const db = ctx.db
  await ensureCollections(db)
  const source = await getDoc(db, 'products', payload.source_product_id)

  const rawItems = (payload.items || []).filter(
    (item) => item && item.product_id && Number(item.qty) > 0
  )
  if (!rawItems.length) fail(400, '请至少配置一个零件')

  const ids = rawItems.map((item) => item.product_id)
  const products = await fetchAll(db, 'products', { _id: db.command.in(ids) })
  const productMap = {}
  products.forEach((row) => {
    productMap[row._id] = row
  })

  const items = []
  rawItems.forEach((item) => {
    const product = productMap[item.product_id]
    if (!product) fail(400, 'BOM 中存在已删除的商品')
    const weight = Number(item.weight)
    items.push({
      product_id: product._id,
      product_name: product.name,
      sku_code: product.sku_code || '',
      qty: round4(item.qty),
      weight: weight > 0 ? round4(weight) : 1,
    })
  })

  const data = {
    source_product_id: source._id,
    source_product_name: source.name,
    items,
    updated_at: new Date(),
    operator_openid: ctx.openid || '',
    operator_name: ctx.user ? ctx.user.name : '',
  }
  await db.collection('boms').doc(source._id).set({ data })

  await audit(db, ctx.user, {
    module: 'dismantle',
    action: 'update',
    ref_type: 'bom',
    ref_id: source._id,
    summary: `保存拆解 BOM：${source.name}（${items.length} 个零件）`,
    after: { items },
  })

  return { ok: true, items }
}

async function list(ctx, payload) {
  const db = ctx.db
  await ensureCollections(db)
  const query = {}
  if (payload.trade_in_id) query.trade_in_id = payload.trade_in_id
  if (payload.source_product_id) query.source_product_id = payload.source_product_id
  let rows = []
  try {
    rows = await querySorted(db, 'dismantles', query, { limit: Math.min(100, Number(payload.limit) || 50) })
  } catch (err) {
    rows = []
  }
  return { list: rows }
}

async function get(ctx, payload) {
  const db = ctx.db
  await ensureCollections(db)
  return { dismantle: await getDoc(db, 'dismantles', payload.id) }
}

/**
 * 执行拆解：按 BOM 标准权重分摊旧竿成本 + 拆解人工，缺失/报废部分计入损耗。
 * 实际产出可分别指定良品 SKU 与瑕疵 SKU，瑕疵件按独立 SKU 销售。
 */
async function create(ctx, payload) {
  const db = ctx.db
  await ensureCollections(db)
  await assertNoStocktake(db, '旧竿拆解')

  let tradeIn = null
  if (payload.trade_in_id) {
    tradeIn = await getDoc(db, 'trade_ins', payload.trade_in_id)
    if (tradeIn.status !== '待处置') {
      fail(400, `回收单当前状态为「${tradeIn.status}」，不能拆解`)
    }
  }

  const sourceProductId = payload.source_product_id || (tradeIn ? tradeIn.product_id : '')
  if (!sourceProductId) fail(400, '请选择要拆解的商品')
  const sourceProduct = await getDoc(db, 'products', sourceProductId)

  const rawQty = payload.qty === undefined || payload.qty === null || payload.qty === '' ? 1 : payload.qty
  const qty = round4(rawQty)
  if (!(qty > 0)) fail(400, '请填写拆解数量')

  const laborCost = round2(payload.labor_cost)
  if (!(laborCost >= 0)) fail(400, '拆解人工成本不能为负数')

  const warehouseId =
    payload.warehouse_id ||
    (tradeIn ? tradeIn.warehouse_id : '') ||
    (await defaultWarehouse(db))
  if (!warehouseId) fail(400, '请先创建仓库')

  let bom = { items: [] }
  try {
    const res = await db.collection('boms').doc(sourceProductId).get()
    bom = res.data || { items: [] }
  } catch (err) {
    bom = { items: [] }
  }
  const bomMap = {}
  ;(bom.items || []).forEach((item) => {
    bomMap[item.product_id] = item
  })

  const actualMap = {}
  ;(payload.items || []).forEach((item) => {
    if (!item || !item.product_id) return
    const good = round4(item.qty_good)
    const defect = round4(item.qty_defect)
    if (!(good > 0) && !(defect > 0)) return
    actualMap[item.product_id] = {
      good: good > 0 ? good : 0,
      defect: defect > 0 ? defect : 0,
      defect_product_id: item.defect_product_id || '',
    }
  })

  const lines = []
  ;(bom.items || []).forEach((item) => {
    lines.push({
      product_id: item.product_id,
      bom_qty: Number(item.qty || 0),
      weight: Number(item.weight || 1) > 0 ? Number(item.weight || 1) : 1,
      actual: actualMap[item.product_id] || { good: 0, defect: 0, defect_product_id: '' },
    })
    delete actualMap[item.product_id]
  })
  Object.keys(actualMap).forEach((productId) => {
    lines.push({ product_id: productId, bom_qty: 0, weight: 1, actual: actualMap[productId] })
  })
  if (!lines.length) fail(400, '请先在 BOM 中配置拆解零件，或填写实际产出零件')

  const ids = []
  lines.forEach((line) => {
    ids.push(line.product_id)
    if (line.actual.defect_product_id) ids.push(line.actual.defect_product_id)
  })
  const products = await fetchAll(db, 'products', { _id: db.command.in(ids) })
  const productMap = {}
  products.forEach((row) => {
    productMap[row._id] = row
  })

  lines.forEach((line) => {
    if (!productMap[line.product_id]) fail(400, '拆解零件中存在已删除的商品')
    if (line.actual.defect > 0) {
      if (!line.actual.defect_product_id) {
        fail(400, `${productMap[line.product_id].name} 有瑕疵件，请指定瑕疵件 SKU`)
      }
      if (!productMap[line.actual.defect_product_id]) fail(400, '瑕疵件 SKU 已被删除')
    }
  })

  const totalWeight = lines.reduce((sum, line) => sum + line.weight, 0)
  if (!(totalWeight > 0)) fail(400, 'BOM 权重合计必须大于 0')

  const no = await nextNo(db, 'CJ')
  const now = new Date()
  const operator = operatorOf(ctx)
  let result = null

  await db.runTransaction(async (transaction) => {
    const sourceInvId = `${sourceProductId}_${warehouseId}`
    let sourceInv = null
    try {
      const res = await transaction.collection('inventory').doc(sourceInvId).get()
      sourceInv = res.data
    } catch (err) {
      sourceInv = null
    }
    const available = sourceInv ? Number(sourceInv.qty_available || 0) : 0
    if (available + 0.0001 < qty) fail(400, `该仓库可用库存不足，当前 ${available}`)
    const sourceUnitCost = round4(sourceInv ? sourceInv.avg_cost || 0 : 0)
    const totalCost = round2(sourceUnitCost * qty + laborCost)

    await updateStock(transaction, {
      productId: sourceProductId,
      warehouseId,
      delta: -qty,
      unitCost: sourceUnitCost,
      type: '拆解出库',
      refType: 'dismantle',
      refNo: no,
      operator,
      note: `拆解 ${sourceProduct.name}`,
      product: sourceProduct,
    })

    let lossAmount = 0
    const items = []
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      const product = productMap[line.product_id]
      const allocated = round2((totalCost * line.weight) / totalWeight)
      const stdQty = line.bom_qty > 0 ? line.bom_qty * qty : line.actual.good + line.actual.defect
      const unitCost = stdQty > 0 ? round4(allocated / stdQty) : 0
      const goodQty = line.actual.good
      const defectQty = line.actual.defect
      const lossQty = round4(Math.max(0, stdQty - goodQty - defectQty))
      const loss = round2(unitCost * lossQty)
      lossAmount = round2(lossAmount + loss)

      if (goodQty > 0) {
        await updateStock(transaction, {
          productId: product._id,
          warehouseId,
          delta: goodQty,
          unitCost,
          type: '拆解入库',
          refType: 'dismantle',
          refNo: no,
          operator,
          note: `拆解产出（良品）：${sourceProduct.name}`,
          product,
        })
      }

      if (defectQty > 0) {
        const defectProduct = productMap[line.actual.defect_product_id]
        await updateStock(transaction, {
          productId: defectProduct._id,
          warehouseId,
          delta: defectQty,
          unitCost,
          type: '拆解入库',
          refType: 'dismantle',
          refNo: no,
          operator,
          note: `拆解产出（瑕疵）：${sourceProduct.name}`,
          product: defectProduct,
        })
      }

      items.push({
        product_id: product._id,
        product_name: product.name,
        sku_code: product.sku_code || '',
        std_qty: round4(stdQty),
        qty_good: round4(goodQty),
        qty_defect: round4(defectQty),
        defect_product_id: line.actual.defect_product_id || '',
        defect_product_name: line.actual.defect_product_id
          ? (productMap[line.actual.defect_product_id] || {}).name || ''
          : '',
        weight: line.weight,
        unit_cost: unitCost,
        allocated_cost: allocated,
        good_amount: round2(unitCost * goodQty),
        defect_amount: round2(unitCost * defectQty),
        loss_qty: lossQty,
        loss_amount: loss,
      })
    }

    const doc = {
      no,
      trade_in_id: tradeIn ? tradeIn._id : '',
      source_product_id: sourceProductId,
      source_product_name: sourceProduct.name,
      warehouse_id: warehouseId,
      qty,
      items,
      labor_cost: laborCost,
      source_unit_cost: sourceUnitCost,
      total_cost: totalCost,
      loss_amount: lossAmount,
      status: '已完成',
      operator_openid: ctx.openid || '',
      operator_name: ctx.user ? ctx.user.name : '',
      note: String(payload.note || '').trim(),
      created_at: now,
      completed_at: now,
      updated_at: now,
    }
    const addRes = await transaction.collection('dismantles').add({ data: doc })

    if (tradeIn) {
      await transaction.collection('trade_ins').doc(tradeIn._id).update({
        data: {
          status: '已拆解',
          disposal: '拆解',
          dismantle_id: addRes._id,
          completed_at: now,
          updated_at: now,
        },
      })
    }

    result = { id: addRes._id, no, total_cost: totalCost, loss_amount: lossAmount }
  })

  await audit(db, ctx.user, {
    module: 'dismantle',
    action: 'create',
    ref_type: 'dismantle',
    ref_id: result.id,
    summary: `拆解 ${sourceProduct.name} ${qty}，总成本 ${result.total_cost}，损耗 ${result.loss_amount}`,
    after: result,
  })

  return result
}

module.exports = {
  'dismantle.list': { module: 'dismantle', action: 'read', handler: list },
  'dismantle.get': { module: 'dismantle', action: 'read', handler: get },
  'dismantle.create': { module: 'dismantle', action: 'create', handler: create },
  'bom.get': { module: 'dismantle', action: 'read', handler: bomGet },
  'bom.save': { module: 'dismantle', action: 'create', handler: bomSave },
}
