const { startOfDay, startOfMonth, round2, round4, fetchAll, dayKey, dayLabel, fail } = require('../lib/util')

const VALID_STATUS = ['待发货', '已发货', '已完成']

function sumBy(list, fn) {
  return list.reduce((sum, item) => sum + (Number(fn(item)) || 0), 0)
}

// 实收统一口径：发生退款后以 net_paid 为准，未退款订单沿用 paid_amount
function revenueOf(order) {
  return Number(
    order.net_paid !== undefined && order.net_paid !== null ? order.net_paid : order.paid_amount || 0
  )
}

async function dashboard(ctx) {
  const db = ctx.db
  const _ = db.command
  const now = new Date()
  const today = startOfDay(now)
  const month = startOfMonth(now)

  const monthOrders = await fetchAll(db, 'orders', { created_at: _.gte(month) })
  const valid = monthOrders.filter((order) => VALID_STATUS.indexOf(order.status) >= 0)
  const todayOrders = valid.filter((order) => new Date(order.created_at).getTime() >= today.getTime())

  const monthSales = round2(sumBy(valid, revenueOf))
  const monthProfit = round2(sumBy(valid, (o) => o.profit))
  const todaySales = round2(sumBy(todayOrders, revenueOf))
  const todayProfit = round2(sumBy(todayOrders, (o) => o.profit))

  const pendingRes = await db.collection('orders').where({ status: '待发货' }).count()

  const inventory = await fetchAll(db, 'inventory', {})
  const stockMap = {}
  let stockValue = 0
  inventory.forEach((row) => {
    const qty = Number(row.qty_available || 0)
    stockValue += qty * Number(row.avg_cost || 0)
    stockMap[row.product_id] = (stockMap[row.product_id] || 0) + qty
  })

  const products = await fetchAll(db, 'products', {})
  let lowStock = 0
  products.forEach((product) => {
    const stock = stockMap[product._id] || 0
    if (stock < Number(product.safety_stock || 0)) lowStock += 1
  })

  const cutoff = new Date(now.getTime() - 90 * 24 * 3600 * 1000)
  const saleTxns = await fetchAll(db, 'inventory_txns', {
    type: '销售出库',
    created_at: _.gte(cutoff),
  })
  const soldSet = {}
  saleTxns.forEach((txn) => {
    soldSet[txn.product_id] = true
  })
  let slowMoving = 0
  products.forEach((product) => {
    if ((stockMap[product._id] || 0) > 0 && !soldSet[product._id]) slowMoving += 1
  })

  let unpaidPurchase = 0
  try {
    const purchases = await fetchAll(db, 'purchase_orders', {})
    unpaidPurchase = purchases.filter(
      (order) => Number(order.total_cost || 0) > 0 && order.pay_status !== '已付款'
    ).length
  } catch (err) {
    unpaidPurchase = 0
  }

  let pendingAfterSale = 0
  try {
    const res = await db.collection('after_sales').where({ status: '待处理' }).count()
    pendingAfterSale = res.total
  } catch (err) {
    pendingAfterSale = 0
  }

  let dropshipUnsettled = 0
  try {
    const dropshipOrders = await fetchAll(db, 'orders', { fulfill_mode: '代发' })
    dropshipUnsettled = dropshipOrders.filter(
      (order) =>
        Number(order.supplier_payable || 0) > 0 &&
        order.supplier_pay_status !== '已结算' &&
        order.status !== '已取消'
    ).length
  } catch (err) {
    dropshipUnsettled = 0
  }

  let monthStocktakeDone = false
  let monthStocktakeCount = 0
  try {
    const key = dayKey(now)
    const period = `${key.slice(0, 4)}-${key.slice(4, 6)}`
    const stocktakes = await fetchAll(db, 'stocktakes', { period })
    monthStocktakeCount = stocktakes.length
    monthStocktakeDone = stocktakes.some((row) => row.status === '已完成')
  } catch (err) {
    monthStocktakeDone = false
    monthStocktakeCount = 0
  }

  let pendingSettlement = 0
  try {
    const key = dayKey(now)
    const period = `${key.slice(0, 4)}-${key.slice(4, 6)}`
    const settlements = await fetchAll(db, 'settlements', { period })
    const settled = {}
    settlements.forEach((row) => {
      settled[row.platform] = true
    })
    const platforms = {}
    valid.forEach((order) => {
      platforms[order.platform || '未分类'] = true
    })
    pendingSettlement = Object.keys(platforms).filter((platform) => !settled[platform]).length
  } catch (err) {
    pendingSettlement = 0
  }

  let cashBalance = null
  if (ctx.user && ['owner', 'operator', 'finance'].indexOf(ctx.user.role) >= 0) {
    try {
      let accounts = []
      let cashTxns = []
      try {
        accounts = await fetchAll(db, 'cash_accounts', {})
      } catch (err) {
        accounts = []
      }
      try {
        cashTxns = await fetchAll(db, 'cash_txns', {})
      } catch (err) {
        cashTxns = []
      }
      let balance = 0
      accounts.forEach((account) => {
        balance += Number(account.initial_balance || 0)
      })
      cashTxns.forEach((txn) => {
        balance += (txn.type === '支出' ? -1 : 1) * Number(txn.amount || 0)
      })
      cashBalance = round2(balance)
    } catch (err) {
      cashBalance = null
    }
  }

  return {
    today_sales: todaySales,
    today_profit: todayProfit,
    today_orders: todayOrders.length,
    month_sales: monthSales,
    month_profit: monthProfit,
    month_profit_rate: monthSales > 0 ? round4(monthProfit / monthSales) : 0,
    month_orders: valid.length,
    stock_value: round2(stockValue),
    stock_skus: products.length,
    pending_ship: pendingRes.total,
    low_stock: lowStock,
    slow_moving: slowMoving,
    unpaid_purchase: unpaidPurchase,
    pending_after_sale: pendingAfterSale,
    dropship_unsettled: dropshipUnsettled,
    month_stocktake_done: monthStocktakeDone,
    month_stocktake_count: monthStocktakeCount,
    pending_settlement: pendingSettlement,
    cash_balance: cashBalance,
    updated_at: new Date(),
  }
}

async function profit(ctx, payload) {
  const db = ctx.db
  const _ = db.command
  const days = Math.min(180, Number(payload.days) || 30)
  const from = startOfDay(new Date(), days - 1)
  const orders = await fetchAll(db, 'orders', { created_at: _.gte(from) })
  const valid = orders.filter((order) => VALID_STATUS.indexOf(order.status) >= 0)

  const dailyMap = {}
  const platformMap = {}
  const productMap = {}

  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayLabel(startOfDay(new Date(), i))
    dailyMap[key] = { date: key, sales: 0, profit: 0, orders: 0 }
  }

  valid.forEach((order) => {
    const key = dayLabel(order.created_at)
    if (!dailyMap[key]) dailyMap[key] = { date: key, sales: 0, profit: 0, orders: 0 }
    dailyMap[key].sales += revenueOf(order)
    dailyMap[key].profit += Number(order.profit || 0)
    dailyMap[key].orders += 1

    const platform = order.platform || '未分类'
    if (!platformMap[platform]) {
      platformMap[platform] = { platform, sales: 0, profit: 0, fee_total: 0, orders: 0 }
    }
    platformMap[platform].sales += revenueOf(order)
    platformMap[platform].profit += Number(order.profit || 0)
    platformMap[platform].fee_total += Number(order.fee_total || 0)
    platformMap[platform].orders += 1

    ;(order.items || []).forEach((item) => {
      if (!productMap[item.product_id]) {
        productMap[item.product_id] = {
          product_id: item.product_id,
          name: item.product_name,
          sales: 0,
          qty: 0,
          cost: 0,
          profit: 0,
        }
      }
      const row = productMap[item.product_id]
      row.sales += Number(item.amount || 0)
      row.qty += Number(item.qty || 0)
      row.cost += Number(item.cost_snapshot || 0) * Number(item.qty || 0)
    })
  })

  const daily = Object.keys(dailyMap)
    .sort()
    .map((key) => ({
      date: dailyMap[key].date,
      sales: round2(dailyMap[key].sales),
      profit: round2(dailyMap[key].profit),
      orders: dailyMap[key].orders,
    }))

  const platforms = Object.keys(platformMap)
    .map((key) => ({
      platform: key,
      sales: round2(platformMap[key].sales),
      profit: round2(platformMap[key].profit),
      fee_total: round2(platformMap[key].fee_total),
      orders: platformMap[key].orders,
    }))
    .sort((a, b) => b.sales - a.sales)

  const products = Object.keys(productMap)
    .map((key) => {
      const row = productMap[key]
      return {
        product_id: key,
        name: row.name,
        qty: round2(row.qty),
        sales: round2(row.sales),
        profit: round2(row.sales - row.cost),
      }
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 20)

  const totalSales = round2(sumBy(valid, revenueOf))
  const totalProfit = round2(sumBy(valid, (o) => o.profit))
  return {
    range_days: days,
    total_sales: totalSales,
    total_profit: totalProfit,
    total_orders: valid.length,
    daily,
    platforms,
    products,
  }
}

async function inventoryReport(ctx) {
  const db = ctx.db
  const _ = db.command
  const products = await fetchAll(db, 'products', {})
  const inventory = await fetchAll(db, 'inventory', {})
  const productMap = {}
  products.forEach((product) => {
    productMap[product._id] = product
  })

  const now = new Date().getTime()
  const buckets = [
    { label: '0-30 天', min: 0, max: 30, value: 0, skus: 0 },
    { label: '31-60 天', min: 31, max: 60, value: 0, skus: 0 },
    { label: '61-90 天', min: 61, max: 90, value: 0, skus: 0 },
    { label: '90 天以上', min: 91, max: 99999, value: 0, skus: 0 },
  ]
  const stockMap = {}
  let stockValue = 0

  inventory.forEach((row) => {
    const qty = Number(row.qty_available || 0)
    if (qty <= 0) return
    const value = qty * Number(row.avg_cost || 0)
    stockValue += value
    const lastIn = row.last_in_at ? new Date(row.last_in_at).getTime() : now
    const ageDays = Math.max(0, Math.floor((now - lastIn) / (24 * 3600 * 1000)))
    const bucket = buckets.find((b) => ageDays >= b.min && ageDays <= b.max) || buckets[3]
    bucket.value += value
    bucket.skus += 1
    const item = stockMap[row.product_id] || { qty: 0, value: 0, ageDays: 0 }
    item.qty += qty
    item.value += value
    item.ageDays = Math.max(item.ageDays, ageDays)
    stockMap[row.product_id] = item
  })

  const from = new Date(now - 30 * 24 * 3600 * 1000)
  const saleTxns = await fetchAll(db, 'inventory_txns', {
    type: '销售出库',
    created_at: _.gte(from),
  })
  const soldCost = saleTxns.reduce((sum, txn) => sum + Math.abs(Number(txn.amount || 0)), 0)
  const turnoverDays = soldCost > 0 ? round2((stockValue / soldCost) * 30) : 0

  const slow = Object.keys(stockMap)
    .filter((productId) => stockMap[productId].ageDays >= 90)
    .map((productId) => {
      const product = productMap[productId] || {}
      return {
        product_id: productId,
        name: product.name || '已删除商品',
        qty: round2(stockMap[productId].qty),
        value: round2(stockMap[productId].value),
        age_days: stockMap[productId].ageDays,
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)

  return {
    stock_value: round2(stockValue),
    stock_skus: Object.keys(stockMap).length,
    turnover_days: turnoverDays,
    aging: buckets.map((b) => ({ label: b.label, value: round2(b.value), skus: b.skus })),
    slow,
  }
}

async function channels(ctx, payload) {
  const db = ctx.db
  const _ = db.command
  const from = payload.month ? new Date(payload.month) : startOfMonth(new Date())
  const orders = await fetchAll(db, 'orders', { created_at: _.gte(from) })
  const valid = orders.filter((order) => VALID_STATUS.indexOf(order.status) >= 0)

  const map = {}
  valid.forEach((order) => {
    const platform = order.platform || '未分类'
    if (!map[platform]) {
      map[platform] = { platform, sales: 0, cost: 0, fee: 0, profit: 0, orders: 0 }
    }
    map[platform].sales += revenueOf(order)
    map[platform].cost += Number(order.goods_cost || 0) - Number(order.refund_cost || 0)
    map[platform].fee += Number(order.fee_total || 0)
    map[platform].profit += Number(order.profit || 0)
    map[platform].orders += 1
  })

  const list = Object.keys(map)
    .map((key) => ({
      platform: key,
      sales: round2(map[key].sales),
      cost: round2(map[key].cost),
      fee: round2(map[key].fee),
      profit: round2(map[key].profit),
      orders: map[key].orders,
      roi: map[key].fee > 0 ? round4((map[key].profit - 0) / map[key].fee) : 0,
    }))
    .sort((a, b) => b.sales - a.sales)

  return { list, from }
}

async function expenses(ctx) {
  const db = ctx.db
  const _ = db.command
  const from = startOfMonth(new Date())
  const docs = await fetchAll(db, 'expenses', { created_at: _.gte(from) })
  const map = {}
  let total = 0
  docs.forEach((doc) => {
    const type = doc.type || '其他'
    map[type] = (map[type] || 0) + Number(doc.amount || 0)
    total += Number(doc.amount || 0)
  })
  const list = Object.keys(map)
    .map((type) => ({ type, amount: round2(map[type]), ratio: total > 0 ? map[type] / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
  return { total: round2(total), list, month: from }
}

async function products(ctx, payload) {
  const db = ctx.db
  const _ = db.command
  const days = Math.min(365, Number(payload.days) || 90)
  const from = startOfDay(new Date(), days - 1)
  const results = await Promise.all([
    fetchAll(db, 'orders', { created_at: _.gte(from) }),
    fetchAll(db, 'products', {}),
    fetchAll(db, 'inventory', {}),
    fetchAll(db, 'inventory_txns', { type: '销售出库', created_at: _.gte(from) }),
  ])
  const orders = results[0]
  const allProducts = results[1]
  const inventory = results[2]
  const saleTxns = results[3]

  const valid = orders.filter((order) => VALID_STATUS.indexOf(order.status) >= 0)
  const soldMap = {}
  valid.forEach((order) => {
    ;(order.items || []).forEach((item) => {
      const id = item.product_id
      if (!id) return
      if (!soldMap[id]) soldMap[id] = { qty: 0, sales: 0, cost: 0 }
      soldMap[id].qty += Number(item.qty || 0)
      soldMap[id].sales += Number(item.amount || 0)
      soldMap[id].cost += Number(item.cost_snapshot || 0) * Number(item.qty || 0)
    })
  })

  const stockMap = {}
  inventory.forEach((row) => {
    stockMap[row.product_id] = (stockMap[row.product_id] || 0) + Number(row.qty_available || 0)
  })

  const lastSaleMap = {}
  saleTxns.forEach((txn) => {
    const t = txn.created_at ? new Date(txn.created_at).getTime() : 0
    if (!lastSaleMap[txn.product_id] || t > lastSaleMap[txn.product_id]) lastSaleMap[txn.product_id] = t
  })

  const now = new Date().getTime()
  const list = allProducts.map((product) => {
    const sold = soldMap[product._id] || { qty: 0, sales: 0, cost: 0 }
    const stock = Number(stockMap[product._id] || 0)
    const lastSale = lastSaleMap[product._id] || 0
    return {
      product_id: product._id,
      name: product.name,
      sku_code: product.sku_code || '',
      category: product.category || '',
      status: product.status || '',
      qty: round2(sold.qty),
      sales: round2(sold.sales),
      cost: round2(sold.cost),
      profit: round2(sold.sales - sold.cost),
      profit_rate: sold.sales > 0 ? round4((sold.sales - sold.cost) / sold.sales) : 0,
      stock: round2(stock),
      safety_stock: round2(product.safety_stock),
      no_sale_days: lastSale ? Math.floor((now - lastSale) / (24 * 3600 * 1000)) : null,
    }
  }).sort((a, b) => b.qty - a.qty || b.sales - a.sales)

  const activeSkus = allProducts.filter((product) => product.status === '在售').length
  const soldSkus = Object.keys(soldMap).filter((id) => soldMap[id].qty > 0).length
  return {
    range_days: days,
    total_skus: allProducts.length,
    active_skus: activeSkus,
    sold_skus: soldSkus,
    sell_through: activeSkus > 0 ? round4(soldSkus / activeSkus) : 0,
    list,
  }
}

const TZ = 8 * 60 * 60 * 1000

function dateTimeLabel(value) {
  if (!value) return ''
  const shifted = new Date(new Date(value).getTime() + TZ)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

function csvCell(value) {
  const text = value === undefined || value === null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function buildCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')]
  rows.forEach((row) => lines.push(row.map(csvCell).join(',')))
  return `\uFEFF${lines.join('\r\n')}`
}

async function exportReport(ctx, payload) {
  const db = ctx.db
  const _ = db.command
  const type = String(payload.type || 'orders')
  const days = Math.min(180, Number(payload.days) || 30)
  const now = new Date()
  const stamp = dayLabel(now)

  if (type === 'orders') {
    const from = startOfDay(now, days - 1)
    const orders = await fetchAll(db, 'orders', { created_at: _.gte(from) })
    const valid = orders
      .filter((order) => VALID_STATUS.indexOf(order.status) >= 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const headers = [
      '订单号', '平台单号', '平台', '状态', '下单时间', '买家', '手机号',
      '商品金额', '优惠', '实收', '商品成本', '快递费', '包装费', '赠品',
      '介绍费', '平台佣金', '支付手续费', '其他费用', '毛利', '毛利率', '商品明细',
    ]
    const rows = valid.map((order) => [
      order.no,
      order.platform_order_no,
      order.platform,
      order.status,
      dateTimeLabel(order.created_at),
      order.buyer_name,
      order.buyer_phone,
      round2(order.goods_amount),
      round2(order.discount),
      round2(order.paid_amount),
      round2(order.goods_cost),
      round2(order.shipping_fee),
      round2(order.packaging_fee),
      round2(order.gift_cost),
      round2(order.referral_fee),
      round2(order.commission),
      round2(order.payment_fee),
      round2(order.other_fee),
      round2(order.profit),
      Number(order.paid_amount || 0) > 0
        ? `${round2((Number(order.profit || 0) / Number(order.paid_amount)) * 100)}%`
        : '0%',
      (order.items || []).map((item) => `${item.product_name}x${item.qty}`).join('；'),
    ])
    const totalPaid = round2(sumBy(valid, (o) => o.paid_amount))
    const totalProfit = round2(sumBy(valid, (o) => o.profit))
    rows.push([
      '合计', '', '', '', '', '', '',
      round2(sumBy(valid, (o) => o.goods_amount)),
      round2(sumBy(valid, (o) => o.discount)),
      totalPaid,
      round2(sumBy(valid, (o) => o.goods_cost)),
      round2(sumBy(valid, (o) => o.shipping_fee)),
      round2(sumBy(valid, (o) => o.packaging_fee)),
      round2(sumBy(valid, (o) => o.gift_cost)),
      round2(sumBy(valid, (o) => o.referral_fee)),
      round2(sumBy(valid, (o) => o.commission)),
      round2(sumBy(valid, (o) => o.payment_fee)),
      round2(sumBy(valid, (o) => o.other_fee)),
      totalProfit,
      totalPaid > 0 ? `${round2((totalProfit / totalPaid) * 100)}%` : '0%',
      `${valid.length} 单`,
    ])
    return { filename: `订单明细_${stamp}.csv`, count: valid.length, content: buildCsv(headers, rows) }
  }

  if (type === 'daily') {
    const data = await profit(ctx, { days })
    const rows = (data.daily || []).map((row) => [row.date, row.sales, row.profit, row.orders])
    rows.push(['合计', data.total_sales, data.total_profit, data.total_orders])
    return {
      filename: `日报汇总_${stamp}.csv`,
      count: (data.daily || []).length,
      content: buildCsv(['日期', '实收', '毛利', '订单数'], rows),
    }
  }

  if (type === 'channels') {
    const data = await channels(ctx, {})
    const rows = (data.list || []).map((row) => [
      row.platform, row.orders, row.sales, row.cost, row.fee, row.profit, row.roi,
    ])
    rows.push([
      '合计',
      (data.list || []).reduce((sum, row) => sum + row.orders, 0),
      round2((data.list || []).reduce((sum, row) => sum + row.sales, 0)),
      round2((data.list || []).reduce((sum, row) => sum + row.cost, 0)),
      round2((data.list || []).reduce((sum, row) => sum + row.fee, 0)),
      round2((data.list || []).reduce((sum, row) => sum + row.profit, 0)),
      '',
    ])
    return {
      filename: `渠道汇总_${stamp}.csv`,
      count: (data.list || []).length,
      content: buildCsv(['平台', '订单数', '实收', '商品成本', '费用', '毛利', 'ROI'], rows),
    }
  }

  if (type === 'expenses') {
    const data = await expenses(ctx)
    const rows = (data.list || []).map((row) => [row.type, row.amount, `${round2(row.ratio * 100)}%`])
    rows.push(['合计', data.total, '100%'])
    return {
      filename: `费用结构_${stamp}.csv`,
      count: (data.list || []).length,
      content: buildCsv(['费用类型', '金额', '占比'], rows),
    }
  }

  if (type === 'inventory') {
    const products = await fetchAll(db, 'products', {})
    const inventory = await fetchAll(db, 'inventory', {})
    const productMap = {}
    products.forEach((product) => {
      productMap[product._id] = product
    })
    const stockMap = {}
    inventory.forEach((row) => {
      const qty = Number(row.qty_available || 0)
      if (!stockMap[row.product_id]) stockMap[row.product_id] = { qty: 0, value: 0 }
      stockMap[row.product_id].qty += qty
      stockMap[row.product_id].value += qty * Number(row.avg_cost || 0)
    })
    const rows = Object.keys(stockMap)
      .map((productId) => {
        const product = productMap[productId] || {}
        const stock = stockMap[productId]
        return {
          sku: product.sku_code || '',
          name: product.name || '已删除商品',
          qty: round2(stock.qty),
          cost: stock.qty > 0 ? round4(stock.value / stock.qty) : 0,
          value: round2(stock.value),
        }
      })
      .sort((a, b) => b.value - a.value)
      .map((row) => [row.sku, row.name, row.qty, row.cost, row.value])
    return {
      filename: `库存明细_${stamp}.csv`,
      count: rows.length,
      content: buildCsv(['商品编码', '商品名称', '可用库存', '平均成本', '库存金额'], rows),
    }
  }

  if (type === 'products') {
    const data = await products(ctx, { days })
    const rows = (data.list || []).map((row) => [
      row.sku_code,
      row.name,
      row.category,
      row.status,
      row.qty,
      row.sales,
      row.profit,
      `${round2(row.profit_rate * 100)}%`,
      row.stock,
      row.no_sale_days === null ? '无销售' : row.no_sale_days,
    ])
    return {
      filename: `商品动销_${stamp}.csv`,
      count: rows.length,
      content: buildCsv(
        ['商品编码', '商品名称', '品类', '状态', '销量', '销售额', '毛利', '毛利率', '当前库存', '距上次销售天数'],
        rows
      ),
    }
  }

  return fail(400, '未知的导出类型')
}

module.exports = {
  'report.dashboard': { module: 'report', action: 'read', handler: dashboard },
  'report.profit': { module: 'report', action: 'read', handler: profit },
  'report.inventory': { module: 'report', action: 'read', handler: inventoryReport },
  'report.products': { module: 'report', action: 'read', handler: products },
  'report.channels': { module: 'report', action: 'read', handler: channels },
  'report.expenses': { module: 'report', action: 'read', handler: expenses },
  'report.export': { module: 'report', action: 'export', handler: exportReport },
}
