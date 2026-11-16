// cloudfunctions/migrateAdminConfig/index.js
// 一次性迁移：将旧的 admins 字段升级为 super_admins
// 在云开发控制台运行一次即可
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const db = cloud.database();

  try {
    const configRes = await db.collection('admin_config').limit(1).get();
    
    if (configRes.data.length === 0) {
      return { success: false, error: 'admin_config 不存在' };
    }

    const config = configRes.data[0];
    
    // 检查是否已经迁移过
    if (config.super_admins && config.super_admins.length > 0) {
      return { 
        success: true, 
        message: '已经是新格式，无需迁移',
        config 
      };
    }

    // 迁移：将 admins 重命名为 super_admins
    const admins = config.admins || [];
    
    await db.collection('admin_config').doc(config._id).update({
      data: {
        super_admins: admins,
        competition_admins: [],
        user_notes: {},
        updated_at: db.serverDate()
      }
    });

    return { 
      success: true, 
      message: '迁移完成',
      super_admins: admins
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
};
