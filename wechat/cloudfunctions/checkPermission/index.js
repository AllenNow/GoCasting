// cloudfunctions/checkPermission/index.js
// 检查用户角色和权限
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  try {
    // 获取权限配置
    const configRes = await db.collection('admin_config').limit(1).get();
    
    let role = 'viewer';
    let permissions = {
      canCreateCompetition: false,
      canEditCompetition: false,
      canManageLeaderboard: false,
      canReviewApplication: false,
      canManageAdmin: false
    };

    if (configRes.data.length > 0) {
      const config = configRes.data[0];
      const superAdmins = config.super_admins || config.admins || [];
      const competitionAdmins = config.competition_admins || [];

      if (superAdmins.includes(OPENID)) {
        role = 'super_admin';
        permissions = {
          canCreateCompetition: true,
          canEditCompetition: true,
          canManageLeaderboard: true,
          canReviewApplication: true,
          canManageAdmin: true
        };
      } else if (competitionAdmins.includes(OPENID)) {
        role = 'competition_admin';
        permissions = {
          canCreateCompetition: true,
          canEditCompetition: true,
          canManageLeaderboard: true,
          canReviewApplication: false,
          canManageAdmin: false
        };
      }
    }

    // 获取用户的申请状态
    let applicationStatus = null;
    if (role === 'viewer') {
      const appRes = await db.collection('permission_requests')
        .where({ openid: OPENID })
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();
      
      if (appRes.data.length > 0) {
        applicationStatus = appRes.data[0].status;
      }
    }

    // 获取待审核数量（仅超级管理员需要）
    let pendingCount = 0;
    if (role === 'super_admin') {
      const countRes = await db.collection('permission_requests')
        .where({ status: 'pending' })
        .count();
      pendingCount = countRes.total;
    }

    return {
      success: true,
      openid: OPENID,
      role,
      permissions,
      applicationStatus,
      pendingCount,
      // 兼容旧版 checkAdmin
      isAdmin: role !== 'viewer'
    };
  } catch (err) {
    console.error('checkPermission error:', err);
    return {
      success: false,
      error: String(err),
      openid: OPENID,
      role: 'viewer',
      permissions: {
        canCreateCompetition: false,
        canEditCompetition: false,
        canManageLeaderboard: false,
        canReviewApplication: false,
        canManageAdmin: false
      },
      isAdmin: false
    };
  }
};
