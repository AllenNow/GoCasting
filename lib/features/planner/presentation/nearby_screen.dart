import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/weather/nearby_search_service.dart';
import '../../../l10n/l10n.dart';

/// 周边搜索页面
class NearbyScreen extends StatefulWidget {
  const NearbyScreen({super.key, required this.lat, required this.lon, required this.locationName});
  final double lat;
  final double lon;
  final String locationName;

  @override
  State<NearbyScreen> createState() => _NearbyScreenState();
}

class _NearbyScreenState extends State<NearbyScreen> {
  static const _service = NearbySearchService();
  PoiCategory _selectedCategory = PoiCategory.tackleShop;
  List<NearbyPoi> _results = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _search();
  }

  Future<void> _search() async {
    setState(() => _loading = true);
    final results = await _service.search(
      lat: widget.lat,
      lon: widget.lon,
      category: _selectedCategory,
      radius: _selectedCategory == PoiCategory.tackleShop ? 10000 : 5000,
    );
    if (mounted) {
      setState(() {
        _results = results;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.nearbySearch),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(widget.locationName, style: Theme.of(context).textTheme.bodySmall),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // 类别选择
          Padding(
            padding: const EdgeInsets.all(12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: PoiCategory.values.map((cat) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    avatar: Icon(_catIcon(cat), size: 16),
                    label: Text(cat.label),
                    selected: _selectedCategory == cat,
                    onSelected: (_) {
                      setState(() => _selectedCategory = cat);
                      _search();
                    },
                  ),
                )).toList(),
              ),
            ),
          ),
          // 结果列表
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _results.isEmpty
                    ? _buildEmpty()
                    : _buildList(),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.location_off, size: 48, color: Colors.grey[400]),
          const SizedBox(height: 12),
          Text('附近未找到${_selectedCategory.label}', style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 4),
          const Text('尝试扩大搜索范围或更换类别', style: TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: _results.length,
      itemBuilder: (ctx, i) {
        final poi = _results[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: _catColor(_selectedCategory).withValues(alpha: 0.1),
              child: Icon(_catIcon(_selectedCategory), color: _catColor(_selectedCategory), size: 20),
            ),
            title: Text(poi.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(poi.address, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                if (poi.tel != null && poi.tel!.isNotEmpty)
                  Text('📞 ${poi.tel}', style: const TextStyle(fontSize: 11, color: Colors.blue)),
              ],
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(poi.distanceText, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                InkWell(
                  onTap: () => _navigateTo(poi),
                  child: const Icon(Icons.directions, color: Colors.blue, size: 22),
                ),
              ],
            ),
            isThreeLine: poi.tel != null && poi.tel!.isNotEmpty,
          ),
        );
      },
    );
  }

  /// 跳转高德导航
  Future<void> _navigateTo(NearbyPoi poi) async {
    // 使用高德 URI 协议启动导航
    final amapUrl = Uri.parse(
      'https://uri.amap.com/navigation?'
      'from=${widget.lon},${widget.lat},当前位置'
      '&to=${poi.lon},${poi.lat},${Uri.encodeComponent(poi.name)}'
      '&mode=car&coordinate=gaode'
    );

    if (await canLaunchUrl(amapUrl)) {
      await launchUrl(amapUrl, mode: LaunchMode.externalApplication);
    }
  }

  IconData _catIcon(PoiCategory cat) => switch (cat) {
        PoiCategory.tackleShop => Icons.phishing,
        PoiCategory.parking => Icons.local_parking,
        PoiCategory.convenience => Icons.store,
        PoiCategory.restaurant => Icons.restaurant,
        PoiCategory.toilet => Icons.wc,
        PoiCategory.gasStation => Icons.local_gas_station,
      };

  Color _catColor(PoiCategory cat) => switch (cat) {
        PoiCategory.tackleShop => Colors.blue,
        PoiCategory.parking => Colors.green,
        PoiCategory.convenience => Colors.orange,
        PoiCategory.restaurant => Colors.red,
        PoiCategory.toilet => Colors.purple,
        PoiCategory.gasStation => Colors.teal,
      };
}
