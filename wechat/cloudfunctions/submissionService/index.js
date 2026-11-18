const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 获取用户对指定赛事的权限（审核相关接口使用）
async function getPermission(OPENID, compId) {
  const configRes = await db.collection('admin_config').limit(1).get();
  const config = configRes.data[0] || {};
  const superAdmins = config.super_admins || config.admins || [];
  const competitionAdmins = config.competition_admins || [];
  const isSuperAdmin = superAdmins.includes(OPENID);
  const isCompetitionAdmin = competitionAdmins.includes(OPENID);

  if (!compId) {
    return {
      isSuperAdmin,
      isCompetitionAdmin,
      canCreate: isSuperAdmin || isCompetitionAdmin,
      canEdit: false,
      canDelete: false,
      canAssign: false
    };
  }

  const compRes = await db.collection('competitions').doc(compId).get();
  const comp = compRes.data;
  const isCreator = comp.created_by === OPENID;
  const isAssignedAdmin = (comp.admins || []).includes(OPENID);

  return {
    isSuperAdmin,
    isCompetitionAdmin,
    isCreator,
    isAssignedAdmin,
    canEdit: isSuperAdmin || isCreator || isAssignedAdmin,
    canDelete: isSuperAdmin || isCreator,
    canAssign: isSuperAdmin || isCreator,
    competition: comp
  };
}

// 提交记录服务：历史上报记录查询与管理员审核
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action, competitionId } = event;

  try {
    // 普通用户上报已关闭，榜单仅由管理员维护。
    if (action === 'submitEntry') {
      return { success: false, error: '用户上报已关闭，请联系管理员录入' };
    }

    // ===== 管理员：获取待审核列表 =====
    if (action === 'getPendingEntries') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) return { success: false, error: '无权限审核' };
      const res = await db.collection('pending_entries')
        .where({ competition_id: competitionId })
        .orderBy('submitted_at', 'desc')
        .limit(50)
        .get();
      return { success: true, list: res.data };
    }

    // ===== 管理员：审核上报记录 =====
    if (action === 'reviewEntry') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) return { success: false, error: '无权限审核' };
      const { pendingId, approved, reason } = event;
      if (!pendingId) return { success: false, error: '缺少记录ID' };
      const pendingRes = await db.collection('pending_entries').doc(pendingId).get();
      const pending = pendingRes.data;
      if (!pending) return { success: false, error: '记录不存在' };

      if (approved) {
        const compRes = await db.collection('competitions').doc(competitionId).get();
        const entries = compRes.data.entries || [];
        entries.push({
          id: Date.now().toString(),
          ...pending.entry,
          created_by: pending.submitted_by,
          created_at: pending.submitted_at,
        });
        entries.sort((a, b) => {
          const lenA = a.length_cm || 0;
          const lenB = b.length_cm || 0;
          if (lenB !== lenA) return lenB - lenA;
          return (b.total_weight_g || 0) - (a.total_weight_g || 0);
        });
        await db.collection('competitions').doc(competitionId).update({
          data: { entries, updated_at: db.serverDate() },
        });
        await db.collection('pending_entries').doc(pendingId).remove();
        return { success: true, message: '审核通过，已加入榜单' };
      } else {
        await db.collection('pending_entries').doc(pendingId).update({
          data: {
            status: 'rejected',
            rejection_reason: reason || '不符合要求',
            reviewed_by: OPENID,
            reviewed_at: new Date(),
            updated_at: new Date(),
          }
        });
        return { success: true, message: '已拒绝' };
      }
    }

    // ===== 用户：查看自己的上报记录 =====
    if (action === 'getMySubmissions') {
      const res = await db.collection('pending_entries')
        .where({ submitted_by: OPENID })
        .orderBy('submitted_at', 'desc')
        .limit(50)
        .get();
      return { success: true, list: res.data };
    }

    // 普通用户不能删除上报记录，历史数据由管理员处理。
    if (action === 'deleteSubmission') {
      return { success: false, error: '无权操作，请联系管理员处理' };
    }

    return { success: false, error: '未知操作' };
  } catch (err) {
    console.error('submissionService error:', err);
    return { success: false, error: err.message || String(err) };
  }
};
