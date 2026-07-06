import 'dart:math';

/// 天文计算模块 — 纯 Dart, Jean Meeus 算法
/// 计算: 月相、月出月落、日出日落、日月周期
class Astronomy {
  const Astronomy();

  /// 计算月相信息
  MoonPhaseInfo getMoonPhase(DateTime date) {
    // Julian Date 计算
    final jd = _julianDate(date);

    // 从已知新月推算相位
    // 参考新月: 2000-01-06 18:14 UTC (JD 2451550.1)
    const knownNewMoonJd = 2451550.1;
    const synodicMonth = 29.530588853; // 朔望月

    final daysSinceNew = jd - knownNewMoonJd;
    final phase = (daysSinceNew % synodicMonth) / synodicMonth;
    final illumination = (1 - cos(phase * 2 * pi)) / 2;

    final phaseName = _phaseName(phase);

    return MoonPhaseInfo(
      phase: phase,
      illumination: illumination,
      phaseName: phaseName,
      ageInDays: (phase * synodicMonth),
    );
  }

  /// 计算日出/日落时间
  SunTimes getSunTimes(DateTime date, double lat, double lon) {
    final jd = _julianDate(DateTime.utc(date.year, date.month, date.day));
    final n = jd - 2451545.0 + 0.0008;

    // 太阳平近点角
    final jStar = n - lon / 360.0;
    final m = (357.5291 + 0.98560028 * jStar) % 360;
    final mRad = m * pi / 180;

    // 中心差
    final c = 1.9148 * sin(mRad) +
        0.0200 * sin(2 * mRad) +
        0.0003 * sin(3 * mRad);

    // 太阳黄经
    final lambda = (m + c + 180 + 102.9372) % 360;
    final lambdaRad = lambda * pi / 180;

    // 太阳赤纬
    final sinDec = sin(lambdaRad) * sin(23.4393 * pi / 180);
    final decRad = asin(sinDec);

    // 太阳中天时刻 (Julian)
    final jTransit = 2451545.0 + jStar + 0.0053 * sin(mRad) -
        0.0069 * sin(2 * lambdaRad);

    // 时角计算
    final latRad = lat * pi / 180;
    final cosOmega = (sin(-0.8333 * pi / 180) - sin(latRad) * sin(decRad)) /
        (cos(latRad) * cos(decRad));

    // 极地情况处理
    if (cosOmega > 1) {
      // 极夜
      return SunTimes(
        sunrise: null,
        sunset: null,
        solarNoon: _jdToDateTime(jTransit),
        civilTwilightBegin: null,
        civilTwilightEnd: null,
      );
    }
    if (cosOmega < -1) {
      // 极昼
      return SunTimes(
        sunrise: null,
        sunset: null,
        solarNoon: _jdToDateTime(jTransit),
        civilTwilightBegin: null,
        civilTwilightEnd: null,
      );
    }

    final omega = acos(cosOmega) * 180 / pi;

    final jRise = jTransit - omega / 360;
    final jSet = jTransit + omega / 360;

    // 民用曙暮光 (-6度)
    final cosOmegaTwilight =
        (sin(-6 * pi / 180) - sin(latRad) * sin(decRad)) /
            (cos(latRad) * cos(decRad));
    DateTime? twilightBegin;
    DateTime? twilightEnd;
    if (cosOmegaTwilight.abs() <= 1) {
      final omegaTw = acos(cosOmegaTwilight) * 180 / pi;
      twilightBegin = _jdToDateTime(jTransit - omegaTw / 360);
      twilightEnd = _jdToDateTime(jTransit + omegaTw / 360);
    }

    return SunTimes(
      sunrise: _jdToDateTime(jRise),
      sunset: _jdToDateTime(jSet),
      solarNoon: _jdToDateTime(jTransit),
      civilTwilightBegin: twilightBegin,
      civilTwilightEnd: twilightEnd,
    );
  }

  /// 计算日月 (Solunar) 周期
  SolunarPeriods getSolunarPeriods(DateTime date, double lat, double lon) {
    // 简化日月计算：
    // Major periods: 月中天 (transit) 和月下中天 (underfoot)
    // Minor periods: 月出和月落

    final moonTimes = _estimateMoonTimes(date, lat, lon);

    // Major periods 持续约 2 小时
    // Minor periods 持续约 1 小时
    final majorPeriods = <SolunarPeriod>[];
    final minorPeriods = <SolunarPeriod>[];

    if (moonTimes.transit != null) {
      majorPeriods.add(SolunarPeriod(
        start: moonTimes.transit!.subtract(const Duration(hours: 1)),
        end: moonTimes.transit!.add(const Duration(hours: 1)),
        type: SolunarType.major,
        label: 'Moon Overhead',
      ));
    }

    if (moonTimes.underfoot != null) {
      majorPeriods.add(SolunarPeriod(
        start: moonTimes.underfoot!.subtract(const Duration(hours: 1)),
        end: moonTimes.underfoot!.add(const Duration(hours: 1)),
        type: SolunarType.major,
        label: 'Moon Underfoot',
      ));
    }

    if (moonTimes.rise != null) {
      minorPeriods.add(SolunarPeriod(
        start: moonTimes.rise!.subtract(const Duration(minutes: 30)),
        end: moonTimes.rise!.add(const Duration(minutes: 30)),
        type: SolunarType.minor,
        label: 'Moonrise',
      ));
    }

    if (moonTimes.set != null) {
      minorPeriods.add(SolunarPeriod(
        start: moonTimes.set!.subtract(const Duration(minutes: 30)),
        end: moonTimes.set!.add(const Duration(minutes: 30)),
        type: SolunarType.minor,
        label: 'Moonset',
      ));
    }

    return SolunarPeriods(
      majorPeriods: majorPeriods,
      minorPeriods: minorPeriods,
      moonTimes: moonTimes,
    );
  }

  // === 内部计算方法 ===

  /// 估算月出/月落/中天时间（简化算法）
  MoonTimes _estimateMoonTimes(DateTime date, double lat, double lon) {
    // 简化月亮位置计算
    final jd = _julianDate(DateTime.utc(date.year, date.month, date.day));
    final d = jd - 2451545.0;

    // 月亮平均轨道要素
    final l = (218.316 + 13.176396 * d) % 360; // 平均黄经
    final m = (134.963 + 13.064993 * d) % 360; // 平均近点角
    final f = (93.272 + 13.229350 * d) % 360; // 平均参数

    final mRad = m * pi / 180;
    final fRad = f * pi / 180;

    // 月球黄经修正
    final longitude = l + 6.289 * sin(mRad);
    final lonRad = longitude * pi / 180;

    // 月球赤纬
    final latitude = 5.128 * sin(fRad);
    final latMoonRad = latitude * pi / 180;

    // 黄道倾角
    const obliquity = 23.4393;
    final oblRad = obliquity * pi / 180;

    // 赤纬
    final sinDec = sin(latMoonRad) * cos(oblRad) +
        cos(latMoonRad) * sin(oblRad) * sin(lonRad);
    final dec = asin(sinDec);

    // 赤经
    final y = sin(lonRad) * cos(oblRad) - tan(latMoonRad) * sin(oblRad);
    final x = cos(lonRad);
    final ra = atan2(y, x);

    // 估算月中天时间（简化）
    final latRad = lat * pi / 180;

    // 使用赤纬估算月出月落
    final cosH = (sin(-0.125 * pi / 180) - sin(latRad) * sin(dec)) /
        (cos(latRad) * cos(dec));

    DateTime? rise;
    DateTime? setTime;
    DateTime? transit;
    DateTime? underfoot;

    if (cosH.abs() <= 1) {
      final h = acos(cosH) * 180 / pi;
      // 粗略估算时间（基于日经过修正）
      final transitHour = (12.0 + (ra * 180 / pi - lon) / 15.0 -
              (d * 0.9856 - longitude + lon) / 15.0) %
          24;

      transit = DateTime(date.year, date.month, date.day)
          .add(Duration(minutes: (transitHour * 60).toInt()));
      underfoot = transit.add(const Duration(hours: 12));

      final riseHour = (transitHour - h / 15.0) % 24;
      final setHour = (transitHour + h / 15.0) % 24;

      rise = DateTime(date.year, date.month, date.day)
          .add(Duration(minutes: (riseHour * 60).toInt()));
      setTime = DateTime(date.year, date.month, date.day)
          .add(Duration(minutes: (setHour * 60).toInt()));
    }

    return MoonTimes(
      rise: rise,
      set: setTime,
      transit: transit,
      underfoot: underfoot,
    );
  }

  String _phaseName(double phase) {
    if (phase < 0.0625) return 'New Moon';
    if (phase < 0.1875) return 'Waxing Crescent';
    if (phase < 0.3125) return 'First Quarter';
    if (phase < 0.4375) return 'Waxing Gibbous';
    if (phase < 0.5625) return 'Full Moon';
    if (phase < 0.6875) return 'Waning Gibbous';
    if (phase < 0.8125) return 'Last Quarter';
    if (phase < 0.9375) return 'Waning Crescent';
    return 'New Moon';
  }

  /// 计算 Julian Date
  double _julianDate(DateTime dt) {
    final y = dt.month <= 2 ? dt.year - 1 : dt.year;
    final m = dt.month <= 2 ? dt.month + 12 : dt.month;
    final d = dt.day +
        dt.hour / 24.0 +
        dt.minute / 1440.0 +
        dt.second / 86400.0;

    final a = (y / 100).floor();
    final b = 2 - a + (a / 4).floor();

    return (365.25 * (y + 4716)).floor() +
        (30.6001 * (m + 1)).floor() +
        d +
        b -
        1524.5;
  }

  /// Julian Date 转 DateTime
  DateTime _jdToDateTime(double jd) {
    final z = (jd + 0.5).floor();
    final f = jd + 0.5 - z;

    int a;
    if (z < 2299161) {
      a = z;
    } else {
      final alpha = ((z - 1867216.25) / 36524.25).floor();
      a = z + 1 + alpha - (alpha / 4).floor();
    }

    final b = a + 1524;
    final c = ((b - 122.1) / 365.25).floor();
    final d = (365.25 * c).floor();
    final e = ((b - d) / 30.6001).floor();

    final day = b - d - (30.6001 * e).floor();
    final month = e < 14 ? e - 1 : e - 13;
    final year = month > 2 ? c - 4716 : c - 4715;

    final hours = f * 24;
    final hour = hours.floor();
    final minutes = ((hours - hour) * 60).floor();

    return DateTime.utc(year, month, day, hour, minutes);
  }
}

/// 月相信息
class MoonPhaseInfo {
  const MoonPhaseInfo({
    required this.phase,
    required this.illumination,
    required this.phaseName,
    required this.ageInDays,
  });

  /// 相位 0-1 (0=新月, 0.5=满月)
  final double phase;

  /// 光照百分比 0-1
  final double illumination;

  /// 相位名称
  final String phaseName;

  /// 月龄（天）
  final double ageInDays;
}

/// 日出日落时间
class SunTimes {
  const SunTimes({
    this.sunrise,
    this.sunset,
    required this.solarNoon,
    this.civilTwilightBegin,
    this.civilTwilightEnd,
  });

  final DateTime? sunrise;
  final DateTime? sunset;
  final DateTime solarNoon;
  final DateTime? civilTwilightBegin;
  final DateTime? civilTwilightEnd;
}

/// 月出月落时间
class MoonTimes {
  const MoonTimes({
    this.rise,
    this.set,
    this.transit,
    this.underfoot,
  });

  final DateTime? rise;
  final DateTime? set;
  final DateTime? transit;
  final DateTime? underfoot;
}

/// 日月周期
class SolunarPeriods {
  const SolunarPeriods({
    required this.majorPeriods,
    required this.minorPeriods,
    required this.moonTimes,
  });

  final List<SolunarPeriod> majorPeriods;
  final List<SolunarPeriod> minorPeriods;
  final MoonTimes moonTimes;
}

/// 单个日月活跃期
class SolunarPeriod {
  const SolunarPeriod({
    required this.start,
    required this.end,
    required this.type,
    required this.label,
  });

  final DateTime start;
  final DateTime end;
  final SolunarType type;
  final String label;
}

enum SolunarType { major, minor }
