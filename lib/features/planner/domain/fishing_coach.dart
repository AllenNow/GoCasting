// AI 钓况教练（本地规则引擎）
//
// 基于用户历史数据和当前条件，生成个性化建议文案。
// 不是真 AI，而是精心设计的规则模板，给用户"智能助手"的体验。

import '../../catch_log/domain/catch_analysis.dart';
import '../../../core/database/user_db.dart';

/// 教练建议
class CoachAdvice {
  const CoachAdvice({
    required this.emoji,
    required this.title,
    required this.body,
    required this.category,
    this.actionLabel,
    this.actionRoute,
  });

  final String emoji;
  final String title;
  final String body;
  final AdviceCategory category;
  final String? actionLabel; // 可选操作按钮文本
  final String? actionRoute; // 可选操作跳转路由
}

enum AdviceCategory {
  timing('时机', '🕐'),
  bait('饵料', '🎣'),
  gear('装备', '🔧'),
  spot('钓点', '📍'),
  skill('技巧', '💡'),
  maintenance('维护', '⚠️');

  const AdviceCategory(this.label, this.emoji);
  final String label;
  final String emoji;
}

/// 钓况教练引擎
class FishingCoachEngine {
  const FishingCoachEngine();

  /// 生成今日建议列表（基于已有数据）
  List<CoachAdvice> generateAdvice({
    required List<CatchLog> recentCatches,
    required CatchAnalysisResult? analysis,
    required int pendingMaintenanceCount,
    required int goScore,
    String? bestTideState,
    String? bestTimePeriod,
    String? bestBait,
    String? bestRig,
  }) {
    final advice = <CoachAdvice>[];

    // === 1. 基于 Go-Score 的时机建议 ===
    if (goScore >= 70) {
      advice.add(CoachAdvice(
        emoji: '🌟',
        title: '今天适合出钓！',
        body: '今日 Go-Score $goScore/100，条件良好。抓住机会出发吧！',
        category: AdviceCategory.timing,
      ));
    } else if (goScore <= 30) {
      advice.add(const CoachAdvice(
        emoji: '⏸️',
        title: '今天不太适合',
        body: '条件评分较低，建议在家整理装备或练习打结。明天看看评分如何。',
        category: AdviceCategory.timing,
      ));
    }

    // === 2. 基于渔获分析的饵料建议 ===
    if (bestBait != null) {
      advice.add(CoachAdvice(
        emoji: '🎣',
        title: '推荐饵料：$bestBait',
        body: '根据你的历史数据，使用「$bestBait」时渔获率最高。带上它！',
        category: AdviceCategory.bait,
      ));
    }

    // === 3. 基于渔获分析的潮汐建议 ===
    if (bestTideState != null) {
      final tideName = _tideLabel(bestTideState);
      advice.add(CoachAdvice(
        emoji: '🌊',
        title: '瞄准$tideName时段',
        body: '你的数据显示，$tideName时钓获率最高。规划出行时间配合潮汐转换。',
        category: AdviceCategory.timing,
      ));
    }

    // === 4. 基于渔获分析的时段建议 ===
    if (bestTimePeriod != null) {
      advice.add(CoachAdvice(
        emoji: '⏰',
        title: '黄金时段：$bestTimePeriod',
        body: '从你的渔获记录看，$bestTimePeriod 是你最丰收的时间段。',
        category: AdviceCategory.timing,
      ));
    }

    // === 5. 基于渔获分析的钓组建议 ===
    if (bestRig != null) {
      advice.add(CoachAdvice(
        emoji: '🔗',
        title: '今天试试 $bestRig',
        body: '这是你历史成功率最高的钓组配置。',
        category: AdviceCategory.gear,
        actionLabel: '查看钓组指南',
        actionRoute: '/gear/knots-rigs',
      ));
    }

    // === 6. 维护提醒 ===
    if (pendingMaintenanceCount > 0) {
      advice.add(CoachAdvice(
        emoji: '⚠️',
        title: '有 $pendingMaintenanceCount 件装备待维护',
        body: '出钓前确保装备状态良好。维护不及时可能导致关键时刻掉链子！',
        category: AdviceCategory.maintenance,
        actionLabel: '查看维护',
        actionRoute: '/maintenance',
      ));
    }

    // === 7. 渔获为空时的鼓励 ===
    if (recentCatches.isEmpty) {
      advice.add(const CoachAdvice(
        emoji: '💪',
        title: '开始记录你的渔获',
        body: '记录越多，我能给你的建议就越精准。每次钓到鱼记得录入！',
        category: AdviceCategory.skill,
        actionLabel: '记录渔获',
        actionRoute: '/catch-log',
      ));
    }

    // === 8. 数据量充足时的进阶建议 ===
    if (recentCatches.length >= 20) {
      final releasedRate = recentCatches.where((c) => c.released).length / recentCatches.length;
      if (releasedRate >= 0.8) {
        advice.add(const CoachAdvice(
          emoji: '🌱',
          title: '环保先锋！',
          body: '你的放流率超过 80%，是负责任的钓手。继续保持！',
          category: AdviceCategory.skill,
        ));
      }
    }

    // === 9. 通用技巧建议（随机轮换）===
    final tipIndex = DateTime.now().day % _dailyTips.length;
    advice.add(_dailyTips[tipIndex]);

    return advice;
  }

  String _tideLabel(String tide) => switch (tide) {
        'rising' => '涨潮',
        'falling' => '落潮',
        'high' => '满潮',
        'low' => '低潮',
        'slack' => '平潮',
        _ => tide,
      };

  static const _dailyTips = [
    CoachAdvice(emoji: '💡', title: '远投小贴士', body: '铅坠出手瞬间食指松线时机决定距离。试试提前 0.5 秒松线，感受弧度变化。', category: AdviceCategory.skill),
    CoachAdvice(emoji: '💡', title: '海水温度', body: '鱼类在 15-22°C 水温最活跃。水温骤降后 2-3 天内通常咬口很差。', category: AdviceCategory.timing),
    CoachAdvice(emoji: '💡', title: '观察海鸟', body: '海鸟扎堆的地方通常有饵鱼群。饵鱼在哪，大鱼就在哪。', category: AdviceCategory.spot),
    CoachAdvice(emoji: '💡', title: '前导线长度', body: '清水用长前导（90-120cm），浑水可以短一些（45-60cm）。', category: AdviceCategory.gear),
    CoachAdvice(emoji: '💡', title: '潮汐转换', body: '涨落潮转换的前后 1.5 小时是黄金窗口——水流变化搅动食物链。', category: AdviceCategory.timing),
    CoachAdvice(emoji: '💡', title: '月相影响', body: '满月和新月前后 3 天鱼类最活跃——引力最强，潮差最大。', category: AdviceCategory.timing),
    CoachAdvice(emoji: '💡', title: '盐水装备保养', body: '每次出海回来先松开拖力再冲淡水，防止盐渍固化拖力垫片。', category: AdviceCategory.maintenance),
    CoachAdvice(emoji: '💡', title: '饵料新鲜度', body: '新鲜饵 > 冷冻饵。如果用冷冻饵，出行前一晚放到冰箱冷藏层自然解冻。', category: AdviceCategory.bait),
    CoachAdvice(emoji: '💡', title: '读懂海滩', body: '看浪花形态：平缓白浪 = 浅滩沙洲；深色无浪区 = 深沟（鱼的高速公路）。', category: AdviceCategory.spot),
    CoachAdvice(emoji: '💡', title: '打结前润湿', body: '任何绳结收紧前先用口水润湿！干线摩擦产热会降低 30%+ 强度。', category: AdviceCategory.skill),
  ];
}
