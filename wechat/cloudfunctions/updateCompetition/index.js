// 云函数：updateCompetition — 管理员更新榜单数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  // 检查是否管理员
  try {
    const adminRes = await db.collection('admin_config').limit(1).get();
    const admins = adminRes.data[0]?.admins || [];
    if (!admins.includes(OPENID)) {
      return { success: false, error: '无管理员权限' };
    }
  } catch (e) {
    return { success: false, error: '权限检查失败' };
  }

  const { action, competitionId, entry, entryId } = event;

  try {
    if (action === 'addEntry') {
      // 添加记录
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
        photo_url: entry.photo_url || null,
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

    } else if (action === 'updateEntry') {
      // 编辑记录
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
        photo_url: entry.photo_url || null,
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

    } else if (action === 'deleteEntry') {
      // 删除记录
      const res = await db.collection('competitions').doc(competitionId).get();
      let entries = res.data.entries || [];
      
      entries = entries.filter(e => e.id !== entryId);

      await db.collection('competitions').doc(competitionId).update({
        data: { entries, updated_at: db.serverDate() },
      });

      return { success: true, message: '删除成功' };

    } else {
      return { success: false, error: '未知操作' };
    }
  } catch (err) {
    console.error('updateCompetition error:', err);
    return { success: false, error: err.message || String(err) };
  }
};
