import 'dart:async';

import 'package:amap_flutter_base/amap_flutter_base.dart';
import 'package:amap_flutter_map/amap_flutter_map.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/reference_db.dart';
import '../../../core/database/user_db.dart';
import '../../../core/map/amap_service.dart';
import '../../../l10n/l10n.dart';

/// 钓点地图页面
///
/// V5 核心功能：在高德地图上显示和管理钓点。
/// - 显示预加载海滩和用户自定义钓点
/// - GPS 定位当前位置
/// - 长按地图添加新钓点
/// - 点击钓点查看详情/导航
class SpotMapScreen extends StatefulWidget {
  const SpotMapScreen({super.key});

  @override
  State<SpotMapScreen> createState() => _SpotMapScreenState();
}

class _SpotMapScreenState extends State<SpotMapScreen> {
  AMapController? _mapController;
  final _markers = <Marker>{};
  LatLng? _currentPosition;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _initLocation();
    _loadSpots();
  }

  Future<void> _initLocation() async {
    final service = AMapService.instance;
    await service.initialize();
    final location = await service.getCurrentLocation();
    if (location != null && mounted) {
      final lat = location['latitude'] as double?;
      final lng = location['longitude'] as double?;
      if (lat != null && lng != null && lat != 0 && lng != 0) {
        setState(() => _currentPosition = LatLng(lat, lng));
        _mapController?.moveCamera(
          CameraUpdate.newLatLngZoom(_currentPosition!, 12),
        );
      }
    }
  }

  Future<void> _loadSpots() async {
    final markers = <Marker>{};

    // 加载预置海滩
    try {
      final refDb = Get.find<ReferenceDatabase>();
      final beaches = await refDb.select(refDb.beaches).get();
      for (final beach in beaches) {
        markers.add(Marker(
          position: LatLng(beach.lat, beach.lon),
          infoWindow: InfoWindow(title: beach.name, snippet: '${beach.region} • ${beach.beachType}'),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        ));
      }
    } catch (_) {}

    // 加载用户自定义海滩
    try {
      final userDb = Get.find<UserDatabase>();
      final customBeaches = await userDb.select(userDb.customBeaches).get();
      for (final beach in customBeaches) {
        markers.add(Marker(
          position: LatLng(beach.lat, beach.lon),
          infoWindow: InfoWindow(title: beach.name, snippet: beach.beachType),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        ));
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _markers.addAll(markers);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // 默认位置（中国大陆中心，如果 GPS 未就绪）
    final initialPosition = _currentPosition ?? const LatLng(30.0, 120.0);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.spotMap),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: _goToMyLocation,
            tooltip: '我的位置',
          ),
          IconButton(
            icon: const Icon(Icons.add_location_alt),
            onPressed: _addSpotAtCenter,
            tooltip: '在地图中心添加钓点',
          ),
        ],
      ),
      body: Stack(
        children: [
          AMapWidget(
            privacyStatement: const AMapPrivacyStatement(
              hasContains: true,
              hasShow: true,
              hasAgree: true,
            ),
            apiKey: const AMapApiKey(
              androidKey: AMapService.androidKey,
              iosKey: AMapService.iosKey,
            ),
            initialCameraPosition: CameraPosition(
              target: initialPosition,
              zoom: 10,
            ),
            mapType: MapType.normal,
            myLocationStyleOptions: MyLocationStyleOptions(
              true, // 显示定位蓝点
            ),
            markers: _markers,
            onMapCreated: (controller) {
              _mapController = controller;
              if (_currentPosition != null) {
                controller.moveCamera(
                  CameraUpdate.newLatLngZoom(_currentPosition!, 12),
                );
              }
            },
            onLongPress: _onLongPress,
            onTap: (_) {}, // 点击地图空白处
          ),
          // 加载指示器
          if (_loading)
            const Center(child: CircularProgressIndicator()),
          // 底部信息条
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 18, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '🔵 预置海滩  🟢 我的钓点  长按地图添加新钓点',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    Text('${_markers.length} 个钓点',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 长按地图添加钓点
  Future<void> _onLongPress(LatLng position) async {
    final nameCtrl = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr.addSpot),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(
                labelText: '钓点名称',
                border: OutlineInputBorder(),
                hintText: '例如：南沙堤岸',
              ),
              autofocus: true,
            ),
            const SizedBox(height: 8),
            Text(
              '${position.latitude.toStringAsFixed(5)}, ${position.longitude.toStringAsFixed(5)}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(context.tr.cancel)),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, nameCtrl.text),
            child: Text(context.tr.addSpotBtn),
          ),
        ],
      ),
    );
    nameCtrl.dispose();

    if (result != null && result.isNotEmpty) {
      // 保存到数据库
      final userDb = Get.find<UserDatabase>();
      final now = DateTime.now().toIso8601String();
      await userDb.into(userDb.customBeaches).insert(
        CustomBeachesCompanion.insert(
          name: result,
          lat: position.latitude,
          lon: position.longitude,
          nearestStationId: 1, // 默认站点（后续可自动查找最近站）
          createdAt: now,
        ),
      );

      // 添加到地图
      setState(() {
        _markers.add(Marker(
          position: position,
          infoWindow: InfoWindow(title: result),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        ));
      });

      Get.snackbar('已添加', '钓点「$result」已保存', snackPosition: SnackPosition.BOTTOM);
    }
  }

  /// 定位到当前位置
  Future<void> _goToMyLocation() async {
    final location = await AMapService.instance.getCurrentLocation();
    if (location != null) {
      final lat = location['latitude'] as double?;
      final lng = location['longitude'] as double?;
      if (lat != null && lng != null && lat != 0 && lng != 0) {
        final pos = LatLng(lat, lng);
        setState(() => _currentPosition = pos);
        _mapController?.moveCamera(CameraUpdate.newLatLngZoom(pos, 14));
      }
    }
  }

  /// 在地图中心添加钓点
  Future<void> _addSpotAtCenter() async {
    // 获取当前地图中心点
    if (_currentPosition != null) {
      await _onLongPress(_currentPosition!);
    } else {
      Get.snackbar('提示', '请先等待定位完成', snackPosition: SnackPosition.BOTTOM);
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}
