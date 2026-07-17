import 'dart:math';

// 钓鱼装备计算器工具箱
//
// 全部为纯公式计算，无需网络，无需数据库。
// 提供 4 个核心计算器：拖力设置、线容量、Shock Leader、铅坠重量。

/// ========== 1. 拖力设置计算器 ==========
///
/// 规则：拖力应设置为线的断裂强度的 25-33%
/// 考虑打结强度损失（通常 15-30%）

class DragCalculator {
  const DragCalculator();

  /// 计算推荐拖力设置
  DragResult calculate({
    required double lineTestLb, // 线磅数
    double knotRetention = 0.80, // 打结保留率（默认 80%）
    DragStyle style = DragStyle.normal, // 钓法风格
  }) {
    // 线经过打结后的实际断裂强度
    final effectiveStrength = lineTestLb * knotRetention;

    // 根据钓法风格确定拖力百分比
    final dragPercent = switch (style) {
      DragStyle.light => 0.20, // 轻拖 — 细线/长跑鱼
      DragStyle.normal => 0.28, // 标准 — 一般情况
      DragStyle.heavy => 0.33, // 重拖 — 障碍物区/大鱼
      DragStyle.strike => 0.40, // 刺鱼拖力 — 瞬间设钩
    };

    final recommendedDrag = effectiveStrength * dragPercent;
    final minDrag = effectiveStrength * 0.20;
    final maxDrag = effectiveStrength * 0.40;

    return DragResult(
      recommendedLb: recommendedDrag,
      recommendedKg: recommendedDrag * 0.4536,
      minLb: minDrag,
      maxLb: maxDrag,
      effectiveLineLb: effectiveStrength,
      dragPercent: dragPercent * 100,
    );
  }
}

class DragResult {
  const DragResult({
    required this.recommendedLb,
    required this.recommendedKg,
    required this.minLb,
    required this.maxLb,
    required this.effectiveLineLb,
    required this.dragPercent,
  });

  final double recommendedLb;
  final double recommendedKg;
  final double minLb;
  final double maxLb;
  final double effectiveLineLb; // 打结后实际强度
  final double dragPercent; // 使用的百分比
}

enum DragStyle {
  light('Light', '细线/远距离/长时间搏鱼'),
  normal('Normal', '通用设置'),
  heavy('Heavy', '障碍物区/大目标鱼'),
  strike('Strike', '刺鱼设定（仅设钩时用）');

  const DragStyle(this.label, this.description);
  final String label;
  final String description;
}

/// ========== 2. 线容量计算器 ==========
///
/// 计算渔轮能装多少线，支持 backing + 主线组合

class LineCapacityCalculator {
  const LineCapacityCalculator();

  /// 基于已知容量换算不同线径的可装长度
  LineCapacityResult calculate({
    required double knownCapacityYds, // 已知容量（码）
    required double knownDiameterMm, // 已知线径（mm）
    required double targetDiameterMm, // 目标线径（mm）
  }) {
    // 容量与线径平方成反比
    // V = π * r² * L → L1 * d1² = L2 * d2²
    final ratio = pow(knownDiameterMm, 2) / pow(targetDiameterMm, 2);
    final targetCapacityYds = knownCapacityYds * ratio;

    return LineCapacityResult(
      capacityYds: targetCapacityYds,
      capacityMeters: targetCapacityYds * 0.9144,
    );
  }

  /// 计算 backing + 主线组合
  BackingResult calculateBacking({
    required double spoolCapacityYds, // 轮的总容量（用已知线径测量）
    required double spoolLineDiameterMm, // 容量标定的线径
    required double mainLineYds, // 需要的主线长度
    required double mainLineDiameterMm, // 主线线径
    required double backingDiameterMm, // backing 线径
  }) {
    // 计算主线占用的等效容量
    final mainLineEquivalent =
        mainLineYds * pow(mainLineDiameterMm, 2) / pow(spoolLineDiameterMm, 2);
    final remainingCapacity = spoolCapacityYds - mainLineEquivalent;

    // 剩余空间换算为 backing 长度
    final backingYds =
        remainingCapacity * pow(spoolLineDiameterMm, 2) / pow(backingDiameterMm, 2);

    return BackingResult(
      backingYds: backingYds.clamp(0, double.infinity),
      backingMeters: (backingYds * 0.9144).clamp(0, double.infinity),
      mainLineYds: mainLineYds,
      totalFillPercent: mainLineEquivalent / spoolCapacityYds * 100 +
          (backingYds > 0 ? (remainingCapacity / spoolCapacityYds * 100) : 0),
    );
  }
}

class LineCapacityResult {
  const LineCapacityResult({
    required this.capacityYds,
    required this.capacityMeters,
  });

  final double capacityYds;
  final double capacityMeters;
}

class BackingResult {
  const BackingResult({
    required this.backingYds,
    required this.backingMeters,
    required this.mainLineYds,
    required this.totalFillPercent,
  });

  final double backingYds;
  final double backingMeters;
  final double mainLineYds;
  final double totalFillPercent;
}

/// ========== 3. Shock Leader 计算器 ==========
///
/// 远投钓鱼规则：Shock Leader 磅数 = 铅坠重量(oz) × 10
/// 长度 = 竿长 + 6-8 圈在轮上

class ShockLeaderCalculator {
  const ShockLeaderCalculator();

  ShockLeaderResult calculate({
    required double sinkerWeightOz, // 铅坠重量（盎司）
    required double rodLengthFt, // 竿长（英尺）
    int extraWraps = 6, // 额外圈数（通常 5-8）
  }) {
    // 磅数规则: 每盎司 10 磅
    final leaderLbTest = sinkerWeightOz * 10;

    // 长度 = 竿长 + 额外缠绕长度（每圈约 0.5-0.8ft，取决于轮径）
    // 简化：每圈约 2ft（大号远投轮周长）
    final wrapLength = extraWraps * 2.0;
    final totalLengthFt = rodLengthFt + wrapLength;

    // 推荐线径（近似值，基于尼龙线）
    final approxDiameterMm = _lbToDiameter(leaderLbTest);

    return ShockLeaderResult(
      recommendedLb: leaderLbTest,
      minLb: sinkerWeightOz * 8, // 最低倍数
      maxLb: sinkerWeightOz * 12, // 最高倍数
      lengthFt: totalLengthFt,
      lengthM: totalLengthFt * 0.3048,
      approxDiameterMm: approxDiameterMm,
    );
  }

  /// 磅数到尼龙线径的近似换算
  double _lbToDiameter(double lb) {
    // 近似公式 (尼龙): diameter(mm) ≈ 0.058 * sqrt(lb)
    return 0.058 * sqrt(lb);
  }
}

class ShockLeaderResult {
  const ShockLeaderResult({
    required this.recommendedLb,
    required this.minLb,
    required this.maxLb,
    required this.lengthFt,
    required this.lengthM,
    required this.approxDiameterMm,
  });

  final double recommendedLb;
  final double minLb;
  final double maxLb;
  final double lengthFt;
  final double lengthM;
  final double approxDiameterMm;
}

/// ========== 4. 铅坠重量计算器 ==========
///
/// 根据海况条件推荐铅坠重量

class SinkerWeightCalculator {
  const SinkerWeightCalculator();

  SinkerWeightResult calculate({
    required CurrentStrength current, // 流速
    required WaveCondition waves, // 浪况
    required double targetDistanceM, // 目标距离（米）
    required BottomType bottom, // 海底类型
  }) {
    // 基础重量（盎司）
    double baseOz = 2.0;

    // 流速调整
    baseOz += switch (current) {
      CurrentStrength.none => 0,
      CurrentStrength.light => 1.0,
      CurrentStrength.moderate => 2.0,
      CurrentStrength.strong => 3.5,
      CurrentStrength.extreme => 5.0,
    };

    // 浪况调整
    baseOz += switch (waves) {
      WaveCondition.calm => 0,
      WaveCondition.light => 0.5,
      WaveCondition.moderate => 1.5,
      WaveCondition.rough => 3.0,
      WaveCondition.storm => 5.0,
    };

    // 距离调整（更远需要更重以达到距离）
    if (targetDistanceM > 100) baseOz += 1.0;
    if (targetDistanceM > 150) baseOz += 1.0;

    // 海底类型调整
    baseOz += switch (bottom) {
      BottomType.sand => 0, // 沙底，金字塔铅抓得住
      BottomType.mud => 0.5, // 泥底，需要稍重
      BottomType.rock => -0.5, // 岩底，太重容易卡
      BottomType.mixed => 0,
    };

    final recommendedOz = baseOz.clamp(1.0, 12.0);
    final minOz = (recommendedOz - 1.0).clamp(1.0, 12.0);
    final maxOz = (recommendedOz + 1.5).clamp(1.0, 12.0);

    // 推荐铅坠类型
    final sinkerType = _recommendType(current, bottom);

    return SinkerWeightResult(
      recommendedOz: recommendedOz,
      recommendedGrams: recommendedOz * 28.35,
      minOz: minOz,
      maxOz: maxOz,
      recommendedType: sinkerType,
      shockLeaderLb: recommendedOz * 10, // 关联 shock leader 建议
    );
  }

  String _recommendType(CurrentStrength current, BottomType bottom) {
    if (current == CurrentStrength.strong || current == CurrentStrength.extreme) {
      return 'Breakaway / Grip Sinker';
    }
    if (bottom == BottomType.rock) {
      return 'Bank / Coin Sinker';
    }
    if (current == CurrentStrength.none && bottom == BottomType.sand) {
      return 'Pyramid Sinker';
    }
    return 'Pyramid / Sputnik Sinker';
  }
}

class SinkerWeightResult {
  const SinkerWeightResult({
    required this.recommendedOz,
    required this.recommendedGrams,
    required this.minOz,
    required this.maxOz,
    required this.recommendedType,
    required this.shockLeaderLb,
  });

  final double recommendedOz;
  final double recommendedGrams;
  final double minOz;
  final double maxOz;
  final String recommendedType;
  final double shockLeaderLb; // 对应的 shock leader 建议
}

enum CurrentStrength {
  none('None', '无流/死水'),
  light('Light', '轻微水流'),
  moderate('Moderate', '中等水流'),
  strong('Strong', '强水流'),
  extreme('Extreme', '极强水流/急流');

  const CurrentStrength(this.label, this.description);
  final String label;
  final String description;
}

enum WaveCondition {
  calm('Calm', '无浪/平静'),
  light('Light', '小浪 (0.3-0.6m)'),
  moderate('Moderate', '中浪 (0.6-1.2m)'),
  rough('Rough', '大浪 (1.2-2.0m)'),
  storm('Storm', '风暴浪 (>2.0m)');

  const WaveCondition(this.label, this.description);
  final String label;
  final String description;
}

enum BottomType {
  sand('Sand', '沙底'),
  mud('Mud', '泥底'),
  rock('Rock', '岩底'),
  mixed('Mixed', '混合底质');

  const BottomType(this.label, this.description);
  final String label;
  final String description;
}
