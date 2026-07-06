/// 单位系统枚举
enum UnitSystem {
  imperial,
  metric;

  String get label => switch (this) {
        imperial => 'Imperial (ft, lbs, oz)',
        metric => 'Metric (m, kg, g)',
      };
}

/// 单位转换工具
class UnitConverter {
  UnitConverter._();

  // 长度
  static double feetToMeters(double feet) => feet * 0.3048;
  static double metersToFeet(double meters) => meters / 0.3048;

  // 重量
  static double lbsToKg(double lbs) => lbs * 0.453592;
  static double kgToLbs(double kg) => kg / 0.453592;
  static double ozToGrams(double oz) => oz * 28.3495;
  static double gramsToOz(double grams) => grams / 28.3495;

  // 距离
  static double yardsToMeters(double yards) => yards * 0.9144;
  static double metersToYards(double meters) => meters / 0.9144;

  /// 格式化长度显示
  static String formatLength(double valueFt, UnitSystem system) {
    return switch (system) {
      UnitSystem.imperial => '${valueFt.toStringAsFixed(1)} ft',
      UnitSystem.metric => '${feetToMeters(valueFt).toStringAsFixed(2)} m',
    };
  }

  /// 格式化重量显示 (oz)
  static String formatWeightOz(double valueOz, UnitSystem system) {
    return switch (system) {
      UnitSystem.imperial => '${valueOz.toStringAsFixed(1)} oz',
      UnitSystem.metric => '${ozToGrams(valueOz).toStringAsFixed(0)} g',
    };
  }

  /// 格式化重量显示 (lbs)
  static String formatWeightLbs(double valueLbs, UnitSystem system) {
    return switch (system) {
      UnitSystem.imperial => '${valueLbs.toStringAsFixed(1)} lbs',
      UnitSystem.metric => '${lbsToKg(valueLbs).toStringAsFixed(2)} kg',
    };
  }

  /// 格式化距离显示 (yards)
  static String formatDistance(double valueYds, UnitSystem system) {
    return switch (system) {
      UnitSystem.imperial => '${valueYds.toStringAsFixed(0)} yds',
      UnitSystem.metric => '${yardsToMeters(valueYds).toStringAsFixed(0)} m',
    };
  }
}
