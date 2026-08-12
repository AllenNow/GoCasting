// pages/species/species.js — 鱼种图鉴
// 东南沿海（福建沙滩岸钓）鱼种收录，按科分组排列

// ── 科目分组配置 ──
const CATEGORIES = [
  { key: 'all',    label: '全部' },
  { key: '鱚科',   label: '鱚科·沙尖' },
  { key: '石首鱼科', label: '石首鱼科' },
  { key: '鲷科',   label: '鲷科' },
  { key: '鲻科',   label: '鲻科' },
  { key: '鲾科',   label: '鲾科' },
  { key: '隆头鱼科', label: '隆头鱼科' },
  { key: '其他',   label: '其他鱼类' },
];

// ── 鱼种数据，按科分组排列 ──
const SPECIES_DATA = [

  // ══════════════════════════════════════════
  // 一、鱚科｜沙尖类（沙尖之王杯目标鱼）
  // ══════════════════════════════════════════
  {
    id: 1, name: '多鳞鱚（沙尖）', en: 'Silver Biddy',
    pinyin: 'duō lín xǐ（shā jiān）',
    latin: 'Sillago sihama', icon: '🐟',
    category: '鱚科', habitat: '纯沙质海滩，受惊会钻入沙层',
    season: '春末至秋季，夏季最旺', size: '14-24cm，极少数可达30cm', weight: '50-200g',
    bait: '粉虫（沙尖比赛首选）、沙蚕细绑、赤虫', rig: '天秤远投、游动铅', rodPower: 'light（20-25号铅）',
    tips: '"沙尖之王杯"比赛指定目标鱼，比赛绝大部分渔获均为此种。⚠️ 民间有时误称"沙丁鱼"，两者完全不同科属，请勿混淆。',
    alias: '沙尖、沙钻、沙追、沙肠仔、沙梭', color: '#b8a060',
  },
  {
    id: 2, name: '少鳞鱚（银沙尖）', en: 'Japanese Whiting',
    pinyin: 'shǎo lín xǐ（yín shā jiān）',
    latin: 'Sillago japonica', icon: '🐟',
    category: '鱚科', habitat: '沙滩、沙泥底，偶见于河口',
    season: '春末至秋季', size: '13-22cm', weight: '40-150g',
    bait: '粉虫、沙蚕细绑', rig: '天秤远投', rodPower: 'light（20-25号铅）',
    tips: '外形与多鳞鱚高度相似，鳞片更大、数量更少（侧线鳞约60片）。福建沙滩经常与多鳞鱚一同钓获，野外肉眼难以区分。',
    alias: '银沙尖、日本沙鮻', color: '#c8b878',
  },

  // ══════════════════════════════════════════
  // 二、石首鱼科｜沙滩高频发声鱼类
  // ══════════════════════════════════════════
  {
    id: 3, name: '白姑鱼', en: 'Silver Croaker',
    pinyin: 'bái gū yú',
    latin: 'Argyrosomus argentatus', icon: '🐟',
    category: '石首鱼科', habitat: '沙泥底沙滩，夜间大量靠岸',
    season: '春至秋季，夜钓高峰', size: '15-28cm', weight: '100-400g',
    bait: '赤虫（夜钓首选）、沙蚕、腌制虾肉', rig: '天秤、游动铅', rodPower: 'light-medium（20-27号铅）',
    tips: '福建沙滩滩钓实战重点鱼种，对夜光诱饵反应明显。咬口有明显拉扯感，体侧银白色。',
    alias: '白果子、滑仔、白姑', color: '#c0c8b0',
  },
  {
    id: 4, name: '皮氏叫姑鱼', en: "Belanger's Croaker",
    pinyin: 'pí shì jiào gū yú',
    latin: 'Johnius belangerii', icon: '🐟',
    category: '石首鱼科', habitat: '沙滩、滩涂、河口沙泥底',
    season: '全年，春夏秋较多', size: '10-18cm', weight: '40-150g',
    bait: '沙蚕、小虾', rig: '天秤、Hi-Lo', rodPower: 'light（18-25号铅）',
    tips: '咬钩后发出响亮的"咕咕"声，是石首鱼科的典型特征。常与白姑鱼混钓。',
    alias: '花滑、叫姑、咕咕鱼', color: '#a09878',
  },
  {
    id: 5, name: '黄姑鱼', en: 'Yellow Drum',
    pinyin: 'huáng gū yú',
    latin: 'Nibea albiflora', icon: '🟡',
    category: '石首鱼科', habitat: '近海沙泥，大潮时靠近沙滩',
    season: '春夏秋，大潮期间', size: '20-35cm', weight: '200-800g',
    bait: '沙蚕、虾', rig: '天秤、游动铅', rodPower: 'medium（22-30号铅）',
    tips: '体侧布满斜纹斑点，辨识度高。大潮时成群靠近沙滩觅食，是沙滩远投的偶遇惊喜。',
    alias: '春子、假黄花、黄婆', color: '#d4a820',
  },
  {
    id: 6, name: '棘头梅童鱼', en: 'Big Head Croaker',
    pinyin: 'jí tóu méi tóng yú',
    latin: 'Collichthys lucidus', icon: '🐟',
    category: '石首鱼科', habitat: '沙泥浅滩、近岸低潮带',
    season: '全年', size: '8-14cm', weight: '20-80g',
    bait: '沙蚕、小虾', rig: 'Hi-Lo、天秤', rodPower: 'light（15-20号铅）',
    tips: '头部异常巨大，身体软嫩。常混在白姑鱼群中被一并钓获，数量多但个头小。',
    alias: '大头仔、黄皮梅童', color: '#c8b048',
  },
  {
    id: 7, name: '尖头黄鳍牙䱛', en: 'Golden Croaker',
    pinyin: 'jiān tóu huáng qí yá chǎn',
    latin: 'Chrysochir aureus', icon: '🟡',
    category: '石首鱼科', habitat: '沙泥底近海沙滩',
    season: '春夏秋', size: '20-30cm', weight: '150-500g',
    bait: '沙蚕、虾', rig: '天秤、游动铅', rodPower: 'medium（22-30号铅）',
    tips: '尾鳍金黄色，非常醒目。同属石首鱼科，咬口与白姑鱼类似。',
    alias: '黄金姑、金姑', color: '#d4b030',
  },

  // ══════════════════════════════════════════
  // 三、鲷科｜沙滩岩沙混合岸钓
  // ══════════════════════════════════════════
  {
    id: 8, name: '黑棘鲷（黑鲷）', en: 'Black Seabream',
    pinyin: 'hēi jí diāo（hēi diāo）',
    latin: 'Acanthopagrus schlegelii', icon: '🐟',
    category: '鲷科', habitat: '防波堤、礁石沙滩交界',
    season: '全年，春秋最佳', size: '15-30cm，最大45cm', weight: '0.3-2kg',
    bait: '本虫（岩虫）（最强）、螃蟹、沙蚕、贝肉', rig: '天秤、游动铅、Hi-Lo', rodPower: 'medium（20-30号铅）',
    tips: '夜钓效果更佳，涨潮前后1小时为黄金时段。磷光诱饵在混水中表现好。',
    alias: '黑格、乌鲑、黑立', color: '#2d3a4a',
  },
  {
    id: 9, name: '黄鳍鲷', en: 'Yellowfin Seabream',
    pinyin: 'huáng qí diāo',
    latin: 'Acanthopagrus latus', icon: '🐟',
    category: '鲷科', habitat: '沙泥港湾、河口沙滩边缘',
    season: '全年，冬春最佳', size: '15-28cm', weight: '0.3-1.5kg',
    bait: '沙蚕、虾、螃蟹', rig: '天秤、游动铅', rodPower: 'medium（20-27号铅）',
    tips: '鱼鳍金黄色辨识度高，福建名贵食用鱼。喜河口沙泥底，晨昏活跃。',
    alias: '黄翅、黄脚立', color: '#d4a030',
  },
  {
    id: 10, name: '平鲷', en: 'Goldlined Seabream',
    pinyin: 'píng diāo',
    latin: 'Rhabdosargus sarba', icon: '🐟',
    category: '鲷科', habitat: '沙质海湾',
    season: '全年', size: '18-32cm', weight: '0.3-1.5kg',
    bait: '虾、沙蚕、贝肉', rig: '天秤、Hi-Lo', rodPower: 'medium（20-27号铅）',
    tips: '身体银色，头部圆钝，体侧有金色纵纹。常与黑鲷、黄鳍鲷混栖。',
    alias: '邦头、黄锡鲷、平头', color: '#9ab0a0',
  },

  // ══════════════════════════════════════════
  // 四、鲻科｜沙滩河口中上层
  // ══════════════════════════════════════════
  {
    id: 11, name: '鲻鱼', en: 'Flathead Mullet',
    pinyin: 'zī yú',
    latin: 'Mugil cephalus', icon: '🐟',
    category: '鲻科', habitat: '沙滩河口，中上层巡游',
    season: '全年，秋冬最肥美', size: '25-50cm', weight: '0.5-3kg',
    bait: '面团（发酵，最有效）、沙蚕、藻类', rig: '浮标钓、Hi-Lo', rodPower: 'medium（20-25号铅）',
    tips: '群居滤食性，对气味敏感，打窝效果极好。嘴小，细线细钩效果更好。',
    alias: '乌头、白眼、乌鲻', color: '#4a7a5a',
  },
  {
    id: 12, name: '鮻（梭鱼）', en: 'Redlip Mullet',
    pinyin: 'suō（suō yú）',
    latin: 'Planiliza haematocheila', icon: '🐟',
    category: '鲻科', habitat: '咸淡水沙滩河口',
    season: '全年', size: '20-40cm', weight: '0.3-1.5kg',
    bait: '面团、沙蚕', rig: '浮标钓、Hi-Lo', rodPower: 'medium（18-25号铅）',
    tips: '眼睛呈明显红色是最大特征。常与鲻鱼混栖于河口，习性相近。',
    alias: '赤眼梭、红目呆', color: '#5a8060',
  },

  // ══════════════════════════════════════════
  // 五、鲾科（读音：bī）｜串钩高频杂鱼
  // ══════════════════════════════════════════
  {
    id: 13, name: '短棘鲾', en: 'Common Ponyfish',
    pinyin: 'duǎn jí bī',
    latin: 'Leiognathus equulus', icon: '🐟',
    category: '鲾科', habitat: '沙泥沙滩、港湾、河口咸淡水，可少量进入淡水',
    season: '全年', size: '10-18cm，最大25cm', weight: '30-200g',
    bait: '沙蚕、小虾', rig: '串钩、Hi-Lo', rodPower: 'light（15-20号铅）',
    tips: '鲾科里体型最大的种类。后颈无黑斑，体表粘液丰富，会发出轻微咕咕声。体内含发光细菌，夜间微微荧光。沙滩串钩高频杂鱼，成群出现，口小钩子不宜过大。肉质鲜，细刺多，适合熬汤。',
    alias: '金钱仔、狗腰', color: '#c0c8a0',
  },
  {
    id: 14, name: '项斑项鲾', en: 'Spotnape Ponyfish',
    pinyin: 'xiàng bān xiàng bī',
    latin: 'Nuchequula nuchalis', icon: '🐟',
    category: '鲾科', habitat: '近岸沙泥滩、河口',
    season: '全年', size: '8-13cm', weight: '20-80g',
    bait: '沙蚕、小虾', rig: '串钩、Hi-Lo', rodPower: 'light（15-20号铅）',
    tips: '最核心识别标记：后颈有一块清晰黑斑。浑身滑腻，肉质极鲜，市场价格较高，是四种鲾中最受食客欢迎的。',
    alias: '油叶仔、油鳓', color: '#b8c090',
  },
  {
    id: 15, name: '静鲾（仰口鲾）', en: 'Pugnose Ponyfish',
    pinyin: 'jìng bī（yǎng kǒu bī）',
    latin: 'Secutor insidiator', icon: '🐟',
    category: '鲾科', habitat: '内湾沙滩、潮间带外围沙泥底',
    season: '全年', size: '6-10cm', weight: '10-50g',
    bait: '沙蚕、小虾', rig: '串钩', rodPower: 'light（15-20号铅）',
    tips: '嘴巴小且向下伸缩。鳃盖处有黑色短线纹，体侧有数条细短横条纹。体型偏小，串钩经常钓到大量幼鱼。',
    alias: '金钱仔、榕叶仔', color: '#a8b888',
  },
  {
    id: 16, name: '黄斑鲾', en: 'Banded Ponyfish',
    pinyin: 'huáng bān bī',
    latin: 'Equulites bindus', icon: '🐟',
    category: '鲾科', habitat: '港湾、滩涂外围沙泥底',
    season: '全年', size: '7-12cm', weight: '15-60g',
    bait: '沙蚕、小虾', rig: '串钩', rodPower: 'light（15-20号铅）',
    tips: '体侧带有淡黄色斑块。成群活动，码头周边数量巨大，多刺适合煮汤。四种鲾鱼闽南统称"金钱仔"，钓鱼时一般不细分品种。',
    alias: '金钱仔', color: '#c8c070',
  },

  // ══════════════════════════════════════════
  // 六、隆头鱼科｜海猪鱼属（礁沙交界杂鱼）
  // ══════════════════════════════════════════
  {
    id: 17, name: '侧带海猪鱼', en: 'Zigzag Wrasse',
    pinyin: 'cè dài hǎi zhū yú',
    latin: 'Halichoeres scapularis', icon: '🐠',
    category: '隆头鱼科', habitat: '礁沙混合区、沙滩外缘、防波堤周边',
    season: '全年，白天活跃', size: '10-18cm，最大20cm', weight: '30-150g',
    bait: '沙蚕、小虾', rig: '串钩、天秤', rodPower: 'light（15-22号铅）',
    tips: '福建最常见的海猪鱼。体侧一条黑色锯齿状纵带，雌鱼颜色朴素，雄鱼花纹艳丽。夜晚钻入沙子躲藏，白天活跃。礁石与沙滩交界是高发钓点。嘴小有犬齿，处理时注意。',
    alias: '柳冷仔、项带龙', color: '#4a8870',
  },
  {
    id: 18, name: '云斑海猪鱼', en: 'Bubblefin Wrasse',
    pinyin: 'yún bān hǎi zhū yú',
    latin: 'Halichoeres nigrescens', icon: '🐠',
    category: '隆头鱼科', habitat: '内湾礁沙、滩涂外围，厦门泉州数量多',
    season: '全年', size: '8-14cm', weight: '20-80g',
    bait: '沙蚕、小虾', rig: '串钩', rodPower: 'light（15-20号铅）',
    tips: '雌鱼体侧数条暗色横斑，雄鱼头部布满红蓝放射细纹——同一种鱼雌雄体色差异极大，容易误认为两种鱼。',
    alias: '哨牙妹、青花柳冷仔', color: '#5a7888',
  },
  {
    id: 19, name: '三斑海猪鱼', en: 'Threespot Wrasse',
    pinyin: 'sān bān hǎi zhū yú',
    latin: 'Halichoeres trimaculatus', icon: '🐠',
    category: '隆头鱼科', habitat: '岩礁外围沙地',
    season: '全年', size: '12-18cm', weight: '40-120g',
    bait: '沙蚕、小虾', rig: '串钩、天秤', rodPower: 'light（18-25号铅）',
    tips: '尾柄上方有一个明显黑色圆斑点，胸鳍根部另有黑斑，共三斑，由此得名。',
    alias: '三点龙、青汕冷', color: '#6a9060',
  },
  {
    id: 20, name: '棋盘海猪鱼（黄花龙）', en: 'Checkerboard Wrasse',
    pinyin: 'qí pán hǎi zhū yú（huáng huā lóng）',
    latin: 'Halichoeres hortulanus', icon: '🐠',
    category: '隆头鱼科', habitat: '近岸岩礁沙地，外海岛屿附近',
    season: '全年', size: '15-25cm', weight: '80-300g',
    bait: '沙蚕、小活虾', rig: '串钩、天秤', rodPower: 'light-medium（18-25号铅）',
    tips: '身体棋盘方格纹路，背鳍前端有醒目黄斑，头部红色放射花纹，体色华丽。大陆沿岸相对少见，外海岛礁钓鱼偶遇。',
    alias: '花面龙、方格龙', color: '#7a9050',
  },

  // ══════════════════════════════════════════
  // 七、其他沙滩远投常见鱼种
  // ══════════════════════════════════════════
  {
    id: 21, name: '花身鯻', en: 'Jarbua Terapon',
    pinyin: 'huā shēn là',
    latin: 'Terapon jarbua', icon: '🐟',
    category: '其他', habitat: '沙滩、河口，体侧有3条深色V型花纹',
    season: '全年', size: '12-22cm', weight: '80-300g',
    bait: '沙蚕、小虾、小鱼', rig: '天秤、Hi-Lo', rodPower: 'light-medium（18-25号铅）',
    tips: '体侧三条黑色V形斜纹，辨识度极高。咬口凶猛，常搭配白姑鱼一同钓获。',
    alias: '花身仔、斑吾、鸡仔鱼', color: '#a07840',
  },
  {
    id: 22, name: '多齿蛇鲻（狗母鱼）', en: 'Greater Lizardfish',
    pinyin: 'duō chǐ shé zé（gǒu mǔ yú）',
    latin: 'Saurida tumbil', icon: '🐟',
    category: '其他', habitat: '沙质海底，潜伏于沙内伏击',
    season: '全年', size: '20-35cm', weight: '100-500g',
    bait: '沙蚕、活虾、小活鱼', rig: '天秤底钓', rodPower: 'medium（22-30号铅）',
    tips: '尖嘴，牙齿锋利。潜伏沙底突袭猎物，咬钩后反应激烈，处理时注意牙齿。',
    alias: '狗母、沙狗母、那哥', color: '#8a7050',
  },
  {
    id: 23, name: '牙鲆（比目鱼）', en: 'Olive Flounder',
    pinyin: 'yá píng（bǐ mù yú）',
    latin: 'Paralichthys olivaceus', icon: '🐟',
    category: '其他', habitat: '纯沙滩，埋沙伏击小鱼',
    season: '秋冬最佳', size: '20-40cm，偶见60cm+', weight: '0.3-3kg',
    bait: '沙蚕、活虾、小活鱼', rig: '天秤（缓慢移动诱鱼）', rodPower: 'medium（20-27号铅）',
    tips: '贴底扁平鱼，咬钩后感觉重量缓缓增加而非猛烈拉扯。缓慢收线提竿效果更好。',
    alias: '偏口、比目鱼、地仔', color: '#8a8060',
  },
  {
    id: 24, name: '四指马鲅（午鱼）', en: 'Fourfinger Threadfin',
    pinyin: 'sì zhǐ mǎ bà（wǔ yú）',
    latin: 'Eleutheronema tetradactylum', icon: '🐟',
    category: '其他', habitat: '沙滩河口，洄游性鱼类',
    season: '春末至秋季洄游期', size: '25-60cm，成鱼可达1m', weight: '0.5-5kg',
    bait: '活虾、小活鱼、沙蚕', rig: '游动铅、浮钓', rodPower: 'medium-heavy（25-35号铅）',
    tips: '高级食用鱼，胸鳍下有4根游离丝状鳍条，外形独特。沙滩远投偶遇大物惊喜之选。',
    alias: '午仔、马友鱼', color: '#6a8870',
  },
  {
    id: 25, name: '蓝圆鲹（巴浪鱼）', en: 'Japanese Scad',
    pinyin: 'lán yuán shēn（bā làng yú）',
    latin: 'Decapterus maruadsi', icon: '🐟',
    category: '其他', habitat: '近海中上层，大潮会来到沙滩近处',
    season: '春秋洄游季', size: '15-28cm', weight: '100-300g',
    bait: '羽毛钩、Sabiki串钩、虾皮', rig: 'Sabiki、竖钓', rodPower: 'medium（20-25号铅）',
    tips: '集群活动。发现海面有鸟群追逐处往往有鱼群。沙滩远投偶尔会钓到，更多出现在堤防。',
    alias: '巴浪、池鱼', color: '#3a6a8a',
  },
  {
    id: 26, name: '矛尾复虾虎鱼', en: 'Spear-tailed Goby',
    pinyin: 'máo wěi fù xiā hǔ yú',
    latin: 'Synechogobius hasta', icon: '🐟',
    category: '其他', habitat: '沙滩、河口咸淡水交汇处',
    season: '全年，春秋较多', size: '20-35cm', weight: '100-400g',
    bait: '沙蚕、小活鱼', rig: '天秤底钓', rodPower: 'medium（20-27号铅）',
    tips: '体型细长，头部巨大。贴底活动，咬钩后多在底层拉扯。',
    alias: '沙光、推浪鱼、海鲇鱼', color: '#7a6a4a',
  },

  // ══════════════════════════════════════════
  // 八、鳗鲡目 / 蛇鳗科｜海鳗
  // ══════════════════════════════════════════
  {
    id: 27, name: '海鳗', en: 'Japanese Conger',
    pinyin: 'hǎi mán',
    latin: 'Muraenesox cinereus', icon: '🐍',
    category: '其他', habitat: '礁石洞穴、泥底深坑、沙泥底',
    season: '夏秋最旺，夜间活跃', size: '60-150cm', weight: '1-8kg',
    bait: '沙蚕（最有效）、小活鱼、鱿鱼肉、巴浪鱼切片', rig: 'Bottom rig（单钩）', rodPower: 'heavy（30-40号铅）',
    tips: '夜钓专属，白天极少咬口。咬钩后旋转逃跑，需足够刹车力；抄网必备。⚠️ 牙齿极锋利，务必用夹鱼器或毛巾隔手处理。',
    alias: '鳗鱼、灰海鳗', color: '#3a3a2a',
  },

  // ══════════════════════════════════════════
  // 九、甲壳类｜螃蟹（作为目标鱼记录用）
  // ══════════════════════════════════════════
  {
    id: 28, name: '三疣梭子蟹', en: 'Swimming Crab',
    pinyin: 'sān yù suō zǐ xiè',
    latin: 'Portunus trituberculatus', icon: '🦀',
    category: '其他', habitat: '沙泥底近海，近岸沙滩外侧',
    season: '秋冬最肥，全年可钓', size: '壳宽10-20cm', weight: '200g-1kg',
    bait: '腌制虾肉、鱼肉、猪肉条（蟹笼专用）', rig: '蟹笼、底钓大钩', rodPower: 'medium（20-30号铅）',
    tips: '福建最常见食用蟹，俗称梭子蟹、三眼蟹（壳背三个疣突像三只眼）、枪蟹。沙滩远投底钓偶尔钩到。螃蟹本身也是黑鲷的绝佳饵料——用活螃蟹切碎挂钩效果极好。',
    alias: '梭子蟹、三眼蟹、枪蟹、白蟹', color: '#5a4a3a',
  },
  {
    id: 32, name: '远海梭子蟹（兰花蟹）', en: 'Blue Swimmer Crab',
    pinyin: 'yuǎn hǎi suō zǐ xiè（lán huā xiè）',
    latin: 'Portunus pelagicus', icon: '🦀',
    category: '其他', habitat: '近海沙泥底，近岸港湾、沙滩外侧',
    season: '全年，秋冬最肥', size: '壳宽8-18cm', weight: '150g-600g',
    bait: '蟹笼、底钓', rig: '蟹笼', rodPower: '—',
    tips: '雄蟹壳呈钴蓝色带白色花纹，非常漂亮，故称兰花蟹、蓝花蟹。雌蟹偏绿褐色，煮熟偏红。与三疣梭子蟹是近亲，壳背无明显疣突、花纹更美丽。注意：真正的"红花蟹"是另一种蟹——锈斑蟳，两者不同。',
    alias: '兰花蟹、蓝花蟹、花蟹', color: '#3a5a8a',
  },
  {
    id: 33, name: '锈斑蟳（红花蟹）', en: 'Coral Crab',
    pinyin: 'xiù bān yuán（hóng huā xiè）',
    latin: 'Charybdis feriatus', icon: '🦀',
    category: '其他', habitat: '近海礁石底、沙泥底，栖息水深较大',
    season: '全年，农历二月至三月最肥', size: '壳宽8-15cm', weight: '150g-500g',
    bait: '蟹笼、底钓', rig: '蟹笼', rodPower: '—',
    tips: '壳面有独特的深褐色波浪纹斑，辨识度极高，一眼认出。注意：这是蟳属（Charybdis），不是梭子蟹属（Portunus），与三疣梭子蟹、兰花蟹不同科属。肉质鲜甜，爪肉尤佳，是福建高端海鲜。',
    alias: '红花蟹、花蟹、斑纹蟳', color: '#8a3a2a',
  },
  {
    id: 29, name: '拟穴青蟹', en: 'Mud Crab',
    pinyin: 'nǐ xué qīng xiè',
    latin: 'Scylla serrata', icon: '🦀',
    category: '其他', habitat: '河口红树林、滩涂泥底',
    season: '全年，秋冬最肥', size: '壳宽10-18cm', weight: '300g-1.5kg',
    bait: '蟹笼、底钓', rig: '蟹笼', rodPower: '—',
    tips: '俗称青蟹、膏蟹，福建高价食用蟹。滩涂作钓偶尔遇到。钳力极强，处理时务必抓住后壳两侧。',
    alias: '青蟹、膏蟹', color: '#3a5a3a',
  },

  // ══════════════════════════════════════════
  // 十、头足类｜鱿鱼 / 墨鱼
  // ══════════════════════════════════════════
  {
    id: 30, name: '日本枪乌贼（鱿鱼）', en: 'Japanese Flying Squid',
    pinyin: 'rì běn qiāng wū zéi（yóu yú）',
    latin: 'Todarodes pacificus', icon: '🦑',
    category: '其他', habitat: '近海中上层，夜间趋光靠近岸边',
    season: '秋冬洄游季，夜间趋光', size: '20-40cm（胴长）', weight: '100-400g',
    bait: '拟饵（エギ）、夜光诱饵、小鱼片', rig: 'エギング（弹跳钓）', rodPower: 'light（路亚竿）',
    tips: '夜间用强光灯诱集，用拟饵（エギ）弹跳式钓法最有效。墨汁会四处喷射，需注意衣物。鱿鱼本身切成条状也是极好的钓饵。',
    alias: '鱿鱼、乌贼、柔鱼', color: '#8a6080',
  },
  {
    id: 31, name: '曼氏无针乌贼（墨鱼）', en: 'Golden Cuttlefish',
    pinyin: 'màn shì wú zhēn wū zéi（mò yú）',
    latin: 'Sepiella japonica', icon: '🦑',
    category: '其他', habitat: '近海底层，产卵期靠近沿岸礁石区',
    season: '春季产卵期（4-6月）靠岸，其余时间在较深水域',
    size: '15-30cm（胴长）', weight: '100-600g',
    bait: '活虾（最有效）、小活鱼、拟饵', rig: '底钓活饵、墨鱼拟饵', rodPower: 'light-medium',
    tips: '福建俗称墨鱼、乌贼。春季产卵期靠近礁石区，是矶钓的好目标。受到威胁会喷出大量黑色墨汁。墨鱼须切条也是极好的海钓饵料。',
    alias: '墨鱼、乌贼、花枝', color: '#4a3050',
  },
];

Page({
  data: {
    allSpecies: SPECIES_DATA,
    filtered: SPECIES_DATA,
    categories: CATEGORIES,
    activeCategory: 'all',
    keyword: '',
    selectedId: null,
    selectedItem: null,
  },

  // ── 科目 Tab 切换 ──
  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeCategory: key });
    this._applyFilter(this.data.keyword, key);
  },

  // ── 搜索 ──
  onSearch(e) {
    const kw = e.detail.value;
    this.setData({ keyword: kw });
    this._applyFilter(kw, this.data.activeCategory);
  },

  _applyFilter(kw, category) {
    const kwLow = (kw || '').toLowerCase();
    let result = SPECIES_DATA;

    if (category && category !== 'all') {
      result = result.filter(s => s.category === category);
    }
    if (kwLow) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(kwLow) ||
        s.en.toLowerCase().includes(kwLow) ||
        (s.latin && s.latin.toLowerCase().includes(kwLow)) ||
        (s.alias && s.alias.toLowerCase().includes(kwLow)) ||
        (s.tips && s.tips.includes(kw))
      );
    }
    this.setData({ filtered: result });
  },

  // ── 卡片点击 ──
  onTap(e) {
    const id = e.currentTarget.dataset.id;
    const item = SPECIES_DATA.find(s => s.id === id);
    this.setData({ selectedId: id, selectedItem: item });
  },

  closeDetail() {
    this.setData({ selectedId: null, selectedItem: null });
  },

  goRecord() {
    wx.navigateTo({ url: '/pages/catch-log/catch-log' });
  },
});

