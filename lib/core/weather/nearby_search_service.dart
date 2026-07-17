import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

// 周边搜索服务 — 调用高德 POI 搜索 API
//
// 搜索钓点附近的渔具店、停车场、便利店、公厕等实用地点

/// POI 搜索结果
class NearbyPoi {
  const NearbyPoi({
    required this.name,
    required this.type,
    required this.address,
    required this.distance,
    required this.lat,
    required this.lon,
    this.tel,
  });

  final String name;
  final String type; // 类型描述
  final String address;
  final int distance; // 距离（米）
  final double lat;
  final double lon;
  final String? tel; // 电话

  String get distanceText {
    if (distance < 1000) return '${distance}m';
    return '${(distance / 1000).toStringAsFixed(1)}km';
  }
}

/// 搜索类别
enum PoiCategory {
  tackleShop('渔具店', '080000', Icons_fishing),
  parking('停车场', '150000', Icons_parking),
  convenience('便利店', '060100', Icons_store),
  restaurant('餐饮', '050000', Icons_restaurant),
  toilet('公厕', '200000', Icons_wc),
  gasStation('加油站', '010000', Icons_gas);

  const PoiCategory(this.label, this.amapCode, this.iconCode);
  final String label;
  final String amapCode; // 高德 POI 分类编码
  final int iconCode;
}

// 图标代码占位（在 UI 中映射为实际 IconData）
// ignore_for_file: constant_identifier_names
const Icons_fishing = 1;
const Icons_parking = 2;
const Icons_store = 3;
const Icons_restaurant = 4;
const Icons_wc = 5;
const Icons_gas = 6;

/// 周边搜索服务
class NearbySearchService {
  const NearbySearchService();

  /// 高德 Web 服务 Key（与天气共用）
  static const _apiKey = 'YOUR_AMAP_WEB_KEY_HERE';
  static const _baseUrl = 'https://restapi.amap.com/v3/place/around';

  /// 搜索周边 POI
  ///
  /// [lat] 中心点纬度
  /// [lon] 中心点经度
  /// [category] 搜索类别
  /// [radius] 搜索半径（米），默认 5000m
  /// [limit] 返回数量限制
  Future<List<NearbyPoi>> search({
    required double lat,
    required double lon,
    required PoiCategory category,
    int radius = 5000,
    int limit = 20,
  }) async {
    try {
      final location = '${lon.toStringAsFixed(6)},${lat.toStringAsFixed(6)}';
      final url = Uri.parse(
        '$_baseUrl?key=$_apiKey'
        '&location=$location'
        '&types=${category.amapCode}'
        '&radius=$radius'
        '&offset=$limit'
        '&extensions=all'
      );

      final response = await http.get(url).timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) return [];

      final json = jsonDecode(response.body) as Map<String, dynamic>;
      if (json['status'] != '1') return [];

      final pois = json['pois'] as List? ?? [];
      return pois.map((poi) {
        final p = poi as Map<String, dynamic>;
        final loc = (p['location'] as String? ?? '0,0').split(',');
        final pLon = double.tryParse(loc[0]) ?? 0;
        final pLat = double.tryParse(loc.length > 1 ? loc[1] : '0') ?? 0;
        final dist = int.tryParse(p['distance']?.toString() ?? '0') ?? 0;

        return NearbyPoi(
          name: p['name'] as String? ?? '',
          type: p['type'] as String? ?? '',
          address: p['address'] as String? ?? '',
          distance: dist,
          lat: pLat,
          lon: pLon,
          tel: p['tel'] as String?,
        );
      }).toList();
    } catch (e) {
      debugPrint('NearbySearch error: $e');
      return [];
    }
  }

  /// 搜索渔具店
  Future<List<NearbyPoi>> searchTackleShops(double lat, double lon, {int radius = 10000}) {
    return search(lat: lat, lon: lon, category: PoiCategory.tackleShop, radius: radius);
  }

  /// 搜索停车场
  Future<List<NearbyPoi>> searchParking(double lat, double lon, {int radius = 3000}) {
    return search(lat: lat, lon: lon, category: PoiCategory.parking, radius: radius);
  }
}
