const { fail, pick, escapeReg, nextNo, getDoc, audit, fetchAll, querySorted } = require('../lib/util')

const STATUS = ['在售', '停售', '清仓']
const CONDITIONS = ['99新', '95新', '9新', '85新', '8新', '磕碰', '故障', '其他']

async function list(ctx, payload) {
  const db = ctx.db
  const _ = db.command
  const page = Math.max(1, Number(payload.page) || 1)
  const pageSize = Math.min(100, Number(payload.pageSize) || 50)

  const base = {}
  if (payload.category) base.category = payload.category
  if (payload.status) base.status = payload.status

  let query = base
  if (payload.keyword) {
    const reg = db.RegExp({ regexp: escapeReg(String(payload.keyword).trim()), options: 'i' })
    const or = _.or([{ name: reg }, { sku_code: reg }, { barcode: reg }, { brand: reg }])
    query = Object.keys(base).length ? _.and([base, or]) : or
  }

  const res = await querySorted(db, 'products', query, {
    limit: pageSize,
    skip: (page - 1) * pageSize,
  })
  const total = await db.collection('products').where(query).count()

  return { list: res, total: total.total, page, pageSize }
}

async function get(ctx, payload) {
  const product = await getDoc(ctx.db, 'products', payload.id)
  const inventory = await ctx.db.collection('inventory').where({ product_id: product._id }).limit(20).get()
  const txns = await querySorted(ctx.db, 'inventory_txns', { product_id: product._id }, { limit: 20 })
  return { product, inventory: inventory.data, txns }
}

async function save(ctx, payload) {
  const db = ctx.db
  const fields = pick(payload, [
    'sku_code',
    'name',
    'category',
    'brand',
    'condition',
    'spec',
    'unit',
    'barcode',
    'safety_stock',
    'status',
    'image',
    'note',
  ])

  if (!fields.name) fail(400, '请填写商品名称')
  if (fields.safety_stock !== undefined) fields.safety_stock = Number(fields.safety_stock) || 0
  if (fields.status && STATUS.indexOf(fields.status) < 0) fail(400, '商品状态不合法')
  if (fields.condition && CONDITIONS.indexOf(fields.condition) < 0) fail(400, '商品状况不合法')
  if (payload.supplier_id !== undefined) {
    const supplierId = String(payload.supplier_id || '')
    if (supplierId) {
      const supplier = await getDoc(db, 'suppliers', supplierId)
      fields.supplier_id = supplierId
      fields.supplier_name = supplier.name
    } else {
      fields.supplier_id = ''
      fields.supplier_name = ''
    }
  }
  fields.updated_at = new Date()

  if (payload.id) {
    const before = await getDoc(db, 'products', payload.id)
    await db.collection('products').doc(payload.id).update({ data: fields })
    await audit(db, ctx.user, {
      module: 'product',
      action: 'update',
      ref_type: 'product',
      ref_id: payload.id,
      summary: `修改商品 ${before.name}`,
      before: { name: before.name, status: before.status, safety_stock: before.safety_stock },
      after: fields,
    })
    return { id: payload.id }
  }

  fields.sku_code = fields.sku_code || (await nextNo(db, 'SKU'))
  fields.status = fields.status || '在售'
  fields.created_at = new Date()
  const res = await db.collection('products').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'product',
    action: 'create',
    ref_type: 'product',
    ref_id: res._id,
    summary: `新增商品 ${fields.name}`,
    after: fields,
  })
  return { id: res._id, sku_code: fields.sku_code }
}

async function remove(ctx, payload) {
  const db = ctx.db
  const product = await getDoc(db, 'products', payload.id)
  const inv = await db.collection('inventory').where({ product_id: payload.id }).limit(100).get()
  const stock = inv.data.reduce((sum, row) => sum + Number(row.qty_available || 0), 0)
  if (stock > 0) fail(400, `该商品仍有库存 ${stock}，请先清空库存`)

  const purchaseOrders = await fetchAll(db, 'purchase_orders', {})
  const openPurchase = purchaseOrders.find(
    (row) => row.status !== '已入库' && (row.items || []).some((item) => item.product_id === payload.id)
  )
  if (openPurchase) fail(400, `该商品存在未完成采购单 ${openPurchase.no}，不能删除`)

  let stocktakes = []
  try {
    stocktakes = await fetchAll(db, 'stocktakes', { status: '盘点中' })
  } catch (err) {
    stocktakes = []
  }
  const inStocktake = stocktakes.find((row) =>
    (row.items || []).some((item) => item.product_id === payload.id)
  )
  if (inStocktake) fail(400, `该商品在盘点单 ${inStocktake.no} 中，请先完成盘点后再删除`)

  let repairs = []
  try {
    repairs = await fetchAll(db, 'repairs', { product_id: payload.id, status: '维修中' })
  } catch (err) {
    repairs = []
  }
  if (repairs.length) fail(400, `该商品有 ${repairs.length} 张维修中的维修单，请先完成后删除`)

  await db.collection('products').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'product',
    action: 'delete',
    ref_type: 'product',
    ref_id: payload.id,
    summary: `删除商品 ${product.name}`,
    before: { name: product.name, sku_code: product.sku_code },
  })
  return { ok: true }
}

module.exports = {
  'product.list': { module: 'product', action: 'read', handler: list },
  'product.get': { module: 'product', action: 'read', handler: get },
  'product.save': { module: 'product', action: 'create', handler: save },
  'product.remove': { module: 'product', action: 'delete', handler: remove },
}
