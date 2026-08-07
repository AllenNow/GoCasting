import json

reels = json.load(open('/Users/mac/GoCasting/assets/data/surf_reels_reference.json'))['reels']
rods  = json.load(open('/Users/mac/GoCasting/assets/data/surf_rods_reference.json'))['rods']

def slim_reel(r):
    keys = ['brand','model','size','gear_ratio','max_drag_lb','line_capacity_yds',
            'weight_oz','seal_type','price_tier','bearings','year','market','description']
    return {k: r[k] for k in keys if k in r}

def slim_rod(r):
    keys = ['brand','model','length_ft','length_m','power','action','sinker_load',
            'weight_g','pieces','price_tier','type','year','market','description','series']
    return {k: r[k] for k in keys if k in r}

r2 = [slim_reel(r) for r in reels]
d2 = [slim_rod(r)  for r in rods]

reels_js = json.dumps(r2, ensure_ascii=False, separators=(',',':'))
rods_js  = json.dumps(d2, ensure_ascii=False, separators=(',',':'))

code = '''// cloudfunctions/seedReferenceData/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const REELS = ''' + reels_js + ''';
const RODS  = ''' + rods_js + ''';

exports.main = async (event, context) => {
  const db = cloud.database();
  try {
    // 幂等检查
    const check = await db.collection('reels_reference').limit(1).get();
    if (check.data.length > 0 && !event.force) {
      return { success: true, skipped: true };
    }
    // 写入渔轮
    let reelCount = 0;
    for (const item of REELS) {
      await db.collection('reels_reference').add({ data: item });
      reelCount++;
    }
    // 写入渔竿
    let rodCount = 0;
    for (const item of RODS) {
      await db.collection('rods_reference').add({ data: item });
      rodCount++;
    }
    return { success: true, reelCount, rodCount };
  } catch (err) {
    console.error('seed error:', err);
    return { success: false, error: String(err) };
  }
};
'''

with open('/Users/mac/GoCasting/wechat/cloudfunctions/seedReferenceData/index.js', 'w') as f:
    f.write(code)

print(f'Written: reels={len(r2)}, rods={len(d2)}')
size = len(code)
print(f'File size: {size} bytes = {size/1024:.1f} KB')
