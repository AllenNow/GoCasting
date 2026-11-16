// cloudfunctions/reviewPermission/index.js
// 审核权限申请（仅超级管理员）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const { requestId, action, rejectReason } = event;
  // action: 'approve' | 'reject'

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

    // 获取申请记录
    const requestRes = await db.collection('permission_requests').doc(requestId).get();
    if (!requestRes.data) {
      return { success: false, error: '申请记录不存在' };
    }

    const request = requestRes.data;
    if (request.status !== 'pending') {
      return { success: false, error: '该申请已被处理' };
    }

    if (action === 'approve') {
      // 通过申请：添加到 competition_admins
      const competitionAdmins = config.competition_admins || [];
      if (!competitionAdmins.includes(request.openid)) {
        competitionAdmins.push(request.openid);
      }

      // 更新 admin_config
      const userNotes = config.user_notes || {};
      userNotes[request.openid] = request.nickname;

      await db.collection('admin_config').doc(config._id).update({
        data: {
          competition_admins: competitionAdmins,
          user_notes: userNotes,
          updated_at: db.serverDate()
        }
      });

      // 更新申请状态
      await db.collection('permission_requests').doc(requestId).update({
        data: {
          status: 'approved',
          reviewed_at: db.serverDate(),
          reviewed_by: OPENID
        }
      });

      return { success: true, message: '已通过申请' };

    } else if (action === 'reject') {
      // 拒绝申请
      await db.collection('permission_requests').doc(requestId).update({
        data: {
          status: 'rejected',
          reviewed_at: db.serverDate(),
          reviewed_by: OPENID,
          reject_reason: rejectReason || ''
        }
      });

      return { success: true, message: '已拒绝申请' };

    } else {
      return { success: false, error: '无效的操作' };
    }
  } catch (err) {
    console.error('reviewPermission error:', err);
    return { success: false, error: String(err) };
  }
};
