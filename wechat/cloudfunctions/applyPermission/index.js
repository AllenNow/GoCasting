// cloudfunctions/applyPermission/index.js
// 提交权限申请
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const { nickname, avatar, reason } = event;

  try {
    // 0. 文本内容安全检测（昵称 + 申请理由）
    const textToCheck = [nickname, reason].filter(Boolean).join(' ');
    if (textToCheck.trim()) {
      try {
        const checkRes = await cloud.openapi.security.msgSecCheck({
          content: String(textToCheck).slice(0, 2500),
        });
        if (checkRes.errCode !== 0) {
          return { success: false, error: '昵称或申请理由包含违规信息，请修改后重新提交' };
        }
      } catch (checkErr) {
        if (checkErr.errCode === 87014) {
          return { success: false, error: '昵称或申请理由包含违规信息，请修改后重新提交' };
        }
        // 检测服务异常时放行，记录日志
        console.warn('文本检测服务异常，已放行:', checkErr.message);
      }
    }

    // 检查是否已经是管理员
    let isAdmin = false;
    try {
      const configRes = await db.collection('admin_config').limit(1).get();
      if (configRes.data.length > 0) {
        const config = configRes.data[0];
        const superAdmins = config.super_admins || config.admins || [];
        const competitionAdmins = config.competition_admins || [];
        
        if (superAdmins.includes(OPENID) || competitionAdmins.includes(OPENID)) {
          isAdmin = true;
        }
      }
    } catch (e) {
      // admin_config 不存在，继续处理
    }

    if (isAdmin) {
      return { success: false, error: '您已经是管理员' };
    }

    // 检查是否有待审核的申请
    try {
      const pendingRes = await db.collection('permission_requests')
        .where({
          _openid: OPENID,
          status: 'pending'
        })
        .limit(1)
        .get();

      if (pendingRes.data.length > 0) {
        return { success: false, error: '您已有待审核的申请，请耐心等待' };
      }
    } catch (e) {
      // permission_requests 集合不存在，继续创建申请
      // 注意：如果集合不存在，add 操作会报错
      // 此时需要在云开发控制台手动创建集合
      if (e.errCode === -502005) {
        return { 
          success: false, 
          error: '系统配置中，请联系管理员创建 permission_requests 集合' 
        };
      }
    }

    // 创建新申请
    const result = await db.collection('permission_requests').add({
      data: {
        _openid: OPENID,
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
    // 检查是否是集合不存在的错误
    if (err.errCode === -502005) {
      return { 
        success: false, 
        error: '请先在云开发控制台创建 permission_requests 集合' 
      };
    }
    return { success: false, error: '提交失败，请重试' };
  }
};
