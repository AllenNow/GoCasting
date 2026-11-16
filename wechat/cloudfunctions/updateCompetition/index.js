// 云函数：updateCompetition — 赛事和榜单管理（带权限控制）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 获取用户对指定赛事的权限
async function getPermission(OPENID, compId) {
  // 检查是否超级管理员
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

  // 获取比赛信息
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

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action, competitionId, entry, entryId, competition, targetOpenid } = event;

  try {
    // ===== 创建比赛 =====
    if (action === 'create') {
      const perm = await getPermission(OPENID, null);
      if (!perm.canCreate) {
        return { success: false, error: '无权限创建赛事' };
      }

      const result = await db.collection('competitions').add({
        data: {
          ...competition,
          created_by: OPENID,
          admins: [],
          entries: [],
          created_at: db.serverDate(),
          updated_at: db.serverDate(),
        }
      });
      return { success: true, id: result._id };
    }

    // ===== 更新比赛信息 =====
    if (action === 'update') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) {
        return { success: false, error: '无权限编辑此赛事' };
      }

      await db.collection('competitions').doc(competitionId).update({
        data: {
          name: competition.name,
          date: competition.date,
          location: competition.location,
          description: competition.description,
          status: competition.status,
          updated_at: db.serverDate(),
        }
      });
      return { success: true };
    }

    // ===== 删除比赛 =====
    if (action === 'delete') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canDelete) {
        return { success: false, error: '无权限删除此赛事，只有创建者或超级管理员可以删除' };
      }

      await db.collection('competitions').doc(competitionId).remove();
      return { success: true };
    }

    // ===== 添加榜单记录 =====
    if (action === 'addEntry') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) {
        return { success: false, error: '无权限管理此赛事榜单' };
      }

      const res = await db.collection('competitions').doc(competitionId).get();
      const entries = res.data.entries || [];
      
      entries.push({
        id: Date.now().toString(),
        player_name: entry.player_name || '',
        best_species: entry.best_species || '',
        length_cm: entry.length_cm || null,
        total_weight_g: entry.total_weight_g || null,
        spot: entry.spot || '',
        fish_count: 1,
        note: entry.note || '',
        photo_url: entry.catch_photo_url || entry.photo_url || null,
        catch_photo_url: entry.catch_photo_url || null,
        spot_photo1_url: entry.spot_photo1_url || null,
        spot_photo2_url: entry.spot_photo2_url || null,
        catch_date: entry.catch_date || null,
        catch_time: entry.catch_time || null,
        tide_direction: entry.tide_direction || null,
        tide_score: entry.tide_score || null,
        tide_type: entry.tide_type || null,
        spot_lat: entry.spot_lat || null,
        spot_lon: entry.spot_lon || null,
        created_by: OPENID,
        created_at: new Date(),
      });

      // 排序：长度优先，长度相同按重量
      entries.sort((a, b) => {
        const lenA = a.length_cm || 0;
        const lenB = b.length_cm || 0;
        if (lenB !== lenA) return lenB - lenA;
        return (b.total_weight_g || 0) - (a.total_weight_g || 0);
      });

      await db.collection('competitions').doc(competitionId).update({
        data: { entries, updated_at: db.serverDate() },
      });

      return { success: true, message: '添加成功' };
    }

    // ===== 更新榜单记录 =====
    if (action === 'updateEntry') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) {
        return { success: false, error: '无权限管理此赛事榜单' };
      }

      const res = await db.collection('competitions').doc(competitionId).get();
      const entries = res.data.entries || [];
      
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1) {
        return { success: false, error: '记录不存在' };
      }

      entries[idx] = {
        ...entries[idx],
        player_name: entry.player_name || '',
        best_species: entry.best_species || '',
        length_cm: entry.length_cm || null,
        total_weight_g: entry.total_weight_g || null,
        spot: entry.spot || '',
        note: entry.note || '',
        photo_url: entry.catch_photo_url || entry.photo_url || null,
        catch_photo_url: entry.catch_photo_url || null,
        spot_photo1_url: entry.spot_photo1_url || null,
        spot_photo2_url: entry.spot_photo2_url || null,
        catch_date: entry.catch_date || null,
        catch_time: entry.catch_time || null,
        tide_direction: entry.tide_direction || null,
        tide_score: entry.tide_score || null,
        tide_type: entry.tide_type || null,
        spot_lat: entry.spot_lat || null,
        spot_lon: entry.spot_lon || null,
        updated_by: OPENID,
        updated_at: new Date(),
      };

      // 重新排序
      entries.sort((a, b) => {
        const lenA = a.length_cm || 0;
        const lenB = b.length_cm || 0;
        if (lenB !== lenA) return lenB - lenA;
        return (b.total_weight_g || 0) - (a.total_weight_g || 0);
      });

      await db.collection('competitions').doc(competitionId).update({
        data: { entries, updated_at: db.serverDate() },
      });

      return { success: true, message: '更新成功' };
    }

    // ===== 删除榜单记录（软删除，标记 deleted）=====
    if (action === 'deleteEntry') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) {
        return { success: false, error: '无权限管理此赛事榜单' };
      }

      const res = await db.collection('competitions').doc(competitionId).get();
      let entries = res.data.entries || [];
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1) return { success: false, error: '记录不存在' };

      // 软删除：标记 deleted，不真正移除
      entries[idx] = {
        ...entries[idx],
        deleted: true,
        deleted_at: new Date(),
        deleted_by: OPENID,
      };

      await db.collection('competitions').doc(competitionId).update({
        data: { entries, updated_at: db.serverDate() },
      });

      return { success: true, message: '已删除' };
    }

    // ===== 恢复已删除的榜单记录 =====
    if (action === 'restoreEntry') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canEdit) {
        return { success: false, error: '无权限管理此赛事榜单' };
      }

      const res = await db.collection('competitions').doc(competitionId).get();
      let entries = res.data.entries || [];
      const idx = entries.findIndex(e => e.id === entryId);
      if (idx === -1) return { success: false, error: '记录不存在' };

      // 恢复：移除 deleted 标记
      const restored = { ...entries[idx] };
      delete restored.deleted;
      delete restored.deleted_at;
      delete restored.deleted_by;
      entries[idx] = restored;

      await db.collection('competitions').doc(competitionId).update({
        data: { entries, updated_at: db.serverDate() },
      });

      return { success: true, message: '已恢复' };
    }

    // ===== 分配赛事管理权限 =====
    if (action === 'assignAdmin') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canAssign) {
        return { success: false, error: '无权限分配此赛事的管理权限' };
      }

      if (!targetOpenid) {
        return { success: false, error: '请指定要授权的用户' };
      }

      const comp = perm.competition;
      const admins = comp.admins || [];
      
      if (admins.includes(targetOpenid)) {
        return { success: false, error: '该用户已有此赛事的管理权限' };
      }

      admins.push(targetOpenid);

      await db.collection('competitions').doc(competitionId).update({
        data: { admins, updated_at: db.serverDate() }
      });
      return { success: true, message: '已授权' };
    }

    // ===== 移除赛事管理权限 =====
    if (action === 'removeAdmin') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canAssign) {
        return { success: false, error: '无权限管理此赛事的权限分配' };
      }

      if (!targetOpenid) {
        return { success: false, error: '请指定要移除的用户' };
      }

      const comp = perm.competition;
      const admins = (comp.admins || []).filter(id => id !== targetOpenid);

      await db.collection('competitions').doc(competitionId).update({
        data: { admins, updated_at: db.serverDate() }
      });
      return { success: true, message: '已移除权限' };
    }

    // ===== 获取赛事管理员列表 =====
    if (action === 'getAdmins') {
      const perm = await getPermission(OPENID, competitionId);
      if (!perm.canAssign && !perm.canEdit) {
        return { success: false, error: '无权限查看' };
      }

      const comp = perm.competition;
      
      // 获取用户备注
      const configRes = await db.collection('admin_config').limit(1).get();
      const userNotes = configRes.data[0]?.user_notes || {};

      const adminList = (comp.admins || []).map(openid => ({
        openid,
        note: userNotes[openid] || '未知用户'
      }));

      return { 
        success: true, 
        createdBy: comp.created_by,
        creatorNote: userNotes[comp.created_by] || '创建者',
        admins: adminList,
        canAssign: perm.canAssign
      };
    }

    // ===== 检查当前用户对赛事的权限 =====
    if (action === 'checkPermission') {
      const perm = await getPermission(OPENID, competitionId);
      return {
        success: true,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
        canAssign: perm.canAssign,
        isCreator: perm.isCreator,
        isAssignedAdmin: perm.isAssignedAdmin,
        isSuperAdmin: perm.isSuperAdmin
      };
    }

    // 注：用户上报/审核相关接口（submitEntry、getPendingEntries、reviewEntry、
    // getMySubmissions、deleteSubmission）已迁移至独立的 submissionService 云函数。

    return { success: false, error: '未知操作' };
  } catch (err) {
    console.error('updateCompetition error:', err);
    return { success: false, error: err.message || String(err) };
  }
};
