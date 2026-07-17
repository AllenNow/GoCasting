// 渔获条件关联分析引擎
//
// 分析历史渔获数据，找出什么条件组合下钓到最多鱼。
// 全部本地计算，无需网络。

import '../../../core/database/user_db.dart';

/// 分析结果总览
class CatchAnalysisResult {
  const CatchAnalysisResult({
    required this.totalCatches,
    required this.tideAnalysis,
    required this.timeAnalysis,
    required this.baitAnalysis,
    required this.rigAnalysis,
    required this.locationAnalysis,
    required this.speciesAnalysis,
    required this.insights,
  });

  final int totalCatches;
  final List<ConditionStat> tideAnalysis; // 潮汐 → 渔获数
  final List<ConditionStat> timeAnalysis; // 时段 → 渔获数
  final List<ConditionStat> baitAnalysis; // 饵料 → 渔获数
  final List<ConditionStat> rigAnalysis; // 钓组 → 渔获数
  final List<ConditionStat> locationAnalysis; // 地点 → 渔获数
  final List<ConditionStat> speciesAnalysis; // 鱼种 → 渔获数
  final List<Insight> insights; // AI 洞察（本地生成）
}

/// 单个条件的统计
class ConditionStat {
  const ConditionStat({
    required this.label,
    required this.count,
    required this.percent,
    this.avgWeight,
  });

  final String label;
  final int count;
  final double percent; // 占比 0-100
  final double? avgWeight; // 平均重量（如有）
}

/// 洞察卡片
class Insight {
  const Insight({
    required this.icon,
    required this.title,
    required this.description,
    required this.confidence,
  });

  final String icon; // emoji
  final String title;
  final String description;
  final InsightConfidence confidence;
}

enum InsightConfidence {
  high('高可信度', '基于 10+ 条数据'),
  medium('中可信度', '基于 5-10 条数据'),
  low('参考性', '数据量较少，仅供参考');

  const InsightConfidence(this.label, this.description);
  final String label;
  final String description;
}

/// 分析引擎
class CatchAnalysisEngine {
  const CatchAnalysisEngine();

  /// 执行完整分析
  CatchAnalysisResult analyze(List<CatchLog> catches) {
    if (catches.isEmpty) {
      return const CatchAnalysisResult(
        totalCatches: 0,
        tideAnalysis: [],
        timeAnalysis: [],
        baitAnalysis: [],
        rigAnalysis: [],
        locationAnalysis: [],
        speciesAnalysis: [],
        insights: [],
      );
    }

    final tideStats = _analyzeTide(catches);
    final timeStats = _analyzeTime(catches);
    final baitStats = _analyzeBait(catches);
    final rigStats = _analyzeRig(catches);
    final locationStats = _analyzeLocation(catches);
    final speciesStats = _analyzeSpecies(catches);
    final insights = _generateInsights(catches, tideStats, timeStats, baitStats, rigStats);

    return CatchAnalysisResult(
      totalCatches: catches.length,
      tideAnalysis: tideStats,
      timeAnalysis: timeStats,
      baitAnalysis: baitStats,
      rigAnalysis: rigStats,
      locationAnalysis: locationStats,
      speciesAnalysis: speciesStats,
      insights: insights,
    );
  }

  /// 潮汐条件分析
  List<ConditionStat> _analyzeTide(List<CatchLog> catches) {
    final groups = <String, List<CatchLog>>{};
    for (final c in catches) {
      final tide = c.tideState ?? 'unknown';
      groups.putIfAbsent(tide, () => []).add(c);
    }
    return _toStats(groups, catches.length);
  }

  /// 时段分析（按小时分组为时段）
  List<ConditionStat> _analyzeTime(List<CatchLog> catches) {
    final groups = <String, List<CatchLog>>{};
    for (final c in catches) {
      final period = _timeToPeriod(c.time);
      groups.putIfAbsent(period, () => []).add(c);
    }
    return _toStats(groups, catches.length);
  }

  /// 饵料分析
  List<ConditionStat> _analyzeBait(List<CatchLog> catches) {
    final groups = <String, List<CatchLog>>{};
    for (final c in catches) {
      if (c.bait != null && c.bait!.isNotEmpty) {
        groups.putIfAbsent(c.bait!, () => []).add(c);
      }
    }
    return _toStats(groups, catches.length);
  }

  /// 钓组分析
  List<ConditionStat> _analyzeRig(List<CatchLog> catches) {
    final groups = <String, List<CatchLog>>{};
    for (final c in catches) {
      if (c.rigType != null && c.rigType!.isNotEmpty) {
        groups.putIfAbsent(c.rigType!, () => []).add(c);
      }
    }
    return _toStats(groups, catches.length);
  }

  /// 地点分析
  List<ConditionStat> _analyzeLocation(List<CatchLog> catches) {
    final groups = <String, List<CatchLog>>{};
    for (final c in catches) {
      if (c.location != null && c.location!.isNotEmpty) {
        groups.putIfAbsent(c.location!, () => []).add(c);
      }
    }
    return _toStats(groups, catches.length);
  }

  /// 鱼种分析
  List<ConditionStat> _analyzeSpecies(List<CatchLog> catches) {
    final groups = <String, List<CatchLog>>{};
    for (final c in catches) {
      groups.putIfAbsent(c.species, () => []).add(c);
    }
    return _toStats(groups, catches.length);
  }

  /// 生成洞察
  List<Insight> _generateInsights(
    List<CatchLog> catches,
    List<ConditionStat> tideStats,
    List<ConditionStat> timeStats,
    List<ConditionStat> baitStats,
    List<ConditionStat> rigStats,
  ) {
    final insights = <Insight>[];

    // 洞察 1: 最佳潮汐
    if (tideStats.isNotEmpty) {
      final best = tideStats.first;
      if (best.count >= 3) {
        final tideName = _tideLabel(best.label);
        insights.add(Insight(
          icon: '🌊',
          title: '最佳潮汐：$tideName',
          description: '你在$tideName时钓到了 ${best.count} 条鱼（${best.percent.toStringAsFixed(0)}%），是最高效的潮汐时段。',
          confidence: best.count >= 10 ? InsightConfidence.high : best.count >= 5 ? InsightConfidence.medium : InsightConfidence.low,
        ));
      }
    }

    // 洞察 2: 最佳时段
    if (timeStats.isNotEmpty) {
      final best = timeStats.first;
      if (best.count >= 3) {
        insights.add(Insight(
          icon: '⏰',
          title: '黄金时段：${best.label}',
          description: '${best.label}是你钓获最多的时段（${best.count} 条，占 ${best.percent.toStringAsFixed(0)}%）。',
          confidence: best.count >= 10 ? InsightConfidence.high : best.count >= 5 ? InsightConfidence.medium : InsightConfidence.low,
        ));
      }
    }

    // 洞察 3: 最佳饵料
    if (baitStats.isNotEmpty) {
      final best = baitStats.first;
      if (best.count >= 3) {
        insights.add(Insight(
          icon: '🎣',
          title: '王牌饵料：${best.label}',
          description: '使用「${best.label}」时钓到了 ${best.count} 条鱼，是你最成功的饵料选择。',
          confidence: best.count >= 10 ? InsightConfidence.high : best.count >= 5 ? InsightConfidence.medium : InsightConfidence.low,
        ));
      }
    }

    // 洞察 4: 最佳钓组
    if (rigStats.isNotEmpty) {
      final best = rigStats.first;
      if (best.count >= 3) {
        insights.add(Insight(
          icon: '🔗',
          title: '最佳钓组：${best.label}',
          description: '${best.label} 钓组为你带来了 ${best.count} 条渔获，效率最高。',
          confidence: best.count >= 10 ? InsightConfidence.high : best.count >= 5 ? InsightConfidence.medium : InsightConfidence.low,
        ));
      }
    }

    // 洞察 5: 放流率
    final releasedCount = catches.where((c) => c.released).length;
    final releaseRate = releasedCount / catches.length * 100;
    insights.add(Insight(
      icon: '♻️',
      title: '放流率 ${releaseRate.toStringAsFixed(0)}%',
      description: '${catches.length} 条渔获中你放流了 $releasedCount 条。${releaseRate >= 80 ? '优秀的环保意识！' : releaseRate >= 50 ? '保持良好的可持续钓鱼习惯。' : ''}',
      confidence: InsightConfidence.high,
    ));

    // 洞察 6: 平均重量趋势（如果有重量数据）
    final withWeight = catches.where((c) => c.weightLb != null).toList();
    if (withWeight.length >= 5) {
      final avgWeight = withWeight.map((c) => c.weightLb!).reduce((a, b) => a + b) / withWeight.length;
      final recentWithWeight = withWeight.take(5).toList();
      final recentAvg = recentWithWeight.map((c) => c.weightLb!).reduce((a, b) => a + b) / recentWithWeight.length;
      final trend = recentAvg > avgWeight ? '上升' : recentAvg < avgWeight * 0.9 ? '下降' : '稳定';
      insights.add(Insight(
        icon: '📈',
        title: '渔获体型趋势：$trend',
        description: '平均重量 ${avgWeight.toStringAsFixed(1)} lb，近期 ${recentAvg.toStringAsFixed(1)} lb。',
        confidence: withWeight.length >= 10 ? InsightConfidence.high : InsightConfidence.medium,
      ));
    }

    return insights;
  }

  /// 时间字符串转时段名称
  String _timeToPeriod(String? time) {
    if (time == null || time.isEmpty) return '未记录';
    final hour = int.tryParse(time.split(':').first) ?? 12;
    if (hour >= 4 && hour < 7) return '清晨 (4-7)';
    if (hour >= 7 && hour < 10) return '早上 (7-10)';
    if (hour >= 10 && hour < 14) return '中午 (10-14)';
    if (hour >= 14 && hour < 17) return '下午 (14-17)';
    if (hour >= 17 && hour < 20) return '傍晚 (17-20)';
    return '夜间 (20-4)';
  }

  /// 潮汐 ID 转名称
  String _tideLabel(String tide) => switch (tide) {
        'rising' => '涨潮',
        'falling' => '落潮',
        'high' => '满潮',
        'low' => '低潮',
        'slack' => '平潮',
        _ => '未记录',
      };

  /// 将分组数据转为统计列表（按数量降序）
  List<ConditionStat> _toStats(Map<String, List<CatchLog>> groups, int total) {
    final stats = groups.entries.map((e) {
      final withWeight = e.value.where((c) => c.weightLb != null);
      final avgW = withWeight.isNotEmpty
          ? withWeight.map((c) => c.weightLb!).reduce((a, b) => a + b) / withWeight.length
          : null;
      return ConditionStat(
        label: e.key,
        count: e.value.length,
        percent: e.value.length / total * 100,
        avgWeight: avgW,
      );
    }).toList();
    stats.sort((a, b) => b.count.compareTo(a.count));
    return stats;
  }
}
