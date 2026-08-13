// cloudfunctions/seedGearData/index.js
// 装备数据初始化 — 写入 gear_series + gear_models
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const { SERIES_DATA, SERIES_DATA_RODS } = require('./data/series');
const { MODELS_DATA, MODELS_DATA_RODS, MODELS_DATA_SPIN_POWER, MODELS_DATA_AXELSPIN, MODELS_DATA_FLIEGEN, MODELS_DATA_SURF_LANDER_JOINT, MODELS_DATA_SURF_LANDER_TELE, MODELS_DATA_SURF_GAZER_CN, MODELS_DATA_SURF_CHASER_CN, MODELS_DATA_SPINJOY_CN, MODELS_DATA_ACTIVECAST_CN } = require('./data/models');

// 合并渔轮 + 渔竿数据
const ALL_SERIES = [...SERIES_DATA, ...SERIES_DATA_RODS];
const ALL_MODELS = [...MODELS_DATA, ...MODELS_DATA_RODS, ...MODELS_DATA_SPIN_POWER, ...MODELS_DATA_AXELSPIN, ...MODELS_DATA_FLIEGEN, ...MODELS_DATA_SURF_LANDER_JOINT, ...MODELS_DATA_SURF_LANDER_TELE, ...MODELS_DATA_SURF_GAZER_CN, ...MODELS_DATA_SURF_CHASER_CN, ...MODELS_DATA_SPINJOY_CN, ...MODELS_DATA_ACTIVECAST_CN];

// 批量删除 collection 中所有记录（并发删除，每批 10 条）
async function clearCollection(db, collectionName) {
  let deleted = 0;
  while (true) {
    const res = await db.collection(collectionName).limit(100).get();
    if (res.data.length === 0) break;
    await Promise.all(res.data.map(doc => db.collection(collectionName).doc(doc._id).remove()));
    deleted += res.data.length;
  }
  return deleted;
}

exports.main = async (event, context) => {
  const db = cloud.database();

  try {
    // 幂等检查：如果已有数据且非强制模式，跳过
    const check = await db.collection('gear_series').limit(1).get();
    if (check.data.length > 0 && !event.force) {
      return { success: true, skipped: true, message: '数据已存在，跳过初始化' };
    }

    // 强制模式：清空旧数据
    if (event.force) {
      await clearCollection(db, 'gear_series');
      await clearCollection(db, 'gear_models');
    }

    // 并发批量写入，每批 10 条
    async function batchAdd(collection, items) {
      const BATCH = 10;
      let count = 0;
      for (let i = 0; i < items.length; i += BATCH) {
        const chunk = items.slice(i, i + BATCH);
        await Promise.all(chunk.map(item => db.collection(collection).add({ data: item })));
        count += chunk.length;
      }
      return count;
    }

    const seriesCount = await batchAdd('gear_series', ALL_SERIES);
    const modelCount  = await batchAdd('gear_models',  ALL_MODELS);

    return {
      success: true,
      seriesCount,
      modelCount,
      message: `成功写入 ${seriesCount} 个系列 + ${modelCount} 个型号`
    };
  } catch (err) {
    console.error('seedGearData error:', err);
    return { success: false, error: String(err) };
  }
};
