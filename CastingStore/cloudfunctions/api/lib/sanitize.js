const COST_KEYS = [
  'unit_price',
  'purchase_price',
  'avg_cost',
  'cost',
  'cost_snapshot',
  'cost_total',
  'goods_cost',
  'allocated_cost',
  'total_cost',
  'received_cost',
  'gross_profit',
  'profit',
  'profit_rate',
  'margin',
  'avgCost',
  'costTotal',
  'stock_value',
  'total_value',
  'total_profit',
  'today_profit',
  'month_profit',
  'dropship_freight',
  'supplier_payable',
  'refund_cost',
  'loss_amount',
  'return_cost',
  'order_profit',
  'gain_amount',
]

const COST_KEY_SET = {}
COST_KEYS.forEach((key) => {
  COST_KEY_SET[key] = true
})

function clone(value) {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(clone)
  if (typeof value === 'object') {
    const out = {}
    Object.keys(value).forEach((key) => {
      out[key] = clone(value[key])
    })
    return out
  }
  return value
}

function stripCost(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(stripCost)
  if (value instanceof Date) return value
  if (typeof value === 'object') {
    const out = {}
    Object.keys(value).forEach((key) => {
      if (COST_KEY_SET[key]) return
      out[key] = stripCost(value[key])
    })
    return out
  }
  return value
}

/**
 * 服务端字段裁剪：仓库/客服角色不返回任何成本与利润字段。
 * 前端隐藏只是体验，安全边界在这里。
 */
function sanitize(data, role) {
  if (role !== 'warehouse' && role !== 'service') return data
  return stripCost(clone(data))
}

module.exports = { sanitize }
