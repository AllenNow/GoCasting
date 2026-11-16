// cloudfunctions/manageAdmin/index.js
// 管理管理员（仅超级管理员）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const { action, targetOpenid, note } = event;
  // action: 'remove' | 'updateNote' | 'getList' | 'getPendingRequests'

  try {
    // 验证操作者是超级管理员
    const configRes = await db.collection('admin_config').limit(1).get();
    if (configRes.data.length === 0) {
      return { success: false, error: '权限配置不存在' };
    }

    const config = configRes.data[0];
    const superAdmins = config.super_admins || config.admins || [];
    
    if (!superAdmins.includes(OPENID)) {
      return { success: false, error: '无权限执行此操作' };
    }

    if (action === 'getList') {
      // 获取管理员列表
      const competitionAdmins = config.competition_admins || [];
      const userNotes = config.user_notes || {};

      const adminList = competitionAdmins.map(openid => ({
        openid,
        note: userNotes[openid] || '未备注'
      }));

      return {
        success: true,
        superAdmins: superAdmins.map(openid => ({
          openid,
          note: userNotes[openid] || '超级管理员'
        })),
        competitionAdmins: adminList
      };

    } else if (action === 'getPendingRequests') {
      // 获取待审核申请列表
      const requestsRes = await db.collection('permission_requests')
        .where({ status: 'pending' })
        .orderBy('created_at', 'asc')
        .limit(50)
        .get();

      return {
        success: true,
        requests: requestsRes.data
      };

    } else if (action === 'remove') {
      // 移除管理员
      if (!targetOpenid) {
        return { success: false, error: '请指定要移除的管理员' };
      }

      // 不能移除超级管理员
      if (superAdmins.includes(targetOpenid)) {
        return { success: false, error: '不能移除超级管理员' };
      }

      let competitionAdmins = config.competition_admins || [];
      competitionAdmins = competitionAdmins.filter(id => id !== targetOpenid);

      await db.collection('admin_config').doc(config._id).update({
        data: {
          competition_admins: competitionAdmins,
          updated_at: db.serverDate()
        }
      });

      return { success: true, message: '已移除管理员' };

    } else if (action === 'updateNote') {
      // 更新备注
      if (!targetOpenid) {
        return { success: false, error: '请指定管理员' };
      }

      const userNotes = config.user_notes || {};
      userNotes[targetOpenid] = note || '';

      await db.collection('admin_config').doc(config._id).update({
        data: {
          user_notes: userNotes,
          updated_at: db.serverDate()
        }
      });

      return { success: true, message: '备注已更新' };

    } else {
      return { success: false, error: '无效的操作' };
    }
  } catch (err) {
    console.error('manageAdmin error:', err);
    return { success: false, error: String(err) };
  }
};
