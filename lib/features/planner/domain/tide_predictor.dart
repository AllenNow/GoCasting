import 'dart:math';

/// 潮汐预测结果
class TidePrediction {
  const TidePrediction({
    required this.timestamps,
    required this.heights,
    required this.highLowTimes,
  });

  /// 时间序列（每10分钟一个点）
  final List<DateTime> timestamps;

  /// 对应水位高度（米）
  final List<double> heights;

  /// 高/低潮时刻
  final List<TideExtreme> highLowTimes;
}

/// 高潮或低潮
class TideExtreme {
  const TideExtreme({
    required this.time,
    required this.height,
    required this.isHigh,
  });

  final DateTime time;
  final double height;
  final bool isHigh;
}

/// 谐波常数（单个分潮）
class HarmonicConstant {
  const HarmonicConstant({
    required this.name,
    required this.amplitude,
    required this.phase,
    required this.speed,
  });

  /// 分潮名称 (M2, S2, N2, K1, O1, etc.)
  final String name;

  /// 振幅（米）
  final double amplitude;

  /// 相位（度）
  final double phase;

  /// 角速度（度/小时）
  final double speed;

  factory HarmonicConstant.fromJson(Map<String, dynamic> json) {
    return HarmonicConstant(
      name: json['name'] as String,
      amplitude: (json['amplitude'] as num).toDouble(),
      phase: (json['phase'] as num).toDouble(),
      speed: (json['speed'] as num).toDouble(),
    );
  }
}

/// 潮汐预测引擎 — 基于谐波分析
///
/// 使用公式: h(t) = H₀ + Σ(Aₙ · cos(ωₙ·t + φₙ))
/// 其中:
///   H₀ = 平均海面 (datum)
///   Aₙ = 第n个分潮的振幅
///   ωₙ = 第n个分潮的角速度 (度/小时)
///   φₙ = 第n个分潮的相位 (度)
///   t  = 时间 (小时，从参考时刻起算)
class TidePredictor {
  const TidePredictor();

  /// 预测指定时间范围的潮汐
  ///
  /// [datum] 平均海面高度（米）
  /// [constants] 谐波常数列表
  /// [start] 预测起始时间
  /// [end] 预测结束时间
  /// [intervalMinutes] 采样间隔（分钟），默认10分钟
  TidePrediction predict({
    required double datum,
    required List<HarmonicConstant> constants,
    required DateTime start,
    required DateTime end,
    int intervalMinutes = 10,
  }) {
    final timestamps = <DateTime>[];
    final heights = <double>[];

    // 参考时刻：预测起始日的 0:00 UTC
    final epoch = DateTime.utc(start.year, start.month, start.day);

    var current = start;
    while (current.isBefore(end) || current.isAtSameMomentAs(end)) {
      timestamps.add(current);
      heights.add(_computeHeight(datum, constants, epoch, current));
      current = current.add(Duration(minutes: intervalMinutes));
    }

    // 找高/低潮
    final extremes = _findExtremes(timestamps, heights);

    return TidePrediction(
      timestamps: timestamps,
      heights: heights,
      highLowTimes: extremes,
    );
  }

  /// 计算单个时刻的水位
  double _computeHeight(
    double datum,
    List<HarmonicConstant> constants,
    DateTime epoch,
    DateTime time,
  ) {
    // t = 从 epoch 开始的小时数
    final t = time.difference(epoch).inMinutes / 60.0;

    var height = datum;
    for (final c in constants) {
      // h += A * cos(ω*t + φ)
      // 注意：speed 单位是 度/小时，phase 是度
      final angleRad = (c.speed * t + c.phase) * pi / 180.0;
      height += c.amplitude * cos(angleRad);
    }
    return height;
  }

  /// 查找高潮和低潮时刻
  List<TideExtreme> _findExtremes(
      List<DateTime> timestamps, List<double> heights) {
    final extremes = <TideExtreme>[];
    if (heights.length < 3) return extremes;

    for (var i = 1; i < heights.length - 1; i++) {
      final prev = heights[i - 1];
      final curr = heights[i];
      final next = heights[i + 1];

      if (curr > prev && curr > next) {
        // 高潮
        extremes.add(TideExtreme(
          time: timestamps[i],
          height: curr,
          isHigh: true,
        ));
      } else if (curr < prev && curr < next) {
        // 低潮
        extremes.add(TideExtreme(
          time: timestamps[i],
          height: curr,
          isHigh: false,
        ));
      }
    }
    return extremes;
  }

  /// 获取当前潮汐状态
  String getTideState(List<double> heights, int currentIndex) {
    if (currentIndex <= 0 || currentIndex >= heights.length - 1) {
      return 'Unknown';
    }
    final prev = heights[currentIndex - 1];
    final curr = heights[currentIndex];
    if (curr > prev) return 'Rising';
    if (curr < prev) return 'Falling';
    return 'Slack';
  }
}
