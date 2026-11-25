const TZ_OFFSET = 8 * 60 * 60 * 1000

const COLLECTIONS = [
  'users',
  'products',
  'suppliers',
  'warehouses',
  'inventory',
  'inventory_txns',
  'stocktakes',
  'repairs',
  'trade_ins',
  'dismantles',
  'boms',
  'purchase_orders',
  'orders',
  'after_sales',
  'expenses',
  'audit_logs',
  'settlements',
  'cash_accounts',
  'cash_txns',
  'counters',
]

function fail(code, message) {
  const err = new Error(message)
  err.code = code
  throw err
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function pick(obj, keys) {
  const out = {}
  keys.forEach((key) => {
    if (obj[key] !== undefined) out[key] = obj[key]
  })
  return out
}

function startOfDay(date = new Date(), daysAgo = 0) {
  const shifted = new Date(date.getTime() + TZ_OFFSET)
  shifted.setUTCHours(0, 0, 0, 0)
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo)
  return new Date(shifted.getTime() - TZ_OFFSET)
}

function startOfMonth(date = new Date()) {
  const shifted = new Date(date.getTime() + TZ_OFFSET)
  shifted.setUTCDate(1)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - TZ_OFFSET)
}

function dayKey(date = new Date()) {
  const shifted = new Date(date.getTime() + TZ_OFFSET)
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const d = String(shifted.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

function dayLabel(date = new Date()) {
  const key = dayKey(date)
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`
}

function escapeReg(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function fetchAll(db, name, where, max = 2000) {
  const out = []
  for (let skip = 0; skip < max; skip += 100) {
    let query = db.collection(name)
    if (where && Object.keys(where).length) query = query.where(where)
    const res = await query.skip(skip).limit(100).get()
    out.push.apply(out, res.data)
    if (res.data.length < 100) break
  }
  return out
}

function timeValue(value) {
  if (value instanceof Date) return value.getTime()
  const t = new Date(value || 0).getTime()
  return isNaN(t) ? 0 : t
}

/**
 * where + orderBy 查询：缺少复合索引时退化为内存排序，避免云端直接报索引缺失。
 */
async function querySorted(db, name, where, options) {
  const opts = options || {}
  const field = opts.field || 'created_at'
  const desc = opts.desc !== false
  const limit = opts.limit || 100
  const skip = opts.skip || 0
  const hasWhere = where && Object.keys(where).length > 0

  try {
    let request = db.collection(name)
    if (hasWhere) request = request.where(where)
    const res = await request.orderBy(field, desc ? 'desc' : 'asc').skip(skip).limit(limit).get()
    return res.data
  } catch (err) {
    const list = await fetchAll(db, name, hasWhere ? where : null, Math.max(skip + limit, 500))
    list.sort((a, b) => {
      const diff = timeValue(a[field]) - timeValue(b[field])
      return desc ? -diff : diff
    })
    return list.slice(skip, skip + limit)
  }
}

async function getDoc(db, name, id) {
  if (!id) fail(400, '缺少记录 ID')
  try {
    const res = await db.collection(name).doc(id).get()
    return res.data
  } catch (err) {
    fail(404, '记录不存在或已被删除')
  }
}

async function safeCount(db, name) {
  try {
    const res = await db.collection(name).count()
    return res.total
  } catch (err) {
    return 0
  }
}

async function ensureCollections(db) {
  const results = await Promise.all(
    COLLECTIONS.map(async (name) => {
      try {
        await db.createCollection(name)
        return `${name}: created`
      } catch (err) {
        return `${name}: exists`
      }
    })
  )
  return results
}

async function nextNo(db, prefix) {
  const _ = db.command
  const id = `${prefix}_${dayKey()}`
  let updated = 0
  try {
    const res = await db.collection('counters').doc(id).update({ data: { seq: _.inc(1) } })
    updated = res.stats ? res.stats.updated : 0
  } catch (err) {
    updated = 0
  }
  if (!updated) {
    try {
      await db.collection('counters').add({ data: { _id: id, seq: 1 } })
    } catch (err) {
      await db.collection('counters').doc(id).update({ data: { seq: _.inc(1) } })
    }
  }
  const doc = await db.collection('counters').doc(id).get()
  const seq = doc.data.seq || 1
  return `${prefix}${dayKey()}-${String(seq).padStart(3, '0')}`
}

async function audit(db, user, payload) {
  try {
    await db.collection('audit_logs').add({
      data: {
        module: payload.module || '',
        action: payload.action || '',
        ref_type: payload.ref_type || '',
        ref_id: payload.ref_id || '',
        summary: payload.summary || '',
        before: payload.before || null,
        after: payload.after || null,
        operator_openid: user ? user.openid : '',
        operator_name: user ? user.name : 'system',
        created_at: new Date(),
      },
    })
  } catch (err) {
    console.error('audit log failed:', err)
  }
}

module.exports = {
  COLLECTIONS,
  fail,
  round2,
  round4,
  pick,
  startOfDay,
  startOfMonth,
  dayKey,
  dayLabel,
  escapeReg,
  fetchAll,
  querySorted,
  safeCount,
  getDoc,
  ensureCollections,
  nextNo,
  audit,
}
