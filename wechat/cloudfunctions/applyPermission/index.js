// cloudfunctions/applyPermission/index.js
// 提交权限申请
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const { nickname, avatar, reason } = event;

  try {
    // 检查是否已经是管理员
    const configRes = await db.collection('admin_config').limit(1).get();
    if (configRes.data.length > 0) {
      const config = configRes.data[0];
      const superAdmins = config.super_admins || config.admins || [];
      const competitionAdmins = config.competition_admins || [];
      
      if (superAdmins.includes(OPENID) || competitionAdmins.includes(OPENID)) {
        return { success: false, error: '您已经是管理员' };
      }
    }

    // 检查是否有待审核的申请
    const pendingRes = await db.collection('permission_requests')
      .where({
        openid: OPENID,
        status: 'pending'
      })
      .limit(1)
      .get();

    if (pendingRes.data.length > 0) {
      return { success: false, error: '您已有待审核的申请，请耐心等待' };
    }

    // 创建新申请
    const result = await db.collection('permission_requests').add({
      data: {
        openid: OPENID,
        nickname: nickname || '未知用户',
        avatar: avatar || '',
        reason: reason || '',
        status: 'pending',
        created_at: db.serverDate(),
        reviewed_at: null,
        reviewed_by: null,
        reject_reason: null
      }
    });

    return {
      success: true,
      message: '申请已提交，请等待审核',
      requestId: result._id
    };
  } catch (err) {
    console.error('applyPermission error:', err);
    return { success: false, error: String(err) };
  }
};
