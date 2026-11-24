async function getUser(db, openid) {
  try {
    const res = await db.collection('users').where({ openid }).limit(1).get()
    return res.data[0] || null
  } catch (err) {
    return null
  }
}

module.exports = { getUser }
