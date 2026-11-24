const { fail, round2, audit, fetchAll } = require('../lib/util')

const PLATFORMS = ['淘宝', '抖音', '闲鱼', '私域', '线下', '微店']
const PLATFORM_KEYS = {
  淘宝: 'taobao',
  抖音: 'douyin',
  闲鱼: 'xianyu',
  私域: 'private',
  线下: 'offline',
  微店: 'weidian',
}
const VALID_STATUS = ['待发货', '已发货', '已完成']
const TZ_OFFSET = 8 * 60 * 60 * 1000

function normalizePeriod(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || '').trim())
  if (!match) fail(400, '账期格式应为 YYYY-MM')
  const month = Number(match[2])
  if (month < 1 || month > 12) fail(400, '账期月份不合法')
  return `${match[1]}-${match[2]}`
}

function monthRange(period) {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - TZ_OFFSET),
    end: new Date(Date.UTC(year, month, 1) - TZ_OFFSET),
  }
}

function normalizePlatform(value) {
  const platform = String(value || '')
  if (PLATFORMS.indexOf(platform) < 0) fail(400, '平台不合法')
  return platform
}

async function buildSummary(db, platform, period) {
  const _ = db.command
  const range = monthRange(period)
  const orders = await fetchAll(db, 'orders', {
    platform,
    created_at: _.gte(range.start).and(_.lt(range.end)),
  })
  const valid = orders.filter((order) => VALID_STATUS.indexOf(order.status) >= 0)
  const amount = valid.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0)
  return { system_amount: round2(amount), order_count: valid.length }
}

function settlementId(platform, period) {
  return `${PLATFORM_KEYS[platform] || 'other'}_${period.replace('-', '')}`
}

async function ensureCollection(db) {
  try {
    await db.createCollection('settlements')
  } catch (err) {
    // 集合已存在时忽略
  }
}

async function findOne(db, platform, period) {
  try {
    const res = await db.collection('settlements').doc(settlementId(platform, period)).get()
    return res.data
  } catch (err) {
    return null
  }
}

async function list(ctx, payload) {
  await ensureCollection(ctx.db)
  const condition = {}
  if (payload.platform) condition.platform = normalizePlatform(payload.platform)
  if (payload.period) condition.period = normalizePeriod(payload.period)
  let query = ctx.db.collection('settlements')
  if (Object.keys(condition).length) query = query.where(condition)
  const res = await query.limit(100).get()
  const list = res.data.slice().sort((a, b) => {
    if (a.period !== b.period) return String(b.period).localeCompare(String(a.period))
    return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  })
  return { list }
}

async function preview(ctx, payload) {
  const platform = normalizePlatform(payload.platform)
  const period = normalizePeriod(payload.period)
  await ensureCollection(ctx.db)
  const summary = await buildSummary(ctx.db, platform, period)
  const existing = await findOne(ctx.db, platform, period)
  return {
    platform,
    period,
    system_amount: summary.system_amount,
    order_count: summary.order_count,
    existing,
  }
}

async function save(ctx, payload) {
  const db = ctx.db
  await ensureCollection(db)
  const platform = normalizePlatform(payload.platform)
  const period = normalizePeriod(payload.period)

  const rawStatement = payload.statement_amount
  if (rawStatement === undefined || rawStatement === null || String(rawStatement).trim() === '') {
    fail(400, '请填写平台账单金额')
  }
  const parsed = Number(String(rawStatement).replace(/,/g, ''))
  if (!isFinite(parsed)) fail(400, '平台账单金额格式不正确')

  const summary = await buildSummary(db, platform, period)
  const statement = round2(parsed)
  const diff = round2(statement - summary.system_amount)
  const reason = String(payload.reason || '').trim()
  if (Math.abs(diff) >= 0.01 && !reason) fail(400, '存在差异，请填写差异原因')

  const id = settlementId(platform, period)
  const before = await findOne(db, platform, period)
  const now = new Date()
  const data = {
    platform,
    period,
    statement_amount: statement,
    system_amount: summary.system_amount,
    diff,
    reason,
    order_count: summary.order_count,
    note: String(payload.note || '').trim(),
    updated_at: now,
    updated_by: ctx.user ? ctx.user.name : '',
  }

  if (before) {
    await db.collection('settlements').doc(id).update({ data })
  } else {
    data.created_at = now
    data.created_by = ctx.user ? ctx.user.name : ''
    await db.collection('settlements').doc(id).set({ data })
  }

  await audit(db, ctx.user, {
    module: 'settlement',
    action: before ? 'update' : 'create',
    ref_type: 'settlement',
    ref_id: id,
    summary: `平台对账 ${platform} ${period}：账单 ${statement}，系统 ${summary.system_amount}，差异 ${diff}`,
    before: before
      ? {
          statement_amount: before.statement_amount,
          system_amount: before.system_amount,
          diff: before.diff,
          reason: before.reason,
        }
      : null,
    after: { statement_amount: statement, system_amount: summary.system_amount, diff, reason },
  })

  return { id, ...data }
}

module.exports = {
  'settlement.list': { module: 'settlement', action: 'read', handler: list },
  'settlement.preview': { module: 'settlement', action: 'read', handler: preview },
  'settlement.save': { module: 'settlement', action: 'create', handler: save },
}
