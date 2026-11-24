const {
  fail,
  getDoc,
  audit,
  round2,
  fetchAll,
} = require('../lib/util')

const TYPES = ['收入', '支出']
const CATEGORIES = ['销售回款', '售后退款', '采购付款', '快递费', '介绍费', '赠品', '包装', '推广', '工资', '房租', '其他']
const TZ_OFFSET = 8 * 60 * 60 * 1000

function monthRange(month) {
  const text = String(month || '')
  const parts = text.split('-').map((item) => Number(item))
  const now = new Date(Date.now() + TZ_OFFSET)
  const year = parts[0] || now.getUTCFullYear()
  const mon = parts[1] || now.getUTCMonth() + 1
  const from = new Date(Date.UTC(year, mon - 1, 1) - TZ_OFFSET)
  const to = new Date(Date.UTC(year, mon, 1) - TZ_OFFSET)
  return { from, to, year, month: mon }
}

function monthLabel(year, mon) {
  return `${year}-${String(mon).padStart(2, '0')}`
}

async function ensureCash(db) {
  const names = ['cash_accounts', 'cash_txns']
  for (let i = 0; i < names.length; i += 1) {
    try {
      await db.createCollection(names[i])
    } catch (err) {
      // 集合已存在
    }
  }
}

async function autoAccount(db) {
  await ensureCash(db)
  const defaults = await fetchAll(db, 'cash_accounts', { is_default: true })
  if (defaults.length) return defaults[0]
  const all = await fetchAll(db, 'cash_accounts', {})
  if (all.length) return all[0]
  const now = new Date()
  const res = await db.collection('cash_accounts').add({
    data: {
      name: '默认账户',
      initial_balance: 0,
      note: '系统自动创建',
      is_default: true,
      created_at: now,
      updated_at: now,
    },
  })
  return { _id: res._id, name: '默认账户' }
}

async function removeOrderCash(db, orderId) {
  if (!orderId) return
  try {
    await ensureCash(db)
    await db.collection('cash_txns').where({ ref_type: 'order', ref_id: orderId, source: 'auto' }).remove()
  } catch (err) {
    console.error('clear order cash failed:', err)
  }
}

/**
 * 同步订单自动现金流：按订单当前实收与退款整体重算，重复保存/退款不会重复记账。
 * 未付款或已取消的订单不记收入；发生退款时记一笔售后退款支出。
 */
async function syncOrderCash(db, order) {
  if (!order || !order._id) return
  try {
    await removeOrderCash(db, order._id)
    const paid = round2(order.paid_amount)
    const refunded = round2(order.refund_amount)
    const received = order.status !== '待付款' && order.status !== '已取消'
    if (!received && refunded <= 0) return

    const account = await autoAccount(db)
    const now = new Date()
    const base = {
      account_id: account._id,
      account_name: account.name,
      ref_type: 'order',
      ref_id: order._id,
      ref_no: order.no || '',
      operator_openid: '',
      operator_name: 'system',
      source: 'auto',
      created_at: now,
    }
    if (received && paid > 0) {
      await db.collection('cash_txns').add({
        data: {
          ...base,
          type: '收入',
          amount: paid,
          category: '销售回款',
          note: `订单 ${order.no || ''} 销售回款`,
          occurred_at: order.order_date || order.created_at || now,
        },
      })
    }
    if (refunded > 0) {
      await db.collection('cash_txns').add({
        data: {
          ...base,
          type: '支出',
          amount: refunded,
          category: '售后退款',
          note: `订单 ${order.no || ''} 售后退款`,
          occurred_at: order.refunded_at || order.updated_at || now,
        },
      })
    }
  } catch (err) {
    console.error('sync order cash failed:', err)
  }
}

async function accounts(ctx) {
  const db = ctx.db
  await ensureCash(db)
  const list = await fetchAll(db, 'cash_accounts', {})
  const txns = await fetchAll(db, 'cash_txns', {})
  const balanceMap = {}
  const countMap = {}
  txns.forEach((txn) => {
    const sign = txn.type === '支出' ? -1 : 1
    balanceMap[txn.account_id] = (balanceMap[txn.account_id] || 0) + sign * Number(txn.amount || 0)
    countMap[txn.account_id] = (countMap[txn.account_id] || 0) + 1
  })
  const rows = list
    .map((account) => ({
      _id: account._id,
      name: account.name,
      initial_balance: round2(account.initial_balance),
      note: account.note || '',
      is_default: !!account.is_default,
      balance: round2(Number(account.initial_balance || 0) + (balanceMap[account._id] || 0)),
      txn_count: countMap[account._id] || 0,
    }))
    .sort((a, b) => (a.is_default === b.is_default ? String(a.name).localeCompare(String(b.name)) : a.is_default ? -1 : 1))
  const total = round2(rows.reduce((sum, row) => sum + row.balance, 0))
  return { list: rows, total }
}

async function accountSave(ctx, payload) {
  const db = ctx.db
  await ensureCash(db)
  const name = String(payload.name || '').trim()
  if (!name) fail(400, '请填写账户名称')
  const initial = round2(payload.initial_balance)

  if (payload.id) {
    const before = await getDoc(db, 'cash_accounts', payload.id)
    await db.collection('cash_accounts').doc(payload.id).update({
      data: { name, initial_balance: initial, note: payload.note || '', updated_at: new Date() },
    })
    await audit(db, ctx.user, {
      module: 'cash',
      action: 'update',
      ref_type: 'cash_account',
      ref_id: payload.id,
      summary: `修改资金账户 ${before.name} → ${name}`,
      before: { name: before.name, initial_balance: before.initial_balance },
      after: { name, initial_balance: initial },
    })
    return { id: payload.id }
  }

  const count = await db.collection('cash_accounts').count()
  const res = await db.collection('cash_accounts').add({
    data: {
      name,
      initial_balance: initial,
      note: payload.note || '',
      is_default: count.total === 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  })
  await audit(db, ctx.user, {
    module: 'cash',
    action: 'create',
    ref_type: 'cash_account',
    ref_id: res._id,
    summary: `新增资金账户 ${name}`,
    after: { name, initial_balance: initial, is_default: count.total === 0 },
  })
  return { id: res._id }
}

async function accountDefault(ctx, payload) {
  const db = ctx.db
  const target = await getDoc(db, 'cash_accounts', payload.id)
  const all = await fetchAll(db, 'cash_accounts', {})
  for (let i = 0; i < all.length; i += 1) {
    const item = all[i]
    if (!item.is_default) continue
    await db.collection('cash_accounts').doc(item._id).update({ data: { is_default: false } })
  }
  await db.collection('cash_accounts').doc(payload.id).update({ data: { is_default: true, updated_at: new Date() } })
  await audit(db, ctx.user, {
    module: 'cash',
    action: 'update',
    ref_type: 'cash_account',
    ref_id: payload.id,
    summary: `设为默认资金账户 ${target.name}`,
  })
  return { ok: true }
}

async function accountRemove(ctx, payload) {
  const db = ctx.db
  const account = await getDoc(db, 'cash_accounts', payload.id)
  const txns = await db.collection('cash_txns').where({ account_id: payload.id }).count()
  if (txns.total > 0) fail(400, '该账户已有收支流水，不能删除')
  await db.collection('cash_accounts').doc(payload.id).remove()
  if (account.is_default) {
    const rest = await fetchAll(db, 'cash_accounts', {})
    if (rest.length) {
      await db.collection('cash_accounts').doc(rest[0]._id).update({ data: { is_default: true } })
    }
  }
  await audit(db, ctx.user, {
    module: 'cash',
    action: 'delete',
    ref_type: 'cash_account',
    ref_id: payload.id,
    summary: `删除资金账户 ${account.name}`,
  })
  return { ok: true }
}

async function txns(ctx, payload) {
  const db = ctx.db
  await ensureCash(db)
  const range = monthRange(payload.month)
  const _ = db.command
  const query = { occurred_at: _.gte(range.from).and(_.lt(range.to)) }
  if (payload.account_id) query.account_id = payload.account_id
  if (payload.type && TYPES.indexOf(payload.type) >= 0) query.type = payload.type
  const list = await fetchAll(db, 'cash_txns', query)
  list.sort((a, b) => new Date(b.occurred_at || b.created_at).getTime() - new Date(a.occurred_at || a.created_at).getTime())
  let income = 0
  let expense = 0
  list.forEach((txn) => {
    if (txn.type === '支出') expense += Number(txn.amount || 0)
    else income += Number(txn.amount || 0)
  })
  return {
    month: monthLabel(range.year, range.month),
    types: TYPES,
    categories: CATEGORIES,
    list: list.slice(0, 200),
    summary: {
      income: round2(income),
      expense: round2(expense),
      net: round2(income - expense),
      count: list.length,
    },
  }
}

async function txnSave(ctx, payload) {
  const db = ctx.db
  await ensureCash(db)
  const type = TYPES.indexOf(payload.type) >= 0 ? payload.type : fail(400, '请选择收入或支出')
  const amount = round2(payload.amount)
  if (!(amount > 0)) fail(400, '金额必须大于 0')
  const account = await getDoc(db, 'cash_accounts', payload.account_id)
  const occurredAt = payload.occurred_at ? new Date(payload.occurred_at) : new Date()
  if (isNaN(occurredAt.getTime())) fail(400, '发生日期格式不正确')

  const fields = {
    type,
    amount,
    category: payload.category || '其他',
    account_id: account._id,
    account_name: account.name,
    note: payload.note || '',
    occurred_at: occurredAt,
    updated_at: new Date(),
  }

  if (payload.id) {
    const before = await getDoc(db, 'cash_txns', payload.id)
    if (before.source === 'auto') fail(400, '订单自动生成的流水不能直接修改，请在订单或售后中处理')
    await db.collection('cash_txns').doc(payload.id).update({ data: fields })
    await audit(db, ctx.user, {
      module: 'cash',
      action: 'update',
      ref_type: 'cash_txn',
      ref_id: payload.id,
      summary: `修改${type}流水 ${amount}`,
      before: { type: before.type, amount: before.amount, category: before.category },
      after: { type, amount, category: fields.category },
    })
    return { id: payload.id }
  }

  fields.created_at = new Date()
  fields.operator_openid = ctx.openid
  fields.operator_name = ctx.user ? ctx.user.name : ''
  const res = await db.collection('cash_txns').add({ data: fields })
  await audit(db, ctx.user, {
    module: 'cash',
    action: 'create',
    ref_type: 'cash_txn',
    ref_id: res._id,
    summary: `登记${type} ${amount}（${fields.category}）`,
    after: { type, amount, category: fields.category, account: account.name },
  })
  return { id: res._id }
}

async function txnRemove(ctx, payload) {
  const db = ctx.db
  const txn = await getDoc(db, 'cash_txns', payload.id)
  if (txn.source === 'auto') fail(400, '订单自动生成的流水不能直接删除，请在订单或售后中处理')
  await db.collection('cash_txns').doc(payload.id).remove()
  await audit(db, ctx.user, {
    module: 'cash',
    action: 'delete',
    ref_type: 'cash_txn',
    ref_id: payload.id,
    summary: `删除${txn.type}流水 ${txn.amount}（${txn.category || ''}）`,
    before: { type: txn.type, amount: txn.amount, category: txn.category },
  })
  return { ok: true }
}

module.exports = {
  'cash.accounts': { module: 'cash', action: 'read', handler: accounts },
  'cash.account.create': { module: 'cash', action: 'create', handler: accountSave },
  'cash.account.update': { module: 'cash', action: 'update', handler: accountSave },
  'cash.account.default': { module: 'cash', action: 'update', handler: accountDefault },
  'cash.account.remove': { module: 'cash', action: 'delete', handler: accountRemove },
  'cash.txns': { module: 'cash', action: 'read', handler: txns },
  'cash.txn.create': { module: 'cash', action: 'create', handler: txnSave },
  'cash.txn.update': { module: 'cash', action: 'update', handler: txnSave },
  'cash.txn.remove': { module: 'cash', action: 'delete', handler: txnRemove },
  syncOrderCash,
  removeOrderCash,
}
