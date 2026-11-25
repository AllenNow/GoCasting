const ROLE_LABELS = {
  owner: '老板',
  operator: '运营',
  warehouse: '仓库',
  finance: '财务',
  service: '客服',
}

const ROLE_RULES = {
  owner: { '*': ['*'] },
  operator: {
    product: ['read', 'create', 'update'],
    supplier: ['read', 'create', 'update'],
    purchase: ['read', 'create', 'update', 'pay'],
    inventory: ['read', 'stockin', 'adjust'],
    repair: ['read', 'create', 'update'],
    tradeIn: ['read', 'create', 'update'],
    dismantle: ['read', 'create'],
    order: ['read', 'create', 'update', 'delete', 'ship', 'refund', 'settle'],
    afterSale: ['read', 'create', 'update', 'delete'],
    expense: ['read', 'create'],
    cash: ['read', 'create'],
    settlement: ['read'],
    report: ['read'],
    setting: ['read'],
  },
  warehouse: {
    product: ['read'],
    supplier: ['read'],
    purchase: ['read', 'receive'],
    inventory: ['read', 'stockin', 'adjust', 'transfer'],
    repair: ['read', 'create', 'update'],
    tradeIn: ['read', 'create', 'update'],
    dismantle: ['read', 'create'],
    order: ['read', 'ship'],
    afterSale: ['read'],
    report: ['read'],
    setting: ['read'],
  },
  finance: {
    product: ['read'],
    supplier: ['read', 'create', 'update'],
    purchase: ['read', 'pay'],
    inventory: ['read'],
    repair: ['read'],
    tradeIn: ['read'],
    dismantle: ['read'],
    order: ['read'],
    afterSale: ['read'],
    expense: ['read', 'create', 'update', 'delete'],
    cash: ['read', 'create', 'update', 'delete'],
    settlement: ['read', 'create', 'update'],
    report: ['read', 'export'],
    setting: ['read'],
  },
  service: {
    product: ['read'],
    inventory: ['read'],
    repair: ['read'],
    tradeIn: ['read'],
    dismantle: ['read'],
    order: ['read', 'update'],
    afterSale: ['read', 'create', 'update'],
    report: ['read'],
    setting: ['read'],
  },
}

const COST_HIDDEN_ROLES = ['warehouse', 'service']

function permissionsOf(role) {
  return ROLE_RULES[role] || {}
}

function can(role, moduleName, action) {
  const rules = ROLE_RULES[role]
  if (!rules) return false
  if (rules['*'] && rules['*'].indexOf('*') >= 0) return true
  const actions = rules[moduleName]
  return !!actions && actions.indexOf(action) >= 0
}

function shouldHideCost(role) {
  return COST_HIDDEN_ROLES.indexOf(role) >= 0
}

module.exports = {
  ROLE_LABELS,
  ROLE_RULES,
  permissionsOf,
  can,
  shouldHideCost,
}
