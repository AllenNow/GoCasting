import 'dart:math';

/// 潮汐预测结果
class TidePrediction {
  const TidePrediction({
    required this.timestamps,
    required this.heights,
    required this.highLowTimes,
  });

  final List<DateTime> timestamps;
  final List<double> heights; // 米
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
    required this.phaseGmt,
    required this.speed,
  });

  final String name;
  final double amplitude; // 米
  final double phaseGmt; // 度 (相对于 GMT/UTC 的相位)
  final double speed; // 度/小时

  factory HarmonicConstant.fromJson(Map<String, dynamic> json) {
    return HarmonicConstant(
      name: json['name'] as String,
      amplitude: (json['amp'] as num).toDouble(),
      phaseGmt: (json['phase_gmt'] as num).toDouble(),
      speed: (json['speed'] as num).toDouble(),
    );
  }
}

/// 潮汐预测引擎 — 基于谐波分析（含天文参数修正）
///
/// 完整公式:
///   h(t) = Z₀ + Σ( fₙ · Hₙ · cos(aₙ·t + (V₀+u)ₙ - κₙ) )
///
/// 其中:
///   Z₀  = 平均海面到基准面的高度
///   fₙ  = 节点因子 (node factor, ~18.6年周期修正)
///   Hₙ  = 振幅 (amplitude)
///   aₙ  = 角速度 (speed, 度/小时)
///   V₀ₙ = 天文初始相角 (equilibrium argument at t=0)
///   uₙ  = 节点角度修正
///   κₙ  = 观测站的 epoch (phase_GMT)
///   t   = 从预测起始时刻起的小时数
class TidePredictor {
  const TidePredictor();

  /// 预测指定时间范围的潮汐
  TidePrediction predict({
    required double datum,
    required List<HarmonicConstant> constants,
    required DateTime start,
    required DateTime end,
    int intervalMinutes = 10,
  }) {
    final timestamps = <DateTime>[];
    final heights = <double>[];

    // 计算节点因子和 V₀+u（基于预测年份中间时刻）
    final midTime = start.add(end.difference(start) ~/ 2);
    final nodalCorrections = _computeNodalCorrections(midTime);

    var current = start;
    while (current.isBefore(end) || current.isAtSameMomentAs(end)) {
      timestamps.add(current);
      heights.add(
          _computeHeight(datum, constants, start, current, nodalCorrections));
      current = current.add(Duration(minutes: intervalMinutes));
    }

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
    _NodalCorrections nodal,
  ) {
    final t = time.difference(epoch).inMinutes / 60.0; // 小时
    var height = datum;

    for (final c in constants) {
      if (c.amplitude < 0.001) continue; // 跳过零振幅分潮

      // 获取该分潮的节点因子和 V₀+u
      final f = nodal.getF(c.name);
      final vPlusU = nodal.getVplusU(c.name, time);

      // h += f * H * cos(speed*t + V₀+u - kappa)
      final angleRad =
          (c.speed * t + vPlusU - c.phaseGmt) * pi / 180.0;
      height += f * c.amplitude * cos(angleRad);
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
        extremes.add(TideExtreme(time: timestamps[i], height: curr, isHigh: true));
      } else if (curr < prev && curr < next) {
        extremes.add(TideExtreme(time: timestamps[i], height: curr, isHigh: false));
      }
    }
    return extremes;
  }

  /// 计算节点因子和天文参数修正
  _NodalCorrections _computeNodalCorrections(DateTime time) {
    return _NodalCorrections(time);
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

/// 节点因子和天文参数计算
///
/// 基于 Schureman (1958) 的方法简化版
class _NodalCorrections {
  _NodalCorrections(this.time) {
    _computeLunarParameters();
  }

  final DateTime time;
  // ignore: non_constant_identifier_names
  late final double _N; // 月球升交点经度 (度)
  late final double _p; // 月球近地点经度 (度)
  late final double _h; // 太阳平黄经 (度)
  late final double _s; // 月球平黄经 (度)
  late final double _p1; // ignore: unused_field // 太阳近地点经度 (度)

  void _computeLunarParameters() {
    // T = Julian centuries from J2000.0
    final jd = _julianDate(time);
    final T = (jd - 2451545.0) / 36525.0;

    // Schureman 公式 (度)
    _N = (259.1560564 - 1934.1423972 * T) % 360;
    _s = (277.0256206 + 481267.8898036 * T) % 360;
    _h = (280.1895015 + 36000.7689672 * T) % 360;
    _p = (334.3837214 + 4069.0340073 * T) % 360;
    _p1 = (281.2209353 + 1.7189517 * T) % 360;
  }

  /// 节点因子 f（简化版 — 主要分潮）
  double getF(String name) {
    final nRad = _N * pi / 180;
    final cosN = cos(nRad);
    final cos2N = cos(2 * nRad);

    return switch (name) {
      'M2' || 'N2' || 'NU2' || 'MU2' || 'L2' =>
        1.0 - 0.03731 * cosN + 0.00052 * cos2N,
      'S2' || 'T2' || 'R2' => 1.0,
      'K1' => 1.0060 + 0.1150 * cosN - 0.0088 * cos2N,
      'O1' => 1.0089 + 0.1871 * cosN - 0.0147 * cos2N,
      'K2' => 1.0241 + 0.2863 * cosN + 0.0083 * cos2N,
      'P1' || 'S1' => 1.0,
      'Q1' => 1.0089 + 0.1871 * cosN - 0.0147 * cos2N,
      'M4' => pow(1.0 - 0.03731 * cosN, 2).toDouble(),
      'MS4' => 1.0 - 0.03731 * cosN,
      'M6' => pow(1.0 - 0.03731 * cosN, 3).toDouble(),
      'SA' || 'SSA' => 1.0,
      _ => 1.0,
    };
  }

  /// 天文初始相角 V₀+u (度)
  /// 基于 Schureman 公式的简化计算
  double getVplusU(String name, DateTime t) {
    final nRad = _N * pi / 180;
    final sinN = sin(nRad);
    final sin2N = sin(2 * nRad);

    // u 修正 (度)
    final u = switch (name) {
      'M2' || 'N2' || 'NU2' || 'MU2' =>
        -2.14 * sinN,
      'K1' => -8.86 * sinN + 0.68 * sin2N,
      'O1' => 10.80 * sinN - 1.34 * sin2N,
      'K2' => -17.74 * sinN + 0.68 * sin2N,
      'Q1' => 10.80 * sinN - 1.34 * sin2N,
      'M4' => -4.28 * sinN,
      'M6' => -6.42 * sinN,
      _ => 0.0,
    };

    // V₀ — 天文参数初始相角
    // 用预测时刻的小时角计算
    final hourAngle = _getHourAngle(t);
    final v0 = _getV0(name, hourAngle);

    return v0 + u;
  }

  double _getHourAngle(DateTime t) {
    // 太阳时角（简化为 UTC 小时 * 15 度）
    return (t.hour + t.minute / 60.0) * 15.0;
  }

  /// V₀ 天文参数（简化版）
  double _getV0(String name, double hourAngle) {
    return switch (name) {
      'M2' => (2 * _h - 2 * _s) % 360,
      'S2' => 0.0, // S2 的 V₀ 相对简单
      'N2' => (2 * _h - 3 * _s + _p) % 360,
      'K1' => (_h + 90) % 360,
      'O1' => (_h - 2 * _s - 90) % 360,
      'K2' => (2 * _h) % 360,
      'P1' => (-_h + 90) % 360,
      'Q1' => (_h - 3 * _s + _p - 90) % 360,
      'M4' => (4 * _h - 4 * _s) % 360,
      'MS4' => (2 * _h - 2 * _s) % 360,
      'MU2' => (4 * _h - 4 * _s + 2 * _p) % 360, // 简化
      'NU2' => (2 * _h - 3 * _s + _p) % 360, // 同 N2
      'SA' => _h % 360,
      'SSA' => (2 * _h) % 360,
      _ => 0.0,
    };
  }

  double _julianDate(DateTime dt) {
    final y = dt.month <= 2 ? dt.year - 1 : dt.year;
    final m = dt.month <= 2 ? dt.month + 12 : dt.month;
    final d = dt.day + dt.hour / 24.0 + dt.minute / 1440.0 + dt.second / 86400.0;
    final a = (y / 100).floor();
    final b = 2 - a + (a / 4).floor();
    return (365.25 * (y + 4716)).floor() +
        (30.6001 * (m + 1)).floor() +
        d + b - 1524.5;
  }
}
