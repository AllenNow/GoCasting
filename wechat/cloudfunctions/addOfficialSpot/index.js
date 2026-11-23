// cloudfunctions/addOfficialSpot/index.js
// 精选钓点维护 + 纠错反馈
// action: add | update | delete | report
// 说明：
// - add / update / delete 仅管理员可用（读取 admin_config）
// - report 任何登录用户都可提交，写入 spot_reports 供管理员核实
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const WATER_TYPES = ['矶钓', '滩钓', '堤坝', '船钓', '其他'];
const DANGER_LEVELS = ['低', '中', '高'];

// 是否为管理员（超管 / 榜单管理员）
async function isAdmin(db, openid) {
  if (!openid) return false;
  try {
    const res = await db.collection('admin_config').limit(1).get();
    if (!res.data.length) return false;
    const cfg = res.data[0];
    const supers = cfg.super_admins || cfg.admins || [];
    const comps = cfg.competition_admins || [];
    return supers.indexOf(openid) !== -1 || comps.indexOf(openid) !== -1;
  } catch (e) {
    console.warn('读取 admin_config 失败:', e.message);
    return false;
  }
}

// 文本内容安全检测（失败即拒绝，避免违规内容入库）
async function checkText(text) {
  if (!text || !String(text).trim()) return { safe: true, checked: true };
  try {
    const r = await cloud.openapi.security.msgSecCheck({
      content: String(text).slice(0, 2500),
    });
    if (r.errCode === 0) return { safe: true, checked: true };
    if (r.errCode === 87014) return { safe: false, checked: true, msg: '内容包含违规信息' };
    return { safe: false, checked: false, msg: '内容安全检测暂不可用，请稍后重试' };
  } catch (err) {
    if (err.errCode === 87014) return { safe: false, checked: true, msg: '内容包含违规信息' };
    console.error('文本检测失败:', err.message || err);
    return { safe: false, checked: false, msg: '内容安全检测暂不可用，请稍后重试' };
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const action = event.action || 'add';

  // ── 纠错反馈：所有用户可提交 ──────────────────────────
  if (action === 'report') {
    const spotId = String(event.spotId || '').trim();
    if (!spotId) return { success: false, error: '缺少钓点标识' };
    const reason = String(event.reason || '').slice(0, 50);
    const detail = String(event.detail || '').slice(0, 200);
    const chk = await checkText([reason, detail].filter(Boolean).join(' '));
    if (!chk.safe) return { success: false, error: chk.msg };

    try {
      await db.collection('spot_reports').add({
        data: {
          spot_id: spotId,
          reason,
          detail,
          reporter_openid: OPENID || null,
          status: 'pending',
          created_at: db.serverDate(),
        },
      });
      return { success: true };
    } catch (e) {
      console.error('写入纠错失败:', e.message || e);
      return { success: false, error: '提交失败，请稍后重试' };
    }
  }

  // ── 其余操作仅管理员 ──────────────────────────────────
  const admin = await isAdmin(db, OPENID);
  if (!admin) {
    return { success: false, code: 'NO_PERMISSION', error: '仅管理员可维护精选钓点' };
  }

  if (action === 'add' || action === 'update') {
    const d = event.data || {};
    const name = String(d.name || '').trim();
    if (!name) return { success: false, error: '钓点名称不能为空' };
    if (name.length > 30) return { success: false, error: '钓点名称过长' };

    const lat = Number(d.lat);
    const lon = Number(d.lon);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return { success: false, error: '坐标无效' };
    }
    // 精选钓点不允许录入禁渔区 / 保护区
    if (d.protectedArea) {
      return { success: false, error: '禁渔区 / 保护区不可作为精选钓点' };
    }

    const waterType = WATER_TYPES.indexOf(d.water_type || d.waterType) !== -1
      ? (d.water_type || d.waterType) : '其他';
    const dangerLevel = DANGER_LEVELS.indexOf(d.danger_level || d.dangerLevel) !== -1
      ? (d.danger_level || d.dangerLevel) : '中';
    const description = String(d.description || '').trim().slice(0, 200);
    const targetFish = String(d.target_fish || d.targetFish || '').trim().slice(0, 50);
    const safetyTip = String(d.safety_tip || d.safetyTip || '').trim().slice(0, 100);
    const region = String(d.region || '').trim().slice(0, 50);

    const chk = await checkText([name, description, targetFish, safetyTip, region]
      .filter(Boolean).join(' '));
    if (!chk.safe) return { success: false, error: chk.msg };

    const payload = {
      name,
      description,
      lat,
      lon,
      region,
      water_type: waterType,
      protected_area: false,
      danger_level: dangerLevel,
      target_fish: targetFish,
      safety_tip: safetyTip,
      source: '管理员整理，仅供参考',
      verified_at: db.serverDate(),
      updated_at: db.serverDate(),
      updated_by: OPENID,
      status: 'active',
    };

    try {
      if (action === 'update') {
        const spotId = String(event.spotId || '').trim();
        if (!spotId) return { success: false, error: '缺少钓点标识' };
        await db.collection('official_spots').doc(spotId).update({ data: payload });
        return { success: true, spotId };
      }
      payload.created_at = db.serverDate();
      payload.created_by = OPENID;
      const r = await db.collection('official_spots').add({ data: payload });
      return { success: true, spotId: r._id };
    } catch (e) {
      console.error('保存精选钓点失败:', e.message || e);
      return { success: false, error: '保存失败：' + (e.message || '未知错误') };
    }
  }

  if (action === 'delete') {
    const spotId = String(event.spotId || '').trim();
    if (!spotId) return { success: false, error: '缺少钓点标识' };
    try {
      // 软删除，保留纠错与追溯记录
      await db.collection('official_spots').doc(spotId).update({
        data: {
          status: 'deleted',
          deleted_at: db.serverDate(),
          deleted_by: OPENID,
        },
      });
      return { success: true };
    } catch (e) {
      console.error('删除精选钓点失败:', e.message || e);
      return { success: false, error: '删除失败，请稍后重试' };
    }
  }

  return { success: false, error: '未知操作' };
};
