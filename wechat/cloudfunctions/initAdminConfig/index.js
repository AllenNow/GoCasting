// cloudfunctions/initAdminConfig/index.js
// 一次性运行：初始化管理员配置到数据库
// 运行方式：在云开发控制台测试，传入 { openid: '你的openid' }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();
  const { OPENID } = cloud.getWXContext();

  // 安全起见：只允许通过控制台调用（前端调用时 event.fromConsole 为 undefined）
  // 实际上这个函数只需要跑一次，跑完可以删掉或禁用

  const { openid } = event;
  if (!openid) {
    return { success: false, error: '请传入 openid 参数' };
  }

  try {
    // 检查是否已存在
    const existing = await db.collection('admin_config').limit(1).get();
    if (existing.data.length > 0) {
      // 已存在则追加
      const doc = existing.data[0];
      const admins = doc.admins || [];
      if (admins.includes(openid)) {
        return { success: true, message: '该 openid 已在管理员列表中', admins };
      }
      admins.push(openid);
      await db.collection('admin_config').doc(doc._id).update({
        data: { admins, updated_at: db.serverDate() },
      });
      return { success: true, message: '已添加管理员', admins };
    }

    // 首次创建
    await db.collection('admin_config').add({
      data: {
        admins: [openid],
        created_at: db.serverDate(),
        updated_at: db.serverDate(),
      },
    });
    return { success: true, message: '管理员配置已初始化', admins: [openid] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};
