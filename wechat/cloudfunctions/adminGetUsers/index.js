// cloudfunctions/adminGetUsers/index.js
// 管理员专用：以服务端权限读取 users 集合（绕过前端权限限制）

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

async function isAdmin(db, openid) {
  try {
    const res = await db.collection('admin_config').limit(1).get();
    if (res.data.length === 0) return false;
    return (res.data[0].admins || []).includes(openid);
  } catch (e) {
    return false;
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 服务端二次验证管理员身份
  if (!(await isAdmin(db, OPENID))) {
    return { success: false, error: '无权限' };
  }

  const { action = 'list', page = 1, pageSize = 50 } = event;

  try {
    if (action === 'count') {
      // 仅返回总数（加 where 避免全表扫描告警）
      const res = await db.collection('users')
        .where({ _openid: db.command.exists(true) })
        .count();
      return { success: true, total: res.total };
    }

    if (action === 'list') {
      const skip = (page - 1) * pageSize;
      // 用 _openid exists 代替 where({}) 空查询，触发索引而非全表扫描
      const query = db.collection('users')
        .where({ _openid: db.command.exists(true) });
      const [listRes, countRes] = await Promise.all([
        query.orderBy('updated_at', 'desc').skip(skip).limit(pageSize).get(),
        query.count(),
      ]);

      return {
        success: true,
        users: listRes.data,
        total: countRes.total,
        page,
        pageSize,
      };
    }

    if (action === 'ban') {
      // 封禁/解封用户
      const { userId, banned } = event;
      await db.collection('users').doc(userId).update({
        data: {
          banned: !!banned,
          banned_at: banned ? db.serverDate() : null,
        },
      });
      return { success: true };
    }

    return { success: false, error: '未知 action' };
  } catch (err) {
    console.error('adminGetUsers error:', err);
    return { success: false, error: String(err) };
  }
};
