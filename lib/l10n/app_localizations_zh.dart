// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appTitle => 'GoCasting';

  @override
  String get tabGear => '装备';

  @override
  String get tabMaintenance => '维护';

  @override
  String get tabPlanner => '规划';

  @override
  String get gearIntelligence => '装备智能';

  @override
  String get gearIntelligenceDesc => '配置你的完美远投钓组';

  @override
  String get configureSetup => '配置钓组';

  @override
  String get browseGear => '浏览装备';

  @override
  String get setupWizard => '配置向导';

  @override
  String get whatToCatch => '你想钓什么鱼？';

  @override
  String get selectSpecies => '选择一个或多个目标鱼种';

  @override
  String get whereToFish => '你在哪里钓鱼？';

  @override
  String get selectConditions => '选择你的典型海滩条件';

  @override
  String get howFarCast => '你的抛投距离？';

  @override
  String get selectDistance => '选择你的目标抛投距离';

  @override
  String get whatsYourBudget => '你的预算？';

  @override
  String get selectBudget => '选择完整钓组的预算范围';

  @override
  String get next => '下一步';

  @override
  String get back => '上一步';

  @override
  String get getRecommendations => '获取推荐';

  @override
  String get recommendations => '推荐方案';

  @override
  String get maintenanceTracker => '维护追踪';

  @override
  String get maintenanceTrackerDesc => '追踪装备状态和维护计划';

  @override
  String get addGear => '添加装备';

  @override
  String get noGearYet => '暂无装备';

  @override
  String get noGearDesc => '添加你的第一件装备开始追踪';

  @override
  String get gearType => '装备类型';

  @override
  String get name => '名称';

  @override
  String get brand => '品牌';

  @override
  String get model => '型号';

  @override
  String get pricePaid => '购买价格';

  @override
  String get purchaseDate => '购买日期（可选）';

  @override
  String get saveGear => '保存装备';

  @override
  String get logSaltwaterSession => '记录海钓出行';

  @override
  String get markMaintenanceDone => '标记维护完成';

  @override
  String get sessionLogged => '出行已记录！';

  @override
  String get maintenanceRecorded => '维护已记录！';

  @override
  String get details => '详情';

  @override
  String get lifespan => '使用寿命';

  @override
  String get maintenanceStatus => '维护状态';

  @override
  String sessionsUsed(int count) {
    return '已使用 $count 次';
  }

  @override
  String remaining(int count) {
    return '剩余约 $count 次';
  }

  @override
  String costPerSession(String cost) {
    return '单次成本: ¥$cost';
  }

  @override
  String get sessionPlanner => '出行规划';

  @override
  String get sessionPlannerDesc => '潮汐、月相与最佳钓鱼时段';

  @override
  String get selectBeach => '选择海滩';

  @override
  String get selectDate => '选择日期';

  @override
  String get noBeachSelected => '选择海滩';

  @override
  String get noBeachDesc => '点击下方按钮选择你的钓点';

  @override
  String get tide => '潮汐';

  @override
  String get sun => '日出日落';

  @override
  String get sunrise => '日出';

  @override
  String get sunset => '日落';

  @override
  String get solarNoon => '正午';

  @override
  String get firstLight => '晨光';

  @override
  String get lastLight => '暮光';

  @override
  String get solunarFeeding => '日月活跃期';

  @override
  String get majorPeriods => '主要时段（2小时）';

  @override
  String get minorPeriods => '次要时段（1小时）';

  @override
  String get noTideData => '该站点暂无潮汐数据';

  @override
  String get settings => '设置';

  @override
  String get unitSystem => '单位系统';

  @override
  String get imperial => '英制';

  @override
  String get metric => '公制';

  @override
  String get language => '语言';

  @override
  String get followSystem => '跟随系统';

  @override
  String get about => '关于';

  @override
  String get fullyOffline => '完全离线';

  @override
  String get fullyOfflineDesc => '无需网络连接，所有数据本地存储。';

  @override
  String get onboarding1Title => '配置你的完美钓组';

  @override
  String get onboarding1Desc => '回答几个关于你钓鱼目标的问题，获得完整的装备推荐——鱼竿、渔轮、钓线等一应俱全。';

  @override
  String get onboarding2Title => '追踪装备健康';

  @override
  String get onboarding2Desc => '记录使用次数，获取维护提醒，延长你的海钓装备寿命。';

  @override
  String get onboarding3Title => '规划下次出行';

  @override
  String get onboarding3Desc => '查看潮汐、月相和日月活跃期——完全离线，无需网络。';

  @override
  String get skip => '跳过';

  @override
  String get getStarted => '开始使用';

  @override
  String get exportData => '导出数据';

  @override
  String get exportToCsv => '导出为 CSV';

  @override
  String get gearDetail => '装备详情';

  @override
  String get notFound => '未找到';

  @override
  String get status => '状态';

  @override
  String get purchased => '购买于';

  @override
  String get price => '价格';

  @override
  String get warranty => '保修';

  @override
  String get photos => '照片';

  @override
  String get parts => '零件';

  @override
  String get service => '维修';

  @override
  String get maintenanceGuides => '维护教程';

  @override
  String get seasonCheck => '季前检查';

  @override
  String get insurance => '保险报告';

  @override
  String get logMaintenance => '记录维护';

  @override
  String get totalCostOwnership => '总拥有成本';

  @override
  String get purchasePrice => '购买价格';

  @override
  String get maintenanceCost => '维护费用';

  @override
  String get totalTco => '总计 (TCO)';

  @override
  String get estimatedValue => '预估价值';

  @override
  String get valueRetained => '保值率';

  @override
  String get original => '原价';

  @override
  String get depreciation => '贬值';

  @override
  String get lifeLeft => '剩余寿命';

  @override
  String get noWarrantyRecorded => '未记录保修信息';

  @override
  String get tapToAddWarranty => '点击添加保修信息';

  @override
  String get warrantyActive => '有效';

  @override
  String get warrantyExpiringSoon => '即将到期';

  @override
  String get warrantyExpired => '已过期';

  @override
  String daysRemaining(int count) {
    return '剩余 $count 天';
  }

  @override
  String expiredOn(String date) {
    return '过期于 $date';
  }

  @override
  String get warrantyScreen => '保修管理';

  @override
  String get warrantyStartDate => '保修开始日期';

  @override
  String get warrantyDuration => '保修时长（月）';

  @override
  String get providerRetailer => '供应商 / 零售商';

  @override
  String get warrantyTerms => '保修条款（可选）';

  @override
  String get calculatedExpiry => '计算到期日';

  @override
  String get saveWarranty => '保存保修';

  @override
  String get updateWarranty => '更新保修';

  @override
  String get deleteWarranty => '删除保修';

  @override
  String get deleteWarrantyConfirm => '这将删除该装备的所有保修信息。';

  @override
  String get photosScreen => '照片管理';

  @override
  String get noPhotosYet => '暂无照片';

  @override
  String get addPhotosDesc => '添加装备照片、收据或保修卡';

  @override
  String get addFirstPhoto => '添加第一张照片';

  @override
  String get whatTypePhoto => '选择照片类型';

  @override
  String get receipt => '收据';

  @override
  String get warrantyCard => '保修卡';

  @override
  String get invoice => '发票';

  @override
  String get gearPhoto => '装备照片';

  @override
  String get takePhoto => '拍照';

  @override
  String get chooseGallery => '从相册选择';

  @override
  String get photoSaved => '照片已保存';

  @override
  String get deletePhoto => '删除照片？';

  @override
  String get deletePhotoConfirm => '这将永久删除该照片。';

  @override
  String get receiptsDocuments => '收据与文件';

  @override
  String get gearPhotos => '装备照片';

  @override
  String get logMaintenanceTitle => '记录维护';

  @override
  String get maintenanceType => '维护类型';

  @override
  String get date => '日期';

  @override
  String get costCategory => '费用类别';

  @override
  String get selfService => '自行';

  @override
  String get professional => '专业';

  @override
  String get partsReplacement => '零件';

  @override
  String get cost => '费用';

  @override
  String get serviceProvider => '服务商';

  @override
  String get notes => '备注';

  @override
  String get recordMaintenance => '记录维护';

  @override
  String get tcoAnalysis => '成本分析';

  @override
  String get costSummary => '费用概览';

  @override
  String get maintenanceRatio => '维护占比';

  @override
  String get totalSessions => '总使用次数';

  @override
  String get maintenancePerSession => '单次维护成本';

  @override
  String get costBreakdown => '费用构成';

  @override
  String get byCategory => '按类别';

  @override
  String get maintenanceCostHistory => '维护费用历史';

  @override
  String get noMaintenanceCosts => '暂无维护费用记录';

  @override
  String get costsWillAppear => '记录带有费用的维护后，数据将在此显示。';

  @override
  String get componentsScreen => '零件管理';

  @override
  String get noComponentsTracked => '暂未追踪零件';

  @override
  String get addDefaultComponents => '添加默认零件';

  @override
  String get addComponent => '添加零件';

  @override
  String get componentName => '零件名称';

  @override
  String get maintenanceEveryNSessions => '每 N 次使用维护';

  @override
  String get maintenanceEveryNDays => '每 N 天维护';

  @override
  String get markMaintained => '标记已维护';

  @override
  String get replaceComponent => '更换';

  @override
  String get deleteComponent => '删除';

  @override
  String replaceComponentTitle(String name) {
    return '更换 $name？';
  }

  @override
  String get replaceComponentDesc => '这将标记当前零件为已更换并创建新的记录。';

  @override
  String get replacementCost => '更换费用';

  @override
  String get neverMaintained => '从未维护';

  @override
  String lastMaintenance(String date) {
    return '上次：$date';
  }

  @override
  String everyNDays(int count) {
    return '每 $count 天';
  }

  @override
  String get tutorialsScreen => '维护教程';

  @override
  String get allTypes => '全部';

  @override
  String get cleaning => '清洁';

  @override
  String get lubrication => '润滑';

  @override
  String get inspection => '检查';

  @override
  String get replacement => '更换';

  @override
  String get toolsNeeded => '所需工具';

  @override
  String get steps => '步骤';

  @override
  String get difficulty => '难度';

  @override
  String get beginner => '入门';

  @override
  String get intermediate => '中级';

  @override
  String get advanced => '高级';

  @override
  String minutes(int count) {
    return '$count 分钟';
  }

  @override
  String nSteps(int count) {
    return '$count 步';
  }

  @override
  String get serviceRecordsScreen => '维修追踪';

  @override
  String get noServiceRecords => '暂无维修记录';

  @override
  String get trackProfessionalRepairs => '在此追踪专业维修和保养。';

  @override
  String get sendForService => '送去维修';

  @override
  String get serviceProviderLabel => '服务商 *';

  @override
  String get dateSent => '送出日期';

  @override
  String get estimatedReturn => '预计取回（可选）';

  @override
  String get notSet => '未设置';

  @override
  String get statusSent => '已送出';

  @override
  String get statusInRepair => '维修中';

  @override
  String get statusReturned => '已取回';

  @override
  String get markInRepair => '标记维修中';

  @override
  String get markReturned => '标记已取回';

  @override
  String get serviceCost => '维修费用';

  @override
  String get gearReturned => '装备已取回！欢迎回来。';

  @override
  String get statusUpdated => '状态已更新';

  @override
  String get preseasonChecklist => '季前检查';

  @override
  String itemsCompleted(int done, int total) {
    return '$done / $total 项已完成';
  }

  @override
  String get criticalChecks => '关键检查';

  @override
  String get normalChecks => '常规检查';

  @override
  String get optionalChecks => '可选检查';

  @override
  String get allChecksComplete => '全部完成！准备好出钓了';

  @override
  String get seasonReady => '季前就绪！';

  @override
  String passedAllChecks(String name) {
    return '$name 已通过所有季前检查。';
  }

  @override
  String get insuranceReport => '保险报告';

  @override
  String get exportCsv => '导出 CSV';

  @override
  String get noActiveGear => '无活跃装备';

  @override
  String get addGearForReport => '添加装备到库存以生成保险报告。';

  @override
  String get exportAsCsv => '导出为 CSV';

  @override
  String get copyToClipboard => '复制到剪贴板';

  @override
  String get insuranceSummary => '保险概览';

  @override
  String get totalItems => '总件数';

  @override
  String get originalValue => '原始总价';

  @override
  String get currentValue => '当前总价';

  @override
  String get reportDate => '报告日期';

  @override
  String get reportExported => '报告已导出';

  @override
  String get copied => '已复制';

  @override
  String get reportCopied => '报告已复制到剪贴板';

  @override
  String get calculatorsScreen => '装备计算器';

  @override
  String get dragSetting => '拖力设置';

  @override
  String get dragSettingDesc => '根据线强度和打结类型计算最佳拖力';

  @override
  String get lineCapacity => '线容量';

  @override
  String get lineCapacityDesc => '计算渔轮能装多少线 + backing';

  @override
  String get shockLeader => '冲击前导线';

  @override
  String get shockLeaderDesc => '抛投重铅所需的磅数和长度';

  @override
  String get sinkerWeight => '铅坠重量';

  @override
  String get sinkerWeightDesc => '根据流速、浪况和距离推荐重量';

  @override
  String get lineTest => '线磅数 (lb)';

  @override
  String get knotRetention => '打结保留率';

  @override
  String get fishingStyle => '钓法风格';

  @override
  String get result => '结果';

  @override
  String get effectiveLineStrength => '有效线强度';

  @override
  String get dragPercentage => '拖力百分比';

  @override
  String get safeRange => '安全范围';

  @override
  String get reelSpecs => '渔轮参数';

  @override
  String get ratedCapacity => '额定容量 (yds)';

  @override
  String get atDiameter => '标定线径 (mm)';

  @override
  String get targetLine => '目标线';

  @override
  String get targetLineDiameter => '目标线径 (mm)';

  @override
  String get backingOptional => 'Backing（可选）';

  @override
  String get mainLine => '主线 (yds)';

  @override
  String get backingDia => 'Backing 线径 (mm)';

  @override
  String get capacityWithTargetLine => '目标线可装长度';

  @override
  String get backingCalculation => 'Backing 计算';

  @override
  String get backingNeeded => '所需 Backing';

  @override
  String get sinkerWeightOz => '铅坠重量 (oz)';

  @override
  String get rodLength => '竿长 (ft)';

  @override
  String get extraWraps => '轮上额外圈数';

  @override
  String get shockLeaderSpecs => '冲击前导线参数';

  @override
  String get range => '范围';

  @override
  String get length => '长度';

  @override
  String get approxDiameter => '近似线径';

  @override
  String get current => '水流';

  @override
  String get waves => '浪况';

  @override
  String get targetDistance => '目标距离';

  @override
  String get bottomType => '海底类型';

  @override
  String get recommendedSinker => '推荐铅坠';

  @override
  String get type => '类型';

  @override
  String get knotsRigsScreen => '绳结与钓组';

  @override
  String get knots => '绳结';

  @override
  String get rigs => '钓组';

  @override
  String get all => '全部';

  @override
  String get terminal => '末端连接';

  @override
  String get lineToLine => '线对线';

  @override
  String get loop => '打环';

  @override
  String get strength => '强度';

  @override
  String get bestFor => '最佳用途';

  @override
  String get assembly => '组装步骤';

  @override
  String get components => '所需组件';

  @override
  String get targetSpecies => '目标鱼种';

  @override
  String get speciesGuide => '鱼种图鉴';

  @override
  String get searchSpecies => '搜索鱼种...';

  @override
  String get gamefish => '运动鱼';

  @override
  String get panfish => '食用鱼';

  @override
  String get shark => '鲨鱼';

  @override
  String get identification => '识别特征';

  @override
  String get habitatBehavior => '栖息地与习性';

  @override
  String get gearRecommendation => '装备建议';

  @override
  String get bestBait => '最佳饵料';

  @override
  String get seasonalPattern => '季节规律';

  @override
  String get size => '体型';

  @override
  String get common => '常见';

  @override
  String get trophy => '纪录级';

  @override
  String get regulations => '法规参考';

  @override
  String configureGearFor(String species) {
    return '为 $species 配置装备';
  }

  @override
  String get wishlistScreen => '装备愿望单';

  @override
  String get wishlistEmpty => '愿望单为空';

  @override
  String get planUpgrades => '在此规划你的装备升级';

  @override
  String get addFirstItem => '添加第一个';

  @override
  String get addToWishlist => '添加到愿望单';

  @override
  String get itemName => '物品名称';

  @override
  String get estimatedPrice => '预估价格';

  @override
  String get category => '类别';

  @override
  String get priority => '优先级';

  @override
  String get high => '高';

  @override
  String get medium => '中';

  @override
  String get low => '低';

  @override
  String get totalPlanned => '计划总额';

  @override
  String itemsOnWishlist(int count) {
    return '愿望单 $count 项';
  }

  @override
  String get highPriority => '高优先级';

  @override
  String get mediumPriority => '中优先级';

  @override
  String get lowPriority => '低优先级';

  @override
  String get goScore => '出行评分';

  @override
  String get bestWindow => '最佳时段';

  @override
  String get hourlyScore => '逐时评分';

  @override
  String get scoreFactors => '评分因素';

  @override
  String get excellent => '极佳';

  @override
  String get good => '良好';

  @override
  String get fair => '一般';

  @override
  String get poor => '较差';

  @override
  String get veryPoor => '很差';

  @override
  String get solunar => '日月活跃';

  @override
  String get moonPhase => '月相';

  @override
  String get light => '光照';

  @override
  String get tripChecklist => '出行清单';

  @override
  String packed(int done, int total) {
    return '$done / $total 已打包';
  }

  @override
  String get allPackedGoFish => '全部就绪 — 出发钓鱼！';

  @override
  String get general => '通用';

  @override
  String get nightFishing => '夜钓';

  @override
  String get longCast => '远投';

  @override
  String get sharks => '鲨鱼';

  @override
  String get lightTackle => '轻装';

  @override
  String get castTracker => '抛投追踪';

  @override
  String get trackCastingDistance => '追踪你的抛投距离';

  @override
  String get recordDistanceProgress => '记录距离，衡量进步';

  @override
  String get startFirstSession => '开始第一次训练';

  @override
  String get newSession => '新建训练';

  @override
  String get yourStats => '你的数据';

  @override
  String get personalBest => '个人最远';

  @override
  String get average => '平均';

  @override
  String get recentAvg => '近期平均';

  @override
  String get sessions => '训练次数';

  @override
  String get totalCasts => '总抛投数';

  @override
  String get improvement => '进步';

  @override
  String get bestSetup => '最佳装备';

  @override
  String get bestDistanceTrend => '最远距离趋势';

  @override
  String get newCastingSession => '新训练';

  @override
  String get location => '位置';

  @override
  String get gearSetup => '装备组合';

  @override
  String get casts => '抛投';

  @override
  String get best => '最远';

  @override
  String get recordCast => '记录抛投';

  @override
  String get distance => '距离（米）';

  @override
  String get wind => '风向';

  @override
  String get record => '记录';

  @override
  String get save => '保存';

  @override
  String get sessionSummary => '训练概要';

  @override
  String get allCasts => '所有抛投';

  @override
  String get catchLog => '渔获日志';

  @override
  String get log => '日志';

  @override
  String get stats => '统计';

  @override
  String get noCatchesYet => '暂无渔获';

  @override
  String get recordFirstCatch => '点击 + 按钮记录你的第一条鱼';

  @override
  String get logCatch => '记录渔获';

  @override
  String get species => '鱼种';

  @override
  String get weight => '重量';

  @override
  String get lengthLabel => '长度';

  @override
  String get bait => '饵料';

  @override
  String get rigType => '钓组类型';

  @override
  String get tideState => '潮汐状态';

  @override
  String get rising => '涨潮';

  @override
  String get falling => '落潮';

  @override
  String get highTide => '满潮';

  @override
  String get lowTide => '低潮';

  @override
  String get slack => '平潮';

  @override
  String get released => '放流';

  @override
  String get kept => '保留';

  @override
  String get releasedSafely => '鱼已安全放流';

  @override
  String get fishKept => '鱼已保留';

  @override
  String get saveCatch => '保存渔获';

  @override
  String get totalCatches => '总渔获数';

  @override
  String get biggest => '最大';

  @override
  String get speciesCaught => '钓获鱼种';

  @override
  String get bestBaitStats => '最佳饵料';

  @override
  String get deleteCatch => '删除渔获？';

  @override
  String removeCatchConfirm(String species, String date) {
    return '删除 $date 钓获的 $species？';
  }

  @override
  String get recordCatchesToSeeStats => '记录渔获后可查看统计';

  @override
  String get backupRestore => '备份与恢复';

  @override
  String get dataOverview => '数据概览';

  @override
  String get createBackup => '创建备份';

  @override
  String get selectDataToBackup => '选择要包含在备份中的数据：';

  @override
  String get selectAll => '全选';

  @override
  String get clearAll => '清除';

  @override
  String get createShareBackup => '创建并分享备份';

  @override
  String get restoreFromBackup => '从备份恢复';

  @override
  String get selectBackupFile => '选择备份文件 (.gcbak)';

  @override
  String get selectBackupFileDesc => '选择一个 .gcbak 备份文件来恢复数据。';

  @override
  String get howItWorks => '使用说明';

  @override
  String get backupInfo1 => '备份将创建包含所选数据的 .gcbak 文件';

  @override
  String get backupInfo2 => '使用系统分享面板保存到 iCloud、Google Drive 或文件 App';

  @override
  String get backupInfo3 => '恢复将用备份替换当前数据——此操作不可撤销';

  @override
  String get backupInfo4 => '恢复后请重启应用以使更改生效';

  @override
  String get backupInfo5 => '备份完全离线——无需网络';

  @override
  String get backupCreated => '备份已创建！';

  @override
  String get backupReady => '备份已准备就绪。';

  @override
  String get modules => '模块';

  @override
  String get share => '分享';

  @override
  String get close => '关闭';

  @override
  String get backupFailed => '备份失败';

  @override
  String get restoreBackup => '恢复备份？';

  @override
  String get restoreWarning => '这将用备份替换你的当前数据。';

  @override
  String get cannotBeUndone => '此操作不可撤销。恢复后请重启应用。';

  @override
  String get restore => '恢复';

  @override
  String get restoreComplete => '恢复完成！';

  @override
  String get restoreSuccess => '数据已成功恢复。\n\n请重启应用以使所有更改生效。';

  @override
  String get restoreFailed => '恢复失败';

  @override
  String get invalidBackupFile => '这不是有效的 GoCasting 备份文件';

  @override
  String get gearInventory => '装备库存';

  @override
  String get usageLogs => '使用记录';

  @override
  String get maintenanceRecords => '维护记录';

  @override
  String get warranties => '保修信息';

  @override
  String get serviceRecords => '维修记录';

  @override
  String get photosReceipts => '照片与收据';

  @override
  String get settingsBeaches => '设置与海滩';

  @override
  String get dataReports => '数据与报告';

  @override
  String get cancel => '取消';

  @override
  String get delete => '删除';

  @override
  String get confirm => '确认';

  @override
  String get done => '完成';

  @override
  String get ok => '好的';

  @override
  String get error => '错误';

  @override
  String get success => '成功';

  @override
  String get loading => '加载中...';

  @override
  String get comingSoon => '即将推出';

  @override
  String get funHub => '趣味工坊';

  @override
  String get dailyFortune => '今日钓鱼运势';

  @override
  String get personalityTest => '钓鱼人格测试';

  @override
  String get shareFortune => '分享今日运势';

  @override
  String get sharePersonality => '分享我的钓鱼人格';

  @override
  String get retakeTest => '重新测试';

  @override
  String get moreFun => '更多趣味';

  @override
  String get shareHeatmap => '分享热力图';

  @override
  String get shareProfileCard => '分享名片';

  @override
  String get shareFunStats => '分享趣味统计';

  @override
  String get shareAnnualReport => '分享我的年度报告';

  @override
  String get achievements => '成就';

  @override
  String get catchAnalysis => '渔获分析';

  @override
  String get spotMap => '钓点地图';

  @override
  String get addSpot => '添加钓点';

  @override
  String get addSpotBtn => '添加';

  @override
  String get nearbySearch => '周边搜索';

  @override
  String get weatherTitle => '天气';

  @override
  String get challenges => '个人挑战';

  @override
  String get setFishingGoals => '设定你的钓鱼目标';

  @override
  String get create => '创建';

  @override
  String nDays(int count) {
    return '$count 天';
  }

  @override
  String get annualReport => '年度报告';

  @override
  String get achievementsAndLevel => '成就与等级';

  @override
  String get achievementsDesc => '查看你的钓鱼成就和等级';

  @override
  String get challengesDesc => '设定目标，追踪进度';

  @override
  String get annualReportDesc => '你的年度钓鱼总结';

  @override
  String get funHubDesc => '运势、人格测试、更多好玩功能';

  @override
  String get insuranceDesc => '导出装备估值用于保险';

  @override
  String get switchRole => '切换角色';

  @override
  String get shareBtn => '分享';

  @override
  String get noMatchingRods => '未找到匹配的鱼竿';

  @override
  String get noMatchingReels => '未找到匹配的渔轮';

  @override
  String get compare => '对比';

  @override
  String get addPriceForValuation => '添加购买价格和日期以查看估值';

  @override
  String get autoFollowSystem => '自动跟随系统语言';
}
