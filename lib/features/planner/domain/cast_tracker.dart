// 抛投距离追踪器
//
// 记录每次练习/出行的抛投距离，关联装备组合和条件，
// 分析进步趋势，找出最佳装备/条件组合。

/// 单次抛投记录
class CastRecord {
  CastRecord({
    required this.id,
    required this.date,
    required this.distanceM,
    this.gearSetup,
    this.sinkerWeightOz,
    this.windDirection,
    this.windStrength,
    this.notes,
  });

  final String id;
  final DateTime date;
  final double distanceM; // 米
  String? gearSetup; // 装备组合描述
  double? sinkerWeightOz;
  WindDirection? windDirection;
  WindStrength? windStrength;
  String? notes;

  double get distanceYds => distanceM * 1.09361;
}

/// 训练/出行会话
class CastSession {
  CastSession({
    required this.id,
    required this.date,
    required this.casts,
    this.location,
    this.gearSetup,
  });

  final String id;
  final DateTime date;
  final List<CastRecord> casts;
  String? location;
  String? gearSetup;

  double get bestM => casts.isEmpty ? 0 : casts.map((c) => c.distanceM).reduce((a, b) => a > b ? a : b);
  double get averageM => casts.isEmpty ? 0 : casts.map((c) => c.distanceM).reduce((a, b) => a + b) / casts.length;
  int get castCount => casts.length;
}

/// 进步统计
class CastStats {
  const CastStats({
    required this.totalSessions,
    required this.totalCasts,
    required this.personalBestM,
    required this.averageM,
    required this.recentAverageM,
    required this.improvementPercent,
    this.bestGearSetup,
    this.bestConditions,
  });

  final int totalSessions;
  final int totalCasts;
  final double personalBestM;
  final double averageM; // 全部平均
  final double recentAverageM; // 最近 5 次会话平均
  final double improvementPercent; // 相对首次会话的进步百分比
  final String? bestGearSetup;
  final String? bestConditions;
}

/// 抛投统计计算器
class CastStatsCalculator {
  const CastStatsCalculator();

  /// 计算统计数据
  CastStats calculate(List<CastSession> sessions) {
    if (sessions.isEmpty) {
      return const CastStats(
        totalSessions: 0, totalCasts: 0, personalBestM: 0,
        averageM: 0, recentAverageM: 0, improvementPercent: 0,
      );
    }

    final sorted = List<CastSession>.from(sessions)..sort((a, b) => a.date.compareTo(b.date));
    final allCasts = sorted.expand((s) => s.casts).toList();

    final totalCasts = allCasts.length;
    final personalBest = allCasts.isEmpty ? 0.0 : allCasts.map((c) => c.distanceM).reduce((a, b) => a > b ? a : b);
    final average = allCasts.isEmpty ? 0.0 : allCasts.map((c) => c.distanceM).reduce((a, b) => a + b) / totalCasts;

    // 最近 5 次会话平均
    final recentSessions = sorted.length > 5 ? sorted.sublist(sorted.length - 5) : sorted;
    final recentCasts = recentSessions.expand((s) => s.casts).toList();
    final recentAvg = recentCasts.isEmpty ? 0.0 : recentCasts.map((c) => c.distanceM).reduce((a, b) => a + b) / recentCasts.length;

    // 进步百分比（首次会话平均 vs 最近 5 次平均）
    final firstSession = sorted.first;
    final firstAvg = firstSession.averageM;
    final improvement = firstAvg > 0 ? ((recentAvg - firstAvg) / firstAvg * 100) : 0.0;

    // 最佳装备组合
    String? bestGear;
    if (allCasts.isNotEmpty) {
      final gearGroups = <String, List<double>>{};
      for (final c in allCasts) {
        if (c.gearSetup != null && c.gearSetup!.isNotEmpty) {
          gearGroups.putIfAbsent(c.gearSetup!, () => []).add(c.distanceM);
        }
      }
      if (gearGroups.isNotEmpty) {
        var bestAvg = 0.0;
        for (final entry in gearGroups.entries) {
          final avg = entry.value.reduce((a, b) => a + b) / entry.value.length;
          if (avg > bestAvg) {
            bestAvg = avg;
            bestGear = entry.key;
          }
        }
      }
    }

    return CastStats(
      totalSessions: sorted.length,
      totalCasts: totalCasts,
      personalBestM: personalBest,
      averageM: average,
      recentAverageM: recentAvg,
      improvementPercent: improvement,
      bestGearSetup: bestGear,
    );
  }
}

enum WindDirection {
  headwind('Headwind', '迎风'),
  tailwind('Tailwind', '顺风'),
  crossLeft('Cross Left', '左侧风'),
  crossRight('Cross Right', '右侧风'),
  none('None', '无风');

  const WindDirection(this.label, this.labelZh);
  final String label;
  final String labelZh;
}

enum WindStrength {
  calm('Calm', '0-5 km/h'),
  light('Light', '5-15 km/h'),
  moderate('Moderate', '15-30 km/h'),
  strong('Strong', '30-50 km/h'),
  gale('Gale', '50+ km/h');

  const WindStrength(this.label, this.description);
  final String label;
  final String description;
}
