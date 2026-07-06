import '../../../core/database/reference_db.dart';

/// 兼容性检查结果
class CompatibilityResult {
  const CompatibilityResult({
    required this.issues,
  });

  final List<CompatibilityIssue> issues;

  bool get isCompatible => issues.isEmpty;
  int get issueCount => issues.length;
}

/// 单个兼容性问题
class CompatibilityIssue {
  const CompatibilityIssue({
    required this.severity,
    required this.title,
    required this.description,
  });

  final IssueSeverity severity;
  final String title;
  final String description;
}

enum IssueSeverity {
  warning, // 可以用但不理想
  error, // 不兼容，可能导致失败
}

/// 装备兼容性检查器
class CompatibilityChecker {
  const CompatibilityChecker();

  /// 检查 rod + reel + line 组合的兼容性
  CompatibilityResult check({
    required Rod rod,
    required Reel reel,
    int? lineLbTest,
    double? sinkerWeightOz,
  }) {
    final issues = <CompatibilityIssue>[];

    // 1. Rod power vs Reel size 匹配
    _checkRodReelMatch(rod, reel, issues);

    // 2. Line weight vs Rod rating
    if (lineLbTest != null) {
      _checkLineWeight(rod, lineLbTest, issues);
    }

    // 3. Reel line capacity
    if (lineLbTest != null) {
      _checkReelCapacity(reel, lineLbTest, issues);
    }

    // 4. Sinker weight vs Rod casting weight
    if (sinkerWeightOz != null) {
      _checkSinkerWeight(rod, sinkerWeightOz, issues);
    }

    return CompatibilityResult(issues: issues);
  }

  /// Rod power 和 Reel size 匹配规则
  void _checkRodReelMatch(Rod rod, Reel reel, List<CompatibilityIssue> issues) {
    // 推荐搭配范围
    final expectedReelRange = switch (rod.power.toLowerCase()) {
      'light' => (min: 2500, max: 4000),
      'medium' => (min: 3000, max: 5000),
      'medium-heavy' => (min: 4000, max: 6000),
      'heavy' => (min: 5000, max: 8000),
      _ => (min: 3000, max: 6000),
    };

    if (reel.size < expectedReelRange.min) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.error,
        title: 'Reel too small for rod',
        description:
            'A ${rod.power} power rod pairs best with a ${expectedReelRange.min}-${expectedReelRange.max} size reel. '
            'Your ${reel.size} size reel may lack the line capacity and drag needed.',
      ));
    } else if (reel.size > expectedReelRange.max) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.warning,
        title: 'Reel oversized for rod',
        description:
            'A ${rod.power} power rod pairs best with a ${expectedReelRange.min}-${expectedReelRange.max} size reel. '
            'Your ${reel.size} size reel adds unnecessary weight and may feel unbalanced.',
      ));
    }
  }

  /// Line weight 与 Rod line rating 匹配
  void _checkLineWeight(
      Rod rod, int lineLbTest, List<CompatibilityIssue> issues) {
    // 解析 rod line rating (格式 "10-25 lb")
    final range = _parseRange(rod.lineRating);
    if (range == null) return;

    if (lineLbTest > range.max) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.error,
        title: 'Line too heavy for rod',
        description:
            'Your ${lineLbTest}lb line exceeds the rod\'s rated range of ${rod.lineRating}. '
            'This can cause rod breakage under load.',
      ));
    } else if (lineLbTest < range.min) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.warning,
        title: 'Line too light for rod',
        description:
            'Your ${lineLbTest}lb line is below the rod\'s rated range of ${rod.lineRating}. '
            'You may not achieve full casting distance or control.',
      ));
    }
  }

  /// Reel line capacity 检查
  void _checkReelCapacity(
      Reel reel, int lineLbTest, List<CompatibilityIssue> issues) {
    // 粗略估算：更重的线占更多容量
    // 对于远投钓鱼，最少需要 200yds 的 backing
    final estimatedCapacity = switch (lineLbTest) {
      <= 15 => reel.lineCapacityYds,
      <= 20 => (reel.lineCapacityYds * 0.8).toInt(),
      <= 30 => (reel.lineCapacityYds * 0.6).toInt(),
      <= 50 => (reel.lineCapacityYds * 0.4).toInt(),
      _ => (reel.lineCapacityYds * 0.3).toInt(),
    };

    if (estimatedCapacity < 200) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.error,
        title: 'Insufficient line capacity',
        description:
            'At ${lineLbTest}lb test, this reel may only hold ~${estimatedCapacity}yds. '
            'Surf casting typically requires 200+ yards for long runs.',
      ));
    } else if (estimatedCapacity < 300) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.warning,
        title: 'Limited line capacity',
        description:
            'At ${lineLbTest}lb test, this reel holds ~${estimatedCapacity}yds. '
            'Adequate but tight for large fish making long runs.',
      ));
    }
  }

  /// Sinker weight vs Rod casting weight
  void _checkSinkerWeight(
      Rod rod, double sinkerWeightOz, List<CompatibilityIssue> issues) {
    if (sinkerWeightOz > rod.castWeightMaxOz) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.error,
        title: 'Sinker too heavy for rod',
        description:
            'Your ${sinkerWeightOz}oz sinker exceeds the rod\'s max casting weight of ${rod.castWeightMaxOz}oz. '
            'This risks rod breakage during casting.',
      ));
    } else if (sinkerWeightOz < rod.castWeightMinOz) {
      issues.add(CompatibilityIssue(
        severity: IssueSeverity.warning,
        title: 'Sinker too light for rod',
        description:
            'Your ${sinkerWeightOz}oz sinker is below the rod\'s min casting weight of ${rod.castWeightMinOz}oz. '
            'The rod won\'t load properly, reducing casting distance.',
      ));
    }
  }

  /// 解析 "10-25 lb" 格式的范围
  ({int min, int max})? _parseRange(String rating) {
    final cleaned = rating.replaceAll(RegExp(r'[^0-9\-]'), '');
    final parts = cleaned.split('-');
    if (parts.length != 2) return null;
    final min = int.tryParse(parts[0]);
    final max = int.tryParse(parts[1]);
    if (min == null || max == null) return null;
    return (min: min, max: max);
  }
}
