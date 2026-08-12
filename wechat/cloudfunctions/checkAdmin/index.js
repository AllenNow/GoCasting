// cloudfunctions/checkAdmin/index.js
// 前端调用：查询当前用户是否为管理员
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  try {
    const res = await db.collection('admin_config').limit(1).get();
    if (res.data.length === 0) {
      return { isAdmin: false, openid: OPENID };
    }
    const admins = res.data[0].admins || [];
    return { isAdmin: admins.includes(OPENID), openid: OPENID };
  } catch (err) {
    console.error('checkAdmin error:', err);
    return { isAdmin: false, openid: OPENID };
  }
};
