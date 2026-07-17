import 'dart:math';

import 'astronomy.dart';
import 'tide_predictor.dart';

// Go-Score 钓鱼条件评分引擎
//
// 综合潮汐、月相、日月活跃期、日出日落等数据，
// 为每个时段输出 0-100 的评分，帮助用户判断"什么时候去最好"。

/// 单个时段的评分结果
class TimeSlotScore {
  const TimeSlotScore({
    required this.start,
    required this.end,
    required this.score,
    required this.factors,
  });

  final DateTime start;
  final DateTime end;
  final int score; // 0-100
  final List<ScoreFactor> factors;

  String get label {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  }
}

/// 评分因素明细
class ScoreFactor {
  const ScoreFactor({
    required this.name,
    required this.points,
    required this.maxPoints,
    required this.description,
  });

  final String name;
  final int points; // 该因素得分
  final int maxPoints; // 该因素满分
  final String description;
}

/// 一天的 Go-Score 结果
class DailyGoScore {
  const DailyGoScore({
    required this.date,
    required this.overallScore,
    required this.bestWindow,
    required this.hourlyScores,
    required this.factors,
  });

  final DateTime date;
  final int overallScore; // 0-100，全天最高分
  final TimeSlotScore? bestWindow; // 最佳时段
  final List<TimeSlotScore> hourlyScores; // 24 小时逐时评分
  final List<ScoreFactor> factors; // 全天评分因素汇总

  String get label {
    if (overallScore >= 80) return 'Excellent';
    if (overallScore >= 60) return 'Good';
    if (overallScore >= 40) return 'Fair';
    if (overallScore >= 20) return 'Poor';
    return 'Very Poor';
  }
}

/// Go-Score 评分引擎
class GoScoreEngine {
  const GoScoreEngine();

  static const _astronomy = Astronomy();

  /// 计算某一天的完整 Go-Score
  DailyGoScore calculateDaily({
    required DateTime date,
    required double lat,
    required double lon,
    TidePrediction? tidePrediction,
  }) {
    final moon = _astronomy.getMoonPhase(date);
    final sun = _astronomy.getSunTimes(date, lat, lon);
    final solunar = _astronomy.getSolunarPeriods(date, lat, lon);

    // 逐小时计算评分
    final hourlyScores = <TimeSlotScore>[];
    for (int hour = 0; hour < 24; hour++) {
      final slotStart = DateTime(date.year, date.month, date.day, hour);
      final slotEnd = slotStart.add(const Duration(hours: 1));
      final score = _scoreTimeSlot(
        slotStart: slotStart,
        slotEnd: slotEnd,
        moon: moon,
        sun: sun,
        solunar: solunar,
        tidePrediction: tidePrediction,
      );
      hourlyScores.add(score);
    }

    // 找最佳时段（连续最高分）
    final bestWindow = _findBestWindow(hourlyScores);

    // 全天最高分
    final overallScore = hourlyScores.isEmpty
        ? 0
        : hourlyScores.map((s) => s.score).reduce(max);

    // 全天因素汇总
    final dailyFactors = _computeDailyFactors(moon, sun, solunar, tidePrediction);

    return DailyGoScore(
      date: date,
      overallScore: overallScore,
      bestWindow: bestWindow,
      hourlyScores: hourlyScores,
      factors: dailyFactors,
    );
  }

  /// 计算 7 天的 Go-Score 列表（用于热力日历）
  List<DailyGoScore> calculateWeek({
    required DateTime startDate,
    required double lat,
    required double lon,
  }) {
    final scores = <DailyGoScore>[];
    for (int i = 0; i < 7; i++) {
      final date = startDate.add(Duration(days: i));
      scores.add(calculateDaily(date: date, lat: lat, lon: lon));
    }
    return scores;
  }

  /// 计算 30 天的 Go-Score 列表（用于月历视图）
  List<DailyGoScore> calculateMonth({
    required DateTime startDate,
    required double lat,
    required double lon,
  }) {
    final scores = <DailyGoScore>[];
    for (int i = 0; i < 30; i++) {
      final date = startDate.add(Duration(days: i));
      scores.add(calculateDaily(date: date, lat: lat, lon: lon));
    }
    return scores;
  }

  /// 评估单个时段的分数
  TimeSlotScore _scoreTimeSlot({
    required DateTime slotStart,
    required DateTime slotEnd,
    required MoonPhaseInfo moon,
    required SunTimes sun,
    required SolunarPeriods solunar,
    TidePrediction? tidePrediction,
  }) {
    final factors = <ScoreFactor>[];
    int totalScore = 0;

    // === 因素 1: 日月活跃期（最大 35 分）===
    final solunarScore = _scoreSolunar(slotStart, slotEnd, solunar);
    factors.add(solunarScore);
    totalScore += solunarScore.points;

    // === 因素 2: 潮汐转换（最大 25 分）===
    final tideScore = _scoreTideTransition(slotStart, tidePrediction);
    factors.add(tideScore);
    totalScore += tideScore.points;

    // === 因素 3: 月相（最大 20 分）===
    final moonScore = _scoreMoonPhase(moon);
    factors.add(moonScore);
    totalScore += moonScore.points;

    // === 因素 4: 光照条件/黄金时段（最大 20 分）===
    final lightScore = _scoreLightConditions(slotStart, sun);
    factors.add(lightScore);
    totalScore += lightScore.points;

    return TimeSlotScore(
      start: slotStart,
      end: slotEnd,
      score: totalScore.clamp(0, 100),
      factors: factors,
    );
  }

  /// 日月活跃期评分（满分 35）
  ScoreFactor _scoreSolunar(
      DateTime slotStart, DateTime slotEnd, SolunarPeriods solunar) {
    int points = 0;
    String desc = 'No solunar activity';

    // 检查是否在 Major Period 内
    for (final major in solunar.majorPeriods) {
      if (_periodsOverlap(slotStart, slotEnd, major.start, major.end)) {
        points = 35;
        desc = 'Major solunar period (${major.label})';
        break;
      }
    }

    // 检查是否在 Minor Period 内
    if (points == 0) {
      for (final minor in solunar.minorPeriods) {
        if (_periodsOverlap(slotStart, slotEnd, minor.start, minor.end)) {
          points = 20;
          desc = 'Minor solunar period (${minor.label})';
          break;
        }
      }
    }

    // 检查是否在 Major/Minor 前后 1 小时（过渡期也有价值）
    if (points == 0) {
      for (final major in solunar.majorPeriods) {
        final extStart = major.start.subtract(const Duration(hours: 1));
        final extEnd = major.end.add(const Duration(hours: 1));
        if (_periodsOverlap(slotStart, slotEnd, extStart, extEnd)) {
          points = 10;
          desc = 'Near major solunar period';
          break;
        }
      }
    }

    return ScoreFactor(
      name: 'Solunar',
      points: points,
      maxPoints: 35,
      description: desc,
    );
  }

  /// 潮汐转换评分（满分 25）
  ScoreFactor _scoreTideTransition(
      DateTime slotStart, TidePrediction? tidePrediction) {
    if (tidePrediction == null || tidePrediction.highLowTimes.isEmpty) {
      return const ScoreFactor(
        name: 'Tide',
        points: 10, // 无数据时给中间分
        maxPoints: 25,
        description: 'No tide data available',
      );
    }

    int points = 5; // 基础分
    String desc = 'Stable tide';

    // 潮汐转换时刻（高低潮前后 1.5 小时）是最佳时机
    for (final extreme in tidePrediction.highLowTimes) {
      final diffMinutes = slotStart.difference(extreme.time).inMinutes.abs();

      if (diffMinutes <= 90) {
        // 在转换窗口内（高低潮前后 1.5 小时）
        points = 25;
        final direction = extreme.isHigh ? 'high' : 'low';
        desc = 'Tide transition near $direction tide';
        break;
      } else if (diffMinutes <= 150) {
        // 在 2.5 小时内
        points = 15;
        desc = 'Approaching tide change';
      }
    }

    return ScoreFactor(
      name: 'Tide',
      points: points,
      maxPoints: 25,
      description: desc,
    );
  }

  /// 月相评分（满分 20）
  /// 满月/新月前后 ±3 天评分最高
  ScoreFactor _scoreMoonPhase(MoonPhaseInfo moon) {
    // phase: 0=新月, 0.5=满月
    // 新月和满月时引力最强，鱼类最活跃
    // 重新计算：离新月或满月越近分越高
    final newMoonDist = moon.phase < 0.5 ? moon.phase : (1.0 - moon.phase);
    final fullMoonDist = (moon.phase - 0.5).abs();
    final bestDist = min(newMoonDist, fullMoonDist);

    int points;
    String desc;

    if (bestDist <= 0.05) {
      // ±1.5 天内（新月或满月）
      points = 20;
      desc = '${moon.phaseName} — peak gravitational pull';
    } else if (bestDist <= 0.10) {
      // ±3 天
      points = 16;
      desc = '${moon.phaseName} — strong lunar influence';
    } else if (bestDist <= 0.18) {
      // ±5 天
      points = 10;
      desc = '${moon.phaseName} — moderate lunar influence';
    } else {
      // 上弦/下弦附近
      points = 5;
      desc = '${moon.phaseName} — weak lunar influence';
    }

    return ScoreFactor(
      name: 'Moon Phase',
      points: points,
      maxPoints: 20,
      description: desc,
    );
  }

  /// 光照条件评分（满分 20）
  /// 晨暮光、日出日落前后是钓鱼黄金时段
  ScoreFactor _scoreLightConditions(DateTime slotStart, SunTimes sun) {
    int points = 5; // 白天基础分
    String desc = 'Daytime';

    if (sun.sunrise == null || sun.sunset == null) {
      return ScoreFactor(
        name: 'Light',
        points: 8,
        maxPoints: 20,
        description: 'Sun data unavailable',
      );
    }

    final hour = slotStart.hour;
    final sunriseHour = sun.sunrise!.hour;
    final sunsetHour = sun.sunset!.hour;

    // 日出前后 1 小时 = 黄金时段
    if ((hour - sunriseHour).abs() <= 1) {
      points = 20;
      desc = 'Golden hour — dawn';
    }
    // 日落前后 1 小时 = 黄金时段
    else if ((hour - sunsetHour).abs() <= 1) {
      points = 20;
      desc = 'Golden hour — dusk';
    }
    // 曙暮光时段（日出前/日落后 1-2 小时）
    else if (hour == sunriseHour - 1 || hour == sunsetHour + 1) {
      points = 15;
      desc = 'Twilight period';
    }
    // 夜间
    else if (hour < sunriseHour - 1 || hour > sunsetHour + 1) {
      points = 8;
      desc = 'Night fishing';
    }
    // 正午（鱼类不太活跃）
    else if (hour >= 11 && hour <= 14) {
      points = 3;
      desc = 'Midday — low activity';
    }
    // 其他白天时段
    else {
      points = 8;
      desc = 'Daytime';
    }

    return ScoreFactor(
      name: 'Light',
      points: points,
      maxPoints: 20,
      description: desc,
    );
  }

  /// 全天因素汇总
  List<ScoreFactor> _computeDailyFactors(
      MoonPhaseInfo moon, SunTimes sun, SolunarPeriods solunar, TidePrediction? tide) {
    final factors = <ScoreFactor>[];

    // 月相
    factors.add(_scoreMoonPhase(moon));

    // 日月活跃期数量
    final majorCount = solunar.majorPeriods.length;
    final minorCount = solunar.minorPeriods.length;
    factors.add(ScoreFactor(
      name: 'Solunar Windows',
      points: majorCount * 15 + minorCount * 5,
      maxPoints: 40,
      description: '$majorCount major + $minorCount minor periods today',
    ));

    // 潮汐变化次数
    if (tide != null) {
      final changes = tide.highLowTimes.length;
      factors.add(ScoreFactor(
        name: 'Tide Changes',
        points: changes * 8,
        maxPoints: 32,
        description: '$changes tide transitions today',
      ));
    }

    return factors;
  }

  /// 找到最佳连续时段（至少 2 小时）
  TimeSlotScore? _findBestWindow(List<TimeSlotScore> hourlyScores) {
    if (hourlyScores.isEmpty) return null;

    int bestStart = 0;
    int bestSum = 0;

    // 滑动窗口找连续 2 小时最高分
    for (int i = 0; i < hourlyScores.length - 1; i++) {
      final sum = hourlyScores[i].score + hourlyScores[i + 1].score;
      if (sum > bestSum) {
        bestSum = sum;
        bestStart = i;
      }
    }

    final avgScore = (bestSum / 2).round();
    return TimeSlotScore(
      start: hourlyScores[bestStart].start,
      end: hourlyScores[bestStart + 1].end,
      score: avgScore,
      factors: hourlyScores[bestStart].factors,
    );
  }

  /// 判断两个时间段是否重叠
  bool _periodsOverlap(DateTime s1, DateTime e1, DateTime s2, DateTime e2) {
    return s1.isBefore(e2) && s2.isBefore(e1);
  }
}
