import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

// 天气服务 — 调用高德天气 API
//
// 高德天气 API 文档：https://lbs.amap.com/api/webservice/guide/api/weatherinfo
// 免费配额：每日 30 万次调用

/// 天气数据模型
class WeatherData {
  const WeatherData({
    required this.city,
    required this.weather,
    required this.temperature,
    required this.windDirection,
    required this.windPower,
    required this.humidity,
    required this.reportTime,
    this.temperatureFloat,
    this.windSpeed,
    this.pressure,
  });

  final String city;
  final String weather; // 晴/多云/阴/雨 等
  final String temperature; // 温度（字符串）
  final String windDirection; // 风向
  final String windPower; // 风力等级
  final String humidity; // 湿度%
  final String reportTime; // 数据发布时间
  final double? temperatureFloat; // 温度（数值）
  final double? windSpeed; // 风速 km/h（估算）
  final double? pressure; // 气压 hPa

  /// 从高德 API 响应解析
  factory WeatherData.fromAmapJson(Map<String, dynamic> json) {
    final temp = json['temperature'] as String? ?? '0';
    final windPower = json['windpower'] as String? ?? '0';

    return WeatherData(
      city: json['city'] as String? ?? '',
      weather: json['weather'] as String? ?? '',
      temperature: temp,
      windDirection: json['winddirection'] as String? ?? '',
      windPower: windPower,
      humidity: json['humidity'] as String? ?? '',
      reportTime: json['reporttime'] as String? ?? '',
      temperatureFloat: double.tryParse(temp),
      windSpeed: _windPowerToSpeed(windPower),
      pressure: null, // 高德实况API不提供气压，需要预报API
    );
  }

  /// 风力等级转风速（近似值 km/h）
  static double? _windPowerToSpeed(String power) {
    // 去除 "≤" 等前缀
    final cleaned = power.replaceAll(RegExp(r'[≤<>]'), '').trim();
    final level = int.tryParse(cleaned);
    if (level == null) return null;
    // 蒲福风级近似风速
    return switch (level) {
      0 => 1.0,
      1 => 4.0,
      2 => 9.0,
      3 => 15.0,
      4 => 24.0,
      5 => 34.0,
      6 => 44.0,
      7 => 55.0,
      8 => 68.0,
      _ => 80.0,
    };
  }

  /// 天气图标
  String get weatherIcon => switch (weather) {
        '晴' => '☀️',
        '多云' => '⛅',
        '阴' => '☁️',
        '小雨' || '阵雨' => '🌦️',
        '中雨' => '🌧️',
        '大雨' || '暴雨' => '⛈️',
        '雾' || '霾' => '🌫️',
        '雪' || '小雪' => '🌨️',
        _ => '🌤️',
      };

  /// 是否适合钓鱼（简单判断）
  bool get isFishingFriendly {
    final badWeather = ['大雨', '暴雨', '大暴雨', '特大暴雨', '雷阵雨', '台风'];
    if (badWeather.contains(weather)) return false;
    if (windSpeed != null && windSpeed! > 50) return false;
    return true;
  }

  /// 钓鱼天气评分 (0-100)
  int get fishingScore {
    int score = 50; // 基础分

    // 天气条件
    score += switch (weather) {
      '阴' => 20, // 阴天最好（光线柔和）
      '多云' => 15,
      '晴' => 5,
      '小雨' || '阵雨' => 10, // 小雨鱼活跃
      '中雨' => -5,
      '大雨' || '暴雨' => -30,
      '雾' => 5,
      _ => 0,
    };

    // 风力
    if (windSpeed != null) {
      if (windSpeed! < 15) {
        score += 15; // 微风最佳
      } else if (windSpeed! < 25) {
        score += 5;
      } else if (windSpeed! < 40) {
        score -= 10;
      } else {
        score -= 25; // 强风不利
      }
    }

    // 湿度
    final hum = int.tryParse(humidity) ?? 50;
    if (hum >= 60 && hum <= 85) score += 10; // 适中湿度

    return score.clamp(0, 100);
  }
}

/// 天气预报（未来几天）
class WeatherForecast {
  const WeatherForecast({
    required this.date,
    required this.dayWeather,
    required this.nightWeather,
    required this.dayTemp,
    required this.nightTemp,
    required this.dayWind,
    required this.dayWindPower,
  });

  final String date;
  final String dayWeather;
  final String nightWeather;
  final String dayTemp;
  final String nightTemp;
  final String dayWind;
  final String dayWindPower;

  factory WeatherForecast.fromAmapJson(Map<String, dynamic> json) {
    return WeatherForecast(
      date: json['date'] as String? ?? '',
      dayWeather: json['dayweather'] as String? ?? '',
      nightWeather: json['nightweather'] as String? ?? '',
      dayTemp: json['daytemp'] as String? ?? '',
      nightTemp: json['nighttemp'] as String? ?? '',
      dayWind: json['daywind'] as String? ?? '',
      dayWindPower: json['daypower'] as String? ?? '',
    );
  }
}

/// 天气服务
class WeatherService {
  const WeatherService();

  /// 高德天气 API Key（与地图共用同一个 Web 服务 Key）
  /// 注意：这里需要使用 Web 服务类型的 Key，不是 Android/iOS SDK Key
  static const _apiKey = 'YOUR_AMAP_WEB_KEY_HERE';
  static const _baseUrl = 'https://restapi.amap.com/v3/weather/weatherInfo';

  /// 获取实况天气
  ///
  /// [cityCode] 城市编码（如 "110000" 北京）或城市名（如 "北京"）
  Future<WeatherData?> getLiveWeather(String cityCode) async {
    try {
      final url = Uri.parse('$_baseUrl?key=$_apiKey&city=$cityCode&extensions=base');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) return null;

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      if (json['status'] != '1') return null;

      final lives = json['lives'] as List?;
      if (lives == null || lives.isEmpty) return null;

      return WeatherData.fromAmapJson(lives[0] as Map<String, dynamic>);
    } catch (e) {
      debugPrint('WeatherService error: $e');
      return null;
    }
  }

  /// 获取天气预报（未来 3 天）
  Future<List<WeatherForecast>> getForecast(String cityCode) async {
    try {
      final url = Uri.parse('$_baseUrl?key=$_apiKey&city=$cityCode&extensions=all');
      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) return [];

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      if (json['status'] != '1') return [];

      final forecasts = json['forecasts'] as List?;
      if (forecasts == null || forecasts.isEmpty) return [];

      final forecastData = forecasts[0] as Map<String, dynamic>;
      final casts = forecastData['casts'] as List? ?? [];

      return casts.map((c) => WeatherForecast.fromAmapJson(c as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('WeatherService forecast error: $e');
      return [];
    }
  }
}
