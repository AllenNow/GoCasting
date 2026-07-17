/// 装备折旧/估值引擎
///
/// 基于离线公式计算装备当前市场估值，考虑因素：
/// - 装备类型和典型寿命
/// - 使用年限
/// - 使用次数和盐水暴露率
/// - 维护记录质量（按时维护可降低贬值率）
class DepreciationEngine {
  const DepreciationEngine();

  /// 获取装备类型的折旧参数
  DepreciationParams getParams(String gearType) {
    return switch (gearType.toLowerCase()) {
      'rod' => const DepreciationParams(
          typicalLifeYears: 10,
          firstYearDropMin: 0.12,
          firstYearDropMax: 0.18,
          annualWearMin: 0.05,
          annualWearMax: 0.08,
          salvagePercent: 0.12,
        ),
      'reel' => const DepreciationParams(
          typicalLifeYears: 8,
          firstYearDropMin: 0.16,
          firstYearDropMax: 0.24,
          annualWearMin: 0.07,
          annualWearMax: 0.11,
          salvagePercent: 0.10,
        ),
      'electronics' => const DepreciationParams(
          typicalLifeYears: 5,
          firstYearDropMin: 0.24,
          firstYearDropMax: 0.35,
          annualWearMin: 0.12,
          annualWearMax: 0.18,
          salvagePercent: 0.08,
        ),
      'line' => const DepreciationParams(
          typicalLifeYears: 1,
          firstYearDropMin: 0.50,
          firstYearDropMax: 0.70,
          annualWearMin: 0.30,
          annualWearMax: 0.50,
          salvagePercent: 0.0,
        ),
      _ => const DepreciationParams(
          typicalLifeYears: 7,
          firstYearDropMin: 0.15,
          firstYearDropMax: 0.22,
          annualWearMin: 0.08,
          annualWearMax: 0.12,
          salvagePercent: 0.10,
        ),
    };
  }

  /// 计算装备当前估值
  ///
  /// [originalPrice] 购买价格
  /// [gearType] 装备类型
  /// [ageInDays] 使用天数（从购买日到今天）
  /// [totalSessions] 总使用次数
  /// [saltwaterRatio] 盐水暴露比例 (0.0 - 1.0)
  /// [maintenanceScore] 维护评分 (0.0 - 1.0)，1.0 = 完美按时维护
  ValuationResult calculate({
    required double originalPrice,
    required String gearType,
    required int ageInDays,
    required int totalSessions,
    double saltwaterRatio = 1.0,
    double maintenanceScore = 0.5,
  }) {
    if (originalPrice <= 0) {
      return ValuationResult(
        currentValue: 0,
        originalPrice: 0,
        valueRetainedPercent: 0,
        depreciationTaken: 0,
        remainingLifeYears: 0,
        condition: GearCondition.unknown,
      );
    }

    final params = getParams(gearType);
    final ageYears = ageInDays / 365.25;

    // 基础贬值率（在 min-max 之间，根据盐水暴露调整）
    // 盐水暴露越高 → 贬值越快
    final firstYearDrop = _lerp(
      params.firstYearDropMin,
      params.firstYearDropMax,
      saltwaterRatio,
    );
    final annualWear = _lerp(
      params.annualWearMin,
      params.annualWearMax,
      saltwaterRatio,
    );

    // 维护评分的影响：良好维护降低贬值率 10-20%
    final maintenanceMultiplier = 1.0 - (maintenanceScore * 0.20);

    // 计算当前价值
    double currentValue = originalPrice;

    if (ageYears >= 1.0) {
      // 第一年贬值
      currentValue *= (1.0 - firstYearDrop * maintenanceMultiplier);
      // 后续年份贬值
      final additionalYears = ageYears - 1.0;
      if (additionalYears > 0) {
        final adjustedAnnualWear = annualWear * maintenanceMultiplier;
        currentValue *= _pow(1.0 - adjustedAnnualWear, additionalYears);
      }
    } else {
      // 不足一年：按比例计算第一年贬值
      final partialDrop = firstYearDrop * ageYears * maintenanceMultiplier;
      currentValue *= (1.0 - partialDrop);
    }

    // 不低于残值
    final salvageValue = originalPrice * params.salvagePercent;
    if (currentValue < salvageValue) {
      currentValue = salvageValue;
    }

    // 估算剩余寿命
    final usedLife = ageYears / params.typicalLifeYears;
    final remainingYears = ((1.0 - usedLife) * params.typicalLifeYears).clamp(0.0, params.typicalLifeYears.toDouble());

    // 确定装备状况
    final valueRetained = currentValue / originalPrice;
    final condition = _assessCondition(valueRetained, ageYears, params.typicalLifeYears.toDouble());

    return ValuationResult(
      currentValue: currentValue,
      originalPrice: originalPrice,
      valueRetainedPercent: valueRetained * 100,
      depreciationTaken: originalPrice - currentValue,
      remainingLifeYears: remainingYears,
      condition: condition,
    );
  }

  /// 计算维护评分
  ///
  /// 基于实际维护次数 vs 应该维护次数的比例
  double calculateMaintenanceScore({
    required int actualMaintenanceCount,
    required int expectedMaintenanceCount,
  }) {
    if (expectedMaintenanceCount <= 0) return 1.0;
    return (actualMaintenanceCount / expectedMaintenanceCount).clamp(0.0, 1.0);
  }

  GearCondition _assessCondition(double valueRetained, double ageYears, double lifeYears) {
    if (valueRetained > 0.80) return GearCondition.excellent;
    if (valueRetained > 0.60) return GearCondition.good;
    if (valueRetained > 0.40) return GearCondition.fair;
    if (valueRetained > 0.20) return GearCondition.worn;
    return GearCondition.endOfLife;
  }

  double _lerp(double a, double b, double t) => a + (b - a) * t.clamp(0.0, 1.0);

  double _pow(double base, double exponent) {
    // 简单幂运算（Dart 的 pow 返回 num）
    if (exponent == 0) return 1.0;
    if (base <= 0) return 0.0;
    double result = 1.0;
    final intPart = exponent.floor();
    final fracPart = exponent - intPart;
    for (int i = 0; i < intPart; i++) {
      result *= base;
    }
    // 分数部分用线性近似（精度足够用于折旧估算）
    if (fracPart > 0) {
      result *= (1.0 - (1.0 - base) * fracPart);
    }
    return result;
  }
}

/// 折旧参数
class DepreciationParams {
  const DepreciationParams({
    required this.typicalLifeYears,
    required this.firstYearDropMin,
    required this.firstYearDropMax,
    required this.annualWearMin,
    required this.annualWearMax,
    required this.salvagePercent,
  });

  final int typicalLifeYears;
  final double firstYearDropMin;
  final double firstYearDropMax;
  final double annualWearMin;
  final double annualWearMax;
  final double salvagePercent;
}

/// 估值结果
class ValuationResult {
  const ValuationResult({
    required this.currentValue,
    required this.originalPrice,
    required this.valueRetainedPercent,
    required this.depreciationTaken,
    required this.remainingLifeYears,
    required this.condition,
  });

  final double currentValue;
  final double originalPrice;
  final double valueRetainedPercent;
  final double depreciationTaken;
  final double remainingLifeYears;
  final GearCondition condition;
}

/// 装备状况评级
enum GearCondition {
  excellent('Excellent', '装备状态极佳，保值率高'),
  good('Good', '状态良好，正常损耗范围'),
  fair('Fair', '有明显磨损，但仍可正常使用'),
  worn('Worn', '磨损较重，建议规划更换'),
  endOfLife('End of Life', '接近寿命终点，考虑退役'),
  unknown('Unknown', '信息不足，无法评估');

  const GearCondition(this.label, this.description);
  final String label;
  final String description;
}
