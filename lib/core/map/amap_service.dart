import 'package:geolocator/geolocator.dart';

/// 高德地图 + 定位服务
///
/// 地图显示使用 amap_flutter_map SDK（API Key 在 AndroidManifest/Info.plist 中配置）
/// 定位使用 geolocator 包（跨平台，不依赖高德定位 SDK，更稳定）
class AMapService {
  AMapService._();
  static final instance = AMapService._();

  /// API Key 配置（请替换为你的真实 Key）
  /// Android Key 在 AndroidManifest.xml 中配置
  /// iOS Key 在 Info.plist 中配置
  static const androidKey = 'YOUR_AMAP_ANDROID_KEY_HERE';
  static const iosKey = 'YOUR_AMAP_IOS_KEY_HERE';

  bool _initialized = false;

  /// 初始化（检查定位服务是否可用）
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
  }

  /// 请求定位权限
  Future<bool> requestLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;

    return true;
  }

  /// 获取当前位置（单次定位）
  Future<Map<String, Object>?> getCurrentLocation() async {
    final hasPermission = await requestLocationPermission();
    if (!hasPermission) return null;

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      return {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'speed': position.speed,
      };
    } catch (e) {
      return null;
    }
  }

  /// 获取定位流（持续定位）
  Stream<Position> getLocationStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // 移动 10 米才更新
      ),
    );
  }

  /// 停止定位（geolocator 的流会自动管理）
  void stopLocation() {
    // geolocator 通过取消 StreamSubscription 停止
  }

  /// 销毁
  void dispose() {
    // geolocator 不需要显式销毁
  }
}
