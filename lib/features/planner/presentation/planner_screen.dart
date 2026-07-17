import 'dart:convert';

import 'package:drift/drift.dart' as drift;
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/reference_db.dart';
import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../domain/astronomy.dart';
import '../domain/go_score.dart';
import '../domain/tide_predictor.dart';
import 'cast_tracker_screen.dart';
import 'coach_card.dart';
import 'go_score_screen.dart';
import 'nearby_screen.dart';
import 'spot_map_screen.dart';
import 'trip_checklist_screen.dart';
import 'weather_card.dart';

/// Planner 控制器
/// Planner 控制器
class PlannerController extends GetxController {
  final selectedBeach = Rxn<Beache>();
  final selectedDate = DateTime.now().obs;
  final beaches = <Beache>[].obs;

  UserDatabase get _userDb => Get.find<UserDatabase>();

  @override
  void onInit() {
    super.onInit();
    _loadBeaches();
    _loadSavedBeach();
  }

  Future<void> _loadBeaches() async {
    final db = Get.find<ReferenceDatabase>();
    beaches.value = await db.select(db.beaches).get();
  }

  /// 从本地设置恢复上次选择的海滩
  Future<void> _loadSavedBeach() async {
    final row = await (_userDb.select(_userDb.userSettings)
          ..where((t) => t.key.equals('selected_beach_id')))
        .getSingleOrNull();
    if (row != null) {
      final beachId = int.tryParse(row.value);
      if (beachId != null && beaches.isNotEmpty) {
        final saved = beaches.where((b) => b.id == beachId).firstOrNull;
        if (saved != null) {
          selectedBeach.value = saved;
        }
      } else if (beachId != null) {
        // 海滩还没加载完，等加载后再找
        ever(beaches, (list) {
          if (selectedBeach.value == null) {
            final saved = list.where((b) => b.id == beachId).firstOrNull;
            if (saved != null) selectedBeach.value = saved;
          }
        });
      }
    }
  }

  /// 选择海滩并持久化
  void selectBeach(Beache beach) {
    selectedBeach.value = beach;
    _saveSelectedBeach(beach.id);
  }

  void selectDate(DateTime date) => selectedDate.value = date;

  /// 保存选中的海滩 ID 到本地
  Future<void> _saveSelectedBeach(int beachId) async {
    final existing = await (_userDb.select(_userDb.userSettings)
          ..where((t) => t.key.equals('selected_beach_id')))
        .getSingleOrNull();

    if (existing != null) {
      await (_userDb.update(_userDb.userSettings)
            ..where((t) => t.key.equals('selected_beach_id')))
          .write(UserSettingsCompanion(value: drift.Value('$beachId')));
    } else {
      await _userDb.into(_userDb.userSettings).insert(
            UserSettingsCompanion.insert(
                key: 'selected_beach_id', value: '$beachId'),
          );
    }
  }
}

/// 出行规划器主页面
class PlannerScreen extends StatelessWidget {
  const PlannerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(PlannerController());

    return Scaffold(
      appBar: AppBar(
        // 左上角：海滩选择按钮
        leading: Obx(() => TextButton.icon(
              onPressed: () => _showBeachPicker(context, ctrl),
              icon: const Icon(Icons.beach_access, size: 18),
              label: Text(
                ctrl.selectedBeach.value?.name ?? context.tr.selectBeach,
                style: const TextStyle(fontSize: 12),
                overflow: TextOverflow.ellipsis,
              ),
            )),
        leadingWidth: 160,
        title: Text(context.tr.tabPlanner),
        actions: [
          IconButton(
            icon: const Icon(Icons.map),
            onPressed: () => Get.to(() => const SpotMapScreen()),
            tooltip: '钓点地图',
          ),
          IconButton(
            icon: const Icon(Icons.near_me),
            onPressed: () {
              final beach = ctrl.selectedBeach.value;
              if (beach != null) {
                Get.to(() => NearbyScreen(lat: beach.lat, lon: beach.lon, locationName: beach.name));
              }
            },
            tooltip: '周边搜索',
          ),
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () async {
              final d = await showDatePicker(
                context: context,
                initialDate: ctrl.selectedDate.value,
                firstDate: DateTime.now().subtract(const Duration(days: 365)),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (d != null) ctrl.selectDate(d);
            },
          ),
        ],
      ),
      body: Obx(() {
        final beach = ctrl.selectedBeach.value;
        if (beach == null) return const _NoBeachSelected();
        return _Dashboard(beach: beach, date: ctrl.selectedDate.value);
      }),
    );
  }

  void _showBeachPicker(BuildContext context, PlannerController ctrl) {
    Get.bottomSheet(
      Container(
        color: Theme.of(context).scaffoldBackgroundColor,
        height: Get.height * 0.7,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(context.tr.selectBeach, style: Theme.of(context).textTheme.titleLarge),
            ),
            Expanded(
              child: Obx(() {
                if (ctrl.beaches.isEmpty) {
                  return const Center(child: Text('No beaches loaded'));
                }
                return ListView.builder(
                  itemCount: ctrl.beaches.length,
                  itemBuilder: (_, i) {
                    final b = ctrl.beaches[i];
                    return ListTile(
                      leading: const Icon(Icons.beach_access),
                      title: Text(b.name),
                      subtitle: Text('${b.region} • ${b.beachType}'),
                      onTap: () {
                        ctrl.selectBeach(b);
                        Get.back();
                      },
                    );
                  },
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoBeachSelected extends StatelessWidget {
  const _NoBeachSelected();
  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.beach_access, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(context.tr.noBeachSelected, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500)),
          SizedBox(height: 8),
          Text(context.tr.noBeachDesc, style: TextStyle(color: Colors.grey)),
        ]),
      );
}

class _Dashboard extends StatelessWidget {
  const _Dashboard({required this.beach, required this.date});
  final Beache beach;
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    const astro = Astronomy();
    final moon = astro.getMoonPhase(date);
    final sun = astro.getSunTimes(date, beach.lat, beach.lon);
    final solunar = astro.getSolunarPeriods(date, beach.lat, beach.lon);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('${beach.name} — ${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        // AI 钓况教练
        CoachCard(lat: beach.lat, lon: beach.lon),
        const SizedBox(height: 12),
        // Go-Score 快捷卡片
        _GoScoreQuickCard(beach: beach, date: date),
        const SizedBox(height: 12),
        // V5: 实时天气卡片
        WeatherCard(cityCode: beach.region),
        const SizedBox(height: 12),
        _MoonCard(moon: moon),
        const SizedBox(height: 12),
        _SunCard(sun: sun),
        const SizedBox(height: 12),
        _SolunarCard(solunar: solunar),
        const SizedBox(height: 12),
        _TideCard(stationId: beach.nearestStationId, date: date),
        const SizedBox(height: 12),
        // V3: 出行清单入口
        OutlinedButton.icon(
          onPressed: () => Get.to(() => const TripChecklistScreen()),
          icon: const Icon(Icons.checklist_rtl),
          label: Text(context.tr.tripChecklist),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
        ),
        const SizedBox(height: 8),
        // V3-P3: 抛投距离追踪器
        OutlinedButton.icon(
          onPressed: () => Get.to(() => const CastTrackerScreen()),
          icon: const Icon(Icons.speed),
          label: Text(context.tr.castTracker),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44)),
        ),
      ],
    );
  }
}

class _MoonCard extends StatelessWidget {
  const _MoonCard({required this.moon});
  final MoonPhaseInfo moon;

  String _emoji(double p) {
    if (p < 0.0625) return '🌑';
    if (p < 0.1875) return '🌒';
    if (p < 0.3125) return '🌓';
    if (p < 0.4375) return '🌔';
    if (p < 0.5625) return '🌕';
    if (p < 0.6875) return '🌖';
    if (p < 0.8125) return '🌗';
    if (p < 0.9375) return '🌘';
    return '🌑';
  }

  @override
  Widget build(BuildContext context) => Card(child: Padding(
    padding: const EdgeInsets.all(16),
    child: Row(children: [
      Container(width: 50, height: 50, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.grey.shade900),
        child: Center(child: Text(_emoji(moon.phase), style: const TextStyle(fontSize: 28)))),
      const SizedBox(width: 16),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(moon.phaseName, style: const TextStyle(fontWeight: FontWeight.w600)),
        Text('${(moon.illumination * 100).toStringAsFixed(0)}% illuminated'),
      ]),
    ]),
  ));
}

class _SunCard extends StatelessWidget {
  const _SunCard({required this.sun});
  final SunTimes sun;

  @override
  Widget build(BuildContext context) => Card(child: Padding(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [Icon(Icons.wb_sunny, size: 20, color: Colors.orange), SizedBox(width: 8), Text('Sun', style: TextStyle(fontWeight: FontWeight.w600))]),
      const SizedBox(height: 8),
      Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
        _Time('Sunrise', sun.sunrise), _Time('Noon', sun.solarNoon), _Time('Sunset', sun.sunset),
      ]),
    ]),
  ));
}

class _Time extends StatelessWidget {
  const _Time(this.label, this.time);
  final String label; final DateTime? time;
  @override
  Widget build(BuildContext context) {
    final s = time != null ? '${time!.hour.toString().padLeft(2, '0')}:${time!.minute.toString().padLeft(2, '0')}' : '--:--';
    return Column(children: [Text(s, style: const TextStyle(fontWeight: FontWeight.w600)), Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey))]);
  }
}

class _SolunarCard extends StatelessWidget {
  const _SolunarCard({required this.solunar});
  final SolunarPeriods solunar;

  @override
  Widget build(BuildContext context) => Card(child: Padding(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [Icon(Icons.water, size: 20, color: Colors.blue), SizedBox(width: 8), Text('Solunar Feeding', style: TextStyle(fontWeight: FontWeight.w600))]),
      const SizedBox(height: 8),
      ...solunar.majorPeriods.map((p) => _Period(p.label, p.start, p.end, Colors.green)),
      ...solunar.minorPeriods.map((p) => _Period(p.label, p.start, p.end, Colors.orange)),
    ]),
  ));
}

class _Period extends StatelessWidget {
  const _Period(this.label, this.start, this.end, this.color);
  final String label; final DateTime start; final DateTime end; final Color color;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
    Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
    const SizedBox(width: 8), Text(label), const Spacer(),
    Text('${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')} - ${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontWeight: FontWeight.w500)),
  ]));
}

/// 潮汐图卡片
class _TideCard extends StatelessWidget {
  const _TideCard({required this.stationId, required this.date});
  final int stationId; final DateTime date;

  @override
  Widget build(BuildContext context) {
    return Card(child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [Icon(Icons.waves, size: 20, color: Colors.blue), SizedBox(width: 8), Text('Tide', style: TextStyle(fontWeight: FontWeight.w600))]),
        const SizedBox(height: 12),
        FutureBuilder<TidePrediction?>(
          future: _computeTide(),
          builder: (ctx, snap) {
            if (snap.connectionState == ConnectionState.waiting) return const SizedBox(height: 150, child: Center(child: CircularProgressIndicator()));
            final pred = snap.data;
            if (pred == null) return const SizedBox(height: 150, child: Center(child: Text('No tide data', style: TextStyle(color: Colors.grey))));
            return _TideChart(prediction: pred);
          },
        ),
      ]),
    ));
  }

  Future<TidePrediction?> _computeTide() async {
    final db = Get.find<ReferenceDatabase>();
    final station = await (db.select(db.tideStations)..where((t) => t.id.equals(stationId))).getSingleOrNull();
    if (station == null) return null;

    final json = jsonDecode(station.harmonicConstantsJson) as Map<String, dynamic>;
    final constituents = (json['constituents'] as List).map((c) {
      final m = c as Map<String, dynamic>;
      final name = m['name'] as String;
      return HarmonicConstant(
        name: name,
        amplitude: (m['amp'] as num).toDouble() * 0.3048, // feet → meters
        phaseGmt: (m['phase_gmt'] ?? m['phase'] as num).toDouble(),
        speed: (m['speed'] as num?)?.toDouble() ?? _speed(name),
      );
    }).toList();
    if (constituents.isEmpty) return null;

    const predictor = TidePredictor();
    final start = DateTime(date.year, date.month, date.day);
    return predictor.predict(datum: 2.0, constants: constituents, start: start, end: start.add(const Duration(hours: 23, minutes: 50)));
  }

  static double _speed(String name) => const {
    'M2': 28.9841042, 'S2': 30.0, 'N2': 28.4397295, 'K1': 15.0410686, 'O1': 13.9430356, 'P1': 14.9589314,
  }[name] ?? 28.9841;
}

class _TideChart extends StatelessWidget {
  const _TideChart({required this.prediction});
  final TidePrediction prediction;

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[];
    for (var i = 0; i < prediction.timestamps.length; i++) {
      final h = prediction.timestamps[i].hour + prediction.timestamps[i].minute / 60.0;
      spots.add(FlSpot(h, prediction.heights[i]));
    }
    final minY = prediction.heights.reduce((a, b) => a < b ? a : b) - 0.3;
    final maxY = prediction.heights.reduce((a, b) => a > b ? a : b) + 0.3;

    return SizedBox(height: 180, child: LineChart(LineChartData(
      minX: 0, maxX: 24, minY: minY, maxY: maxY,
      gridData: const FlGridData(show: true, horizontalInterval: 1, verticalInterval: 6),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, interval: 6, getTitlesWidget: (v, _) => Text('${v.toInt()}h', style: const TextStyle(fontSize: 10)))),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32, getTitlesWidget: (v, _) => Text('${v.toStringAsFixed(1)}m', style: const TextStyle(fontSize: 9)))),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: [LineChartBarData(spots: spots, isCurved: true, color: Colors.blue, barWidth: 2.5, dotData: const FlDotData(show: false), belowBarData: BarAreaData(show: true, color: Colors.blue.withValues(alpha: 0.1)))],
    )));
  }
}

/// Go-Score 快捷卡片 — 显示当天评分并链接到完整仪表板
class _GoScoreQuickCard extends StatelessWidget {
  const _GoScoreQuickCard({required this.beach, required this.date});
  final Beache beach;
  final DateTime date;

  @override
  Widget build(BuildContext context) {
    const engine = GoScoreEngine();
    final score = engine.calculateDaily(
      date: date,
      lat: beach.lat,
      lon: beach.lon,
    );

    final color = _goScoreColor(score.overallScore);
    final bestWindow = score.bestWindow;
    final bestStr = bestWindow != null
        ? '${bestWindow.start.hour.toString().padLeft(2, '0')}:${bestWindow.start.minute.toString().padLeft(2, '0')} — ${bestWindow.end.hour.toString().padLeft(2, '0')}:${bestWindow.end.minute.toString().padLeft(2, '0')}'
        : 'N/A';

    return GestureDetector(
      onTap: () => Get.to(() => GoScoreScreen(
            lat: beach.lat,
            lon: beach.lon,
            beachName: beach.name,
          )),
      child: Card(
        color: color.withValues(alpha: 0.08),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // 分数环
              SizedBox(
                width: 56,
                height: 56,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: score.overallScore / 100,
                      strokeWidth: 5,
                      backgroundColor: Colors.grey[300],
                      color: color,
                    ),
                    Text('${score.overallScore}',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: color)),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // 信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text('Go-Score: ',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text(score.label,
                            style: TextStyle(
                                fontWeight: FontWeight.bold, color: color)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('Best window: $bestStr',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  Color _goScoreColor(int s) {
    if (s >= 80) return Colors.green;
    if (s >= 60) return Colors.teal;
    if (s >= 40) return Colors.orange;
    if (s >= 20) return Colors.deepOrange;
    return Colors.red;
  }
}
