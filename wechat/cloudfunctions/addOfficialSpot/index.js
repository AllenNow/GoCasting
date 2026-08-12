// cloudfunctions/addOfficialSpot/index.js
// 管理员专用：增删改官方钓点
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 从数据库读取管理员列表（不再硬编码）
async function isAdmin(db, openid) {
  try {
    const res = await db.collection('admin_config').limit(1).get();
    if (res.data.length === 0) return false;
    const admins = res.data[0].admins || [];
    return admins.includes(openid);
  } catch (e) {
    return false;
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();

  // 权限校验（从数据库读取）
  if (!(await isAdmin(db, OPENID))) {
    return { success: false, error: '无权限' };
  }
  const { action, data, spotId } = event;

  try {
    // ── 新增钓点 ──
    if (action === 'add') {
      const record = {
        name: data.name,
        description: data.description || '',
        lat: data.lat,
        lon: data.lon,
        terrain: data.terrain || '',           // 地形类型
        methods: data.methods || [],           // 推荐钓法[]
        species: data.species || [],           // 目标鱼种[]
        difficulty: data.difficulty || '',     // 难度
        parking: data.parking || '',           // 停车信息
        cautions: data.cautions || '',         // 注意事项
        cover_image: data.cover_image || '',   // 封面图 cloud://
        images: data.images || [],             // 多图 cloud://[]
        status: 'active',                      // active / hidden
        created_by: OPENID,
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      };
      const res = await db.collection('official_spots').add({ data: record });
      return { success: true, id: res._id };
    }

    // ── 更新钓点 ──
    if (action === 'update') {
      const updateData = { ...data, updated_at: db.serverDate() };
      delete updateData._id;
      await db.collection('official_spots').doc(spotId).update({ data: updateData });
      return { success: true };
    }

    // ── 上下架 ──
    if (action === 'toggleStatus') {
      const spot = await db.collection('official_spots').doc(spotId).get();
      const newStatus = spot.data.status === 'active' ? 'hidden' : 'active';
      await db.collection('official_spots').doc(spotId).update({
        data: { status: newStatus, updated_at: db.serverDate() },
      });
      return { success: true, status: newStatus };
    }

    // ── 删除钓点（软删除）──
    if (action === 'delete') {
      await db.collection('official_spots').doc(spotId).update({
        data: { status: 'deleted', updated_at: db.serverDate() },
      });
      return { success: true };
    }

    // ── 获取列表（管理员视角，含隐藏）──
    if (action === 'list') {
      const res = await db.collection('official_spots')
        .where({ status: db.command.neq('deleted') })
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();
      return { success: true, data: res.data };
    }

    // ── 获取单条 ──
    if (action === 'getOne') {
      const res = await db.collection('official_spots').doc(spotId).get();
      return { success: true, data: res.data };
    }

    return { success: false, error: '未知 action' };
  } catch (err) {
    console.error('addOfficialSpot error:', err);
    return { success: false, error: String(err) };
  }
};
