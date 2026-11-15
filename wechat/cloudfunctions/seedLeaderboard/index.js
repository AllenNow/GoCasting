// 云函数：seedLeaderboard — 初始化榜单数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  // ===== 榜单1：巨物猎手榜（按重量排序）=====
  const giantHunter = {
    name: '巨物猎手榜',
    description: '不限鱼种，按单尾重量排名的综合榜单',
    type: 'weight',           // 排序方式：weight 按重量
    target_species: null,     // null = 不限鱼种
    status: 'ongoing',
    date: '2025-01-01',       // 榜单开始日期
    location: '厦门及周边',
    entries: [
      { id: '1',  player_name: '七七',       best_species: '大黑牛',     length_cm: null, total_weight_g: 1750, fish_count: 1, spot: '凤头',       note: '' },
      { id: '2',  player_name: '小飞侠',     best_species: '黄鳍鲷',     length_cm: 43,   total_weight_g: 1500, fish_count: 1, spot: '避风港',     note: '' },
      { id: '3',  player_name: '小胖',       best_species: '红谷鱼',     length_cm: 55,   total_weight_g: 1257, fish_count: 1, spot: '香山游艇会', note: '' },
      { id: '4',  player_name: 'R.cy',       best_species: '海鲈鱼',     length_cm: 53,   total_weight_g: 1220, fish_count: 1, spot: '—',          note: '' },
      { id: '5',  player_name: '庄',         best_species: '黄鳍鲷',     length_cm: 38,   total_weight_g: 1080, fish_count: 1, spot: '五缘湾',     note: '' },
      { id: '6',  player_name: '小胖',       best_species: '大黑牛鱼',   length_cm: 33,   total_weight_g: 1023, fish_count: 1, spot: '香山游艇会', note: '' },
      { id: '7',  player_name: '皮革',       best_species: '黄鳍鲷',     length_cm: 32,   total_weight_g: 765,  fish_count: 1, spot: '翔安会展',   note: '' },
      { id: '8',  player_name: '小朱',       best_species: '黄鳍鲷',     length_cm: 32,   total_weight_g: 492,  fish_count: 1, spot: '荻花洲',     note: '' },
      { id: '9',  player_name: '阿搞',       best_species: '黄鳍鲷',     length_cm: 38.5, total_weight_g: null, fish_count: 1, spot: '荻花洲',     note: '重量待定' },
      { id: '10', player_name: '淼-海沧湖',  best_species: '印度丝鲹',   length_cm: 35,   total_weight_g: null, fish_count: 1, spot: '海沧湖',     note: '重量待定' },
    ],
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  };

  // ===== 榜单2：黄鳍鲷榜单（按长度排序）=====
  const yellowfinBream = {
    name: '黄鳍鲷榜单',
    description: '黄鳍鲷专项榜，按单尾长度排名',
    type: 'length',           // 排序方式：length 按长度
    target_species: '黄鳍鲷',
    status: 'ongoing',
    date: '2025-01-01',
    location: '厦门及周边',
    entries: [
      { id: '1',  player_name: '小飞侠',       best_species: '黄鳍鲷', length_cm: 43,   total_weight_g: 1500, fish_count: 1, spot: '避风港',     note: '' },
      { id: '2',  player_name: '阿搞',         best_species: '黄鳍鲷', length_cm: 38.5, total_weight_g: null, fish_count: 1, spot: '荻花洲',     note: '重量待定' },
      { id: '3',  player_name: '庄',           best_species: '黄鳍鲷', length_cm: 38,   total_weight_g: 1080, fish_count: 1, spot: '五缘湾',     note: '' },
      { id: '4',  player_name: '皮革',         best_species: '黄鳍鲷', length_cm: 32,   total_weight_g: 765,  fish_count: 1, spot: '翔安会展',   note: '' },
      { id: '5',  player_name: '小朱',         best_species: '黄鳍鲷', length_cm: 32,   total_weight_g: 492,  fish_count: 1, spot: '荻花洲',     note: '' },
      { id: '6',  player_name: '小毛',         best_species: '黄鳍鲷', length_cm: 31,   total_weight_g: null, fish_count: 1, spot: '同益码头',   note: '重量待定' },
      { id: '7',  player_name: '小毛',         best_species: '黄鳍鲷', length_cm: 30,   total_weight_g: null, fish_count: 1, spot: '待定',       note: '重量/钓点待定' },
      { id: '8',  player_name: '王凯成',       best_species: '黄鳍鲷', length_cm: 30,   total_weight_g: null, fish_count: 1, spot: '漳州港',     note: '重量待定' },
      { id: '9',  player_name: '房产中介廖晖', best_species: '黄鳍鲷', length_cm: 28,   total_weight_g: 380,  fish_count: 1, spot: '五缘湾百信', note: '' },
      { id: '10', player_name: '小毛',         best_species: '黄鳍鲷', length_cm: 27,   total_weight_g: null, fish_count: 1, spot: '同益码头',   note: '重量待定' },
    ],
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  };

  // ===== 榜单3：沙尖鱼榜单（按长度排序）=====
  const whiting = {
    name: '沙尖鱼榜单',
    description: '沙尖鱼（多鳞鱚）专项榜，按单尾长度排名',
    type: 'length',
    target_species: '沙尖鱼',
    status: 'ongoing',
    date: '2025-01-01',
    location: '厦门及周边',
    entries: [
      { id: '1',  player_name: '谦逊',         best_species: '沙尖鱼', length_cm: 28.5, total_weight_g: 190,  fish_count: 1, spot: '集美大桥下',   note: '' },
      { id: '2',  player_name: '小飞侠',       best_species: '沙尖鱼', length_cm: 26.5, total_weight_g: null, fish_count: 1, spot: '凤头',         note: '重量待定' },
      { id: '3',  player_name: '王凯成',       best_species: '沙尖鱼', length_cm: 26.5, total_weight_g: null, fish_count: 1, spot: '漳州港',       note: '重量待定' },
      { id: '4',  player_name: '小胖',         best_species: '沙尖鱼', length_cm: 26,   total_weight_g: null, fish_count: 1, spot: '凤头沙滩',     note: '重量待定' },
      { id: '5',  player_name: '房产中介廖晖', best_species: '沙尖鱼', length_cm: 25.5, total_weight_g: null, fish_count: 1, spot: '五缘湾',       note: '重量待定' },
      { id: '6',  player_name: '黄小凡',       best_species: '沙尖鱼', length_cm: 24,   total_weight_g: 103,  fish_count: 1, spot: '花屿路',       note: '' },
      { id: '7',  player_name: 'R.cy',         best_species: '沙尖鱼', length_cm: 24,   total_weight_g: 97,   fish_count: 1, spot: '西堤',         note: '' },
      { id: '8',  player_name: '房产中介廖晖', best_species: '沙尖鱼', length_cm: 24,   total_weight_g: null, fish_count: 1, spot: '五缘大桥南侧', note: '重量待定' },
      { id: '9',  player_name: 'pla叶大师',   best_species: '沙尖鱼', length_cm: 23.5, total_weight_g: null, fish_count: 1, spot: '—',            note: '重量待定' },
      { id: '10', player_name: '房产中介廖晖', best_species: '沙尖鱼', length_cm: 23,   total_weight_g: null, fish_count: 1, spot: '五缘大桥南侧', note: '重量待定' },
      { id: '11', player_name: '一叶',         best_species: '沙尖鱼', length_cm: 22.5, total_weight_g: null, fish_count: 1, spot: '荻花洲',       note: '重量待定' },
      { id: '12', player_name: '淼-海沧湖',    best_species: '沙尖鱼', length_cm: 22,   total_weight_g: null, fish_count: 1, spot: '海沧湖',       note: '重量待定' },
      { id: '13', player_name: '好赵头',       best_species: '沙尖鱼', length_cm: 22,   total_weight_g: null, fish_count: 1, spot: '121沙滩',      note: '重量待定' },
      { id: '14', player_name: '崔大师',       best_species: '沙尖鱼', length_cm: 22,   total_weight_g: null, fish_count: 1, spot: '漳州港',       note: '重量待定' },
      { id: '15', player_name: '淼-海沧湖',    best_species: '沙尖鱼', length_cm: 21.5, total_weight_g: null, fish_count: 1, spot: '海沧湖',       note: '重量待定' },
      { id: '16', player_name: '阿凡-121',     best_species: '沙尖鱼', length_cm: 21.5, total_weight_g: null, fish_count: 1, spot: '121沙滩',      note: '重量待定' },
      { id: '17', player_name: '海大师',       best_species: '沙尖鱼', length_cm: 21.1, total_weight_g: null, fish_count: 1, spot: '白石',         note: '重量待定' },
      { id: '18', player_name: '王凯成',       best_species: '沙尖鱼', length_cm: 21,   total_weight_g: null, fish_count: 1, spot: '漳州港',       note: '重量待定' },
      { id: '19', player_name: '阿卷',         best_species: '沙尖鱼', length_cm: 21,   total_weight_g: null, fish_count: 1, spot: '待定',         note: '重量/钓点待定' },
      { id: '20', player_name: '楚大师',       best_species: '沙尖鱼', length_cm: 21,   total_weight_g: null, fish_count: 1, spot: '121沙滩',      note: '重量待定' },
      { id: '21', player_name: '阿凡-121',     best_species: '沙尖鱼', length_cm: 19,   total_weight_g: null, fish_count: 1, spot: '121沙滩',      note: '重量待定' },
    ],
    created_at: db.serverDate(),
    updated_at: db.serverDate(),
  };

  try {
    // 先清空旧数据（可选）
    // await db.collection('competitions').where({}).remove();

    // 写入三个榜单
    const res1 = await db.collection('competitions').add({ data: giantHunter });
    const res2 = await db.collection('competitions').add({ data: yellowfinBream });
    const res3 = await db.collection('competitions').add({ data: whiting });

    return {
      success: true,
      message: '已导入 3 个榜单',
      ids: [res1._id, res2._id, res3._id],
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
