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
}
