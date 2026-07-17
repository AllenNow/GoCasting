import 'package:flutter/material.dart';

import '../../../core/weather/weather_service.dart';
import '../../../l10n/l10n.dart';

/// 实时天气卡片
class WeatherCard extends StatefulWidget {
  const WeatherCard({super.key, required this.cityCode});
  final String cityCode; // 城市编码或城市名

  @override
  State<WeatherCard> createState() => _WeatherCardState();
}

class _WeatherCardState extends State<WeatherCard> {
  static const _service = WeatherService();
  WeatherData? _weather;
  List<WeatherForecast> _forecast = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadWeather();
  }

  Future<void> _loadWeather() async {
    final weather = await _service.getLiveWeather(widget.cityCode);
    final forecast = await _service.getForecast(widget.cityCode);

    if (mounted) {
      setState(() {
        _weather = weather;
        _forecast = forecast;
        _loading = false;
        _error = weather == null ? '无法获取天气数据' : null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: SizedBox(height: 40, child: CircularProgressIndicator(strokeWidth: 2))),
        ),
      );
    }

    if (_error != null || _weather == null) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.cloud_off, color: Colors.grey),
          title: Text(context.tr.weatherTitle),
          subtitle: Text(_error ?? '暂无数据'),
          trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () { setState(() => _loading = true); _loadWeather(); }),
        ),
      );
    }

    final w = _weather!;
    final scoreColor = w.fishingScore >= 70 ? Colors.green : w.fishingScore >= 40 ? Colors.orange : Colors.red;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 标题行
            Row(
              children: [
                const Icon(Icons.cloud, size: 20, color: Colors.blue),
                const SizedBox(width: 8),
                const Text('实时天气', style: TextStyle(fontWeight: FontWeight.w600)),
                const Spacer(),
                // 钓鱼评分
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: scoreColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(w.isFishingFriendly ? Icons.thumb_up : Icons.thumb_down, size: 12, color: scoreColor),
                      const SizedBox(width: 4),
                      Text('${w.fishingScore}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: scoreColor)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 主要天气信息
            Row(
              children: [
                // 温度 + 天气图标
                Column(
                  children: [
                    Text(w.weatherIcon, style: const TextStyle(fontSize: 36)),
                    const SizedBox(height: 4),
                    Text(w.weather, style: const TextStyle(fontSize: 13)),
                  ],
                ),
                const SizedBox(width: 16),
                // 温度大数字
                Text('${w.temperature}°', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold)),
                const Spacer(),
                // 详细数据
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _DetailRow(icon: Icons.air, text: '${w.windDirection} ${w.windPower}级'),
                    if (w.windSpeed != null)
                      _DetailRow(icon: Icons.speed, text: '${w.windSpeed!.toStringAsFixed(0)} km/h'),
                    _DetailRow(icon: Icons.water_drop, text: '湿度 ${w.humidity}%'),
                  ],
                ),
              ],
            ),

            // 预报
            if (_forecast.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),
              SizedBox(
                height: 60,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _forecast.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 16),
                  itemBuilder: (ctx, i) {
                    final f = _forecast[i];
                    final dateStr = f.date.length >= 10 ? f.date.substring(5) : f.date; // "07-16"
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(i == 0 ? '今天' : i == 1 ? '明天' : dateStr, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Text(f.dayWeather, style: const TextStyle(fontSize: 12)),
                        Text('${f.nightTemp}~${f.dayTemp}°', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                      ],
                    );
                  },
                ),
              ),
            ],

            // 更新时间
            const SizedBox(height: 8),
            Text('${w.city} • ${w.reportTime}', style: TextStyle(fontSize: 10, color: Colors.grey[400])),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 1),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: Colors.grey),
            const SizedBox(width: 4),
            Text(text, style: const TextStyle(fontSize: 12)),
          ],
        ),
      );
}
