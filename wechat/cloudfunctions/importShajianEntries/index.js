// 云函数：importShajianEntries — 一次性导入「福建2026沙尖之王杯争霸赛」榜单数据
// 用法：在云开发控制台测试该函数，event 可选：
//   { competitionId: 'xxx' } 指定赛事；不传则按名称包含「沙尖之王」自动匹配
//   { reset: true } 先清空该赛事已有 records 再导入（默认追加并去重）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 原始数据：昵称|长度(cm)|钓获日期|钓点
const RAW = [
  'J|23|2026-04-04|崇武赤湖沙滩',
  'W.an.G 💸|23|2026-04-05|漳州月光沙滩',
  '阿凡-厦门思明|23|2026-04-12|厦门椰风寨',
  'ᥫᩣ ღ᭄🍀半颗糖🍊࿐-泉州晋江|24|2026-04-05|惠安惠女湾沙滩',
  'Wesley_厦门海里|23|2026-04-04|漳州月光沙滩',
  '程暮焜-厦门湖外|25|2026-04-04|平潭丰田码头',
  '锋-厦门思明|23|2026-04-04|古雷',
  '尊敬的泡水蓝棍竿主楚昕--厦门湖里|23|2026-04-09|漳州月光沙滩',
  '诗安 珊|22|2026-04-09|漳州火山岛沙滩',
  '荻花洲电工-皮革|23|2026-04-09|厦门翔安荻花洲',
  'ᴵ ᴬᴹ🇽🇭🇧|22|2026-04-09|厦门121沙滩',
  '进龙-厦门集美|24|2026-04-09|泉州围头金沙湾沙滩',
  '小飞侠|26|2026-04-11|厦门五缘湾',
  '㣻罖．厦门湖里|23|2026-04-11|厦门121沙滩',
  '大钧-厦门翔安|22.5|2026-04-11|漳州七星海沙滩',
  '清心 丸 漳浦|25|2026-04-12|漳州古雷',
  '弹塗鱼~漳州龙文区|21|2026-04-12|漳州火山岛沙滩',
  '小骥-空军码头|24|2026-04-12|厦门玩月坡沙滩',
  'Mr.咖-平潭|26|2026-04-13|福州平潭潭角底码头',
  '🦢|24|2026-04-19|泉州石狮红塔湾沙滩',
  '晨钓沙手-柳-厦门湖里|23.5|2026-04-13|厦门椰风寨沙滩',
  '好赵头|22|2026-04-14|厦门121沙滩',
  '一氧化二氢——厦门湖里区|21|2026-04-15|厦门121沙滩',
  '大神亮-思明|25|2026-04-15|厦门121沙滩',
  'W ヾε🐾-厦门|22.5|2026-04-17|泉州惠安惠女湾沙滩',
  'Mr.咖-平潭|29|2026-04-17|福州平潭澳前镇金仔山',
  '七七-厦门思明|23|2026-04-18|东山澳角沙滩',
  '小三劫 泉州鲤城|25|2026-05-02|泉州惠安月亮湾',
  '厦门-阿勇|22.5|2026-04-26|厦门五缘湾',
  '稳稳-厦门湖里|22|2026-05-01|厦门五缘湾',
  'Q（泉州）|24.5|2026-05-01|泉州惠女湾沙滩',
  '大钧托辅教育中心|28|2026-05-01|泉州惠女湾沙滩',
  '七七-厦门思明|27|2026-05-02|泉州净峰惠女湾沙滩',
  '木·|21|2026-05-02|漳州乌鼻头沙滩',
  '豪 集美|21|2026-05-03|厦门黄厝沙滩',
  '毓澤|22.5|2026-05-09|漳州月光沙滩',
  '平潭钓不到鱼主理人|26.5|2026-05-10|福州平潭白青',
  '经，厦门湖里|21.5|2026-05-17|漳州白塘湾',
  'Mortal-漳州龙文|22.5|2026-05-28|漳州第一滩',
  '小阳|27|2026-05-30|漳州白坑',
  '木·|24|2026-05-31|泉州围头金沙湾',
  '阿州不会远投|21|2026-05-31|厦门五缘湾',
  '雷绍平-宁德霞浦|27|2026-06-03|宁德丹湾村沙滩',
  '🥟晋江-金井|22.5|2026-06-06|泉州围头金沙湾',
  '老高远投-筼筜湖|21|2026-06-06|厦门西堤',
  '王春-晋江|29|2026-06-08|泉州触角沙滩',
  '陈|21|2026-06-08|泉州衙口沙滩',
  '泉-东山岛|24|2026-06-21|漳州东山 金鸾湾沙滩',
  'pla-厦门思明|24|2026-06-30|漳州东山 金鸾湾沙滩',
  '平潭钓不到鱼主理人|25|2026-07-01|平潭烂尾楼',
  '杨主，泉州|30|2026-07-05|崇武西沙湾',
  '陈|25.5|2026-07-15|泉州石狮观音山',
  '小钓手🎣Jason-厦门老妈|21|2026-07-24|厦门121沙滩',
  '阿利奥|20|2026-08-18|泉州惠安惠女湾沙滩',
  '晋江磁灶-彭于晏|22|2026-08-18|泉州惠安惠女湾沙滩',
  '五缘先锋阿Z-厦门湖里|23|2026-08-22|厦门121沙滩',
  '颖秋—厦门思明|23|2026-09-19|厦门121沙滩',
  '杨主，泉州|25.5|2026-09-20|泉州龟山湾沙滩',
  '海风无期-平潭|23|2026-09-20|福州平潭交通码头',
  '厦门-pla|22|2026-09-23|厦门121沙滩',
  '纪杰-龙海|21|2026-10-10|东山澳角',
  '清心 丸 漳浦|26|2026-10-10|六鳌',
  '王凯成™|21|2026-10-12|漳州港',
  '王凯成™|23|2026-10-13|漳州第一滩',
  '王凯成™|24|2026-10-15|漳州第一滩',
  'Nice，泉州|24|2026-10-18|泉州惠女湾沙滩',
  '厦门湖里阿利奥|28.5|2026-10-24|泉州惠女湾沙滩',
  '海风无期-平潭|29|2026-10-25|平潭北澳月海湾',
  '㣻罖．厦门湖里|26|2026-10-25|厦门凤头沙滩',
  'Jerry钟|25|2026-10-31|厦门凤头沙滩',
  '空军佬 漳州港|26.5|2026-11-07|漳州卡达凯斯',
  '海边鱼-厦门筼筜|21|2026-11-07|厦门白石',
  'Jay杰|25|2026-11-07|厦门荻花洲',
  '言（福建平潭）|26|2026-11-10|福州平潭湖南村',
  '小邹-厦门湖里|23|2026-11-15|漳州东山澳角沙滩',
  '弯弓射大鲷——漳州龙海|20|2026-11-15|漳州古雷杏仔沙滩',
  '我是个招财猫漳浦前亭镇|21|2026-11-16|厦门黄厝沙滩',
  '啊华-思明|24|2026-11-16|厦门121沙滩',
];

// 解析为条目对象
function buildEntries(openid) {
  return RAW.map((line, i) => {
    const parts = line.split('|');
    const name = (parts[0] || '').trim();
    const len = parseFloat(parts[1]);
    const date = parts[2] || null;
    const spot = (parts[3] || '').trim();
    const note = len >= 28 ? '28cm以上，需配视频（展示钓场与测量过程）' : '';

    return {
      id: 'sj_' + (i + 1),
      seq: i + 1,
      player_name: name,
      best_species: '沙尖鱼',
      length_cm: isNaN(len) ? null : len,
      total_weight_g: null,
      spot: spot,
      fish_count: 1,
      note: note,
      photo_url: null,
      catch_photo_url: null,
      spot_photo1_url: null,
      spot_photo2_url: null,
      catch_date: date,
      catch_time: null,
      tide_direction: null,
      tide_score: null,
      tide_type: null,
      spot_lat: null,
      spot_lon: null,
      created_by: openid || 'import',
      created_at: new Date(),
    };
  });
}

function dedupKey(e) {
  return [e.player_name, e.catch_date, e.length_cm, e.spot].join('|');
}

function sortEntries(entries) {
  entries.sort((a, b) => {
    const lenA = a.length_cm || 0;
    const lenB = b.length_cm || 0;
    if (lenB !== lenA) return lenB - lenA;
    // 长度相同按钓获日期升序（先钓到的在前）
    const da = a.catch_date || '9999-99-99';
    const db_ = b.catch_date || '9999-99-99';
    return da < db_ ? -1 : da > db_ ? 1 : 0;
  });
  return entries;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { competitionId, reset } = event || {};

  try {
    // 1. 定位赛事
    let comp;
    if (competitionId) {
      const r = await db.collection('competitions').doc(competitionId).get();
      comp = r.data;
    } else {
      const r = await db.collection('competitions')
        .where({ name: db.RegExp({ regexp: '沙尖之王' }) })
        .limit(5)
        .get();
      if (!r.data.length) {
        return {
          success: false,
          error: '未找到名称包含「沙尖之王」的赛事，请传 competitionId',
        };
      }
      if (r.data.length > 1) {
        return {
          success: false,
          error: '匹配到多个赛事，请指定 competitionId',
          candidates: r.data.map(c => ({ _id: c._id, name: c.name })),
        };
      }
      comp = r.data[0];
    }
    if (!comp) return { success: false, error: '赛事不存在' };

    // 2. 权限校验（控制台调用时 OPENID 为空，跳过）
    if (OPENID) {
      const cfg = await db.collection('admin_config').limit(1).get();
      const config = cfg.data[0] || {};
      const supers = config.super_admins || config.admins || [];
      const compAdmins = config.competition_admins || [];
      const allowed = supers.includes(OPENID) || compAdmins.includes(OPENID);
      if (!allowed) {
        return { success: false, error: '无权限导入该赛事数据' };
      }
    }

    // 3. 生成并合并
    const incoming = buildEntries(OPENID);
    let existing = reset ? [] : (comp.entries || []);

    // 去重：已存在的相同记录不再重复写入
    const existKeys = new Set(existing.map(dedupKey));
    const added = incoming.filter(e => !existKeys.has(dedupKey(e)));

    const merged = sortEntries(existing.concat(added));

    await db.collection('competitions').doc(comp._id).update({
      data: {
        entries: merged,
        target_species: comp.target_species || '沙尖鱼',
        updated_at: db.serverDate(),
      },
    });

    return {
      success: true,
      competitionId: comp._id,
      competitionName: comp.name,
      total: incoming.length,
      added: added.length,
      skipped: incoming.length - added.length,
      finalEntries: merged.length,
      top5: merged.slice(0, 5).map(e => ({
        name: e.player_name, length_cm: e.length_cm, spot: e.spot, date: e.catch_date,
      })),
    };
  } catch (err) {
    console.error('importShajianEntries error:', err);
    return { success: false, error: err.message };
  }
};
