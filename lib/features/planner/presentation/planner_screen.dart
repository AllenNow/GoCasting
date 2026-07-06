import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/astronomy.dart';
import '../providers/planner_providers.dart';

/// 出行规划器主页面 — Session Dashboard
class PlannerScreen extends ConsumerWidget {
  const PlannerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedBeach = ref.watch(selectedBeachProvider);
    final selectedDate = ref.watch(selectedDateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Planner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_today),
            onPressed: () => _pickDate(context, ref, selectedDate),
            tooltip: 'Select Date',
          ),
        ],
      ),
      body: selectedBeach == null
          ? const _NoBeachSelected()
          : _Dashboard(
              date: selectedDate,
              lat: selectedBeach.lat,
              lon: selectedBeach.lon,
              beachName: selectedBeach.name,
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showBeachPicker(context, ref),
        icon: const Icon(Icons.beach_access),
        label: Text(selectedBeach?.name ?? 'Select Beach'),
      ),
    );
  }

  Future<void> _pickDate(
      BuildContext context, WidgetRef ref, DateTime current) async {
    final date = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      ref.read(selectedDateProvider.notifier).state = date;
    }
  }

  void _showBeachPicker(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _BeachPickerSheet(),
    );
  }
}

class _NoBeachSelected extends StatelessWidget {
  const _NoBeachSelected();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.beach_access, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'Select a Beach',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500),
          ),
          SizedBox(height: 8),
          Text(
            'Tap the button below to choose your fishing spot',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}

/// Session Dashboard — 潮汐 + 月相 + 日出日落 + 日月
class _Dashboard extends ConsumerWidget {
  const _Dashboard({
    required this.date,
    required this.lat,
    required this.lon,
    required this.beachName,
  });

  final DateTime date;
  final double lat;
  final double lon;
  final String beachName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final astroData =
        ref.watch(astronomyProvider((date: date, lat: lat, lon: lon)));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 日期和位置
        Text(
          '$beachName — ${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 16),

        // 月相卡片
        _MoonCard(moon: astroData.moon),
        const SizedBox(height: 12),

        // 日出日落卡片
        _SunCard(sun: astroData.sun),
        const SizedBox(height: 12),

        // Solunar 活跃期
        _SolunarCard(solunar: astroData.solunar),
        const SizedBox(height: 12),

        // 潮汐（需要数据填充后才能显示）
        _TidePlaceholder(),
      ],
    );
  }
}

class _MoonCard extends StatelessWidget {
  const _MoonCard({required this.moon});
  final MoonPhaseInfo moon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // 月相图标
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.grey.shade900,
              ),
              child: Center(
                child: Text(
                  _moonEmoji(moon.phase),
                  style: const TextStyle(fontSize: 28),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(moon.phaseName,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                      '${(moon.illumination * 100).toStringAsFixed(0)}% illuminated'),
                  Text('Moon age: ${moon.ageInDays.toStringAsFixed(1)} days'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _moonEmoji(double phase) {
    if (phase < 0.0625) return '🌑';
    if (phase < 0.1875) return '🌒';
    if (phase < 0.3125) return '🌓';
    if (phase < 0.4375) return '🌔';
    if (phase < 0.5625) return '🌕';
    if (phase < 0.6875) return '🌖';
    if (phase < 0.8125) return '🌗';
    if (phase < 0.9375) return '🌘';
    return '🌑';
  }
}

class _SunCard extends StatelessWidget {
  const _SunCard({required this.sun});
  final SunTimes sun;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.wb_sunny, size: 20, color: Colors.orange),
                SizedBox(width: 8),
                Text('Sun', style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _TimeDisplay(
                    label: 'Sunrise', time: sun.sunrise, icon: Icons.arrow_upward),
                _TimeDisplay(
                    label: 'Noon', time: sun.solarNoon, icon: Icons.wb_sunny),
                _TimeDisplay(
                    label: 'Sunset', time: sun.sunset, icon: Icons.arrow_downward),
              ],
            ),
            if (sun.civilTwilightBegin != null) ...[
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _TimeDisplay(
                      label: 'First Light',
                      time: sun.civilTwilightBegin,
                      icon: Icons.brightness_low),
                  _TimeDisplay(
                      label: 'Last Light',
                      time: sun.civilTwilightEnd,
                      icon: Icons.brightness_low),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SolunarCard extends StatelessWidget {
  const _SolunarCard({required this.solunar});
  final SolunarPeriods solunar;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.water, size: 20, color: Colors.blue),
                SizedBox(width: 8),
                Text('Solunar Feeding Periods',
                    style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 12),
            if (solunar.majorPeriods.isNotEmpty) ...[
              const Text('Major (2h windows)',
                  style: TextStyle(color: Colors.grey, fontSize: 12)),
              ...solunar.majorPeriods.map((p) => _PeriodRow(
                    label: p.label,
                    start: p.start,
                    end: p.end,
                    color: Colors.green,
                  )),
            ],
            if (solunar.minorPeriods.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Minor (1h windows)',
                  style: TextStyle(color: Colors.grey, fontSize: 12)),
              ...solunar.minorPeriods.map((p) => _PeriodRow(
                    label: p.label,
                    start: p.start,
                    end: p.end,
                    color: Colors.orange,
                  )),
            ],
          ],
        ),
      ),
    );
  }
}

class _TidePlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Icon(Icons.waves, size: 40, color: Colors.grey),
            const SizedBox(height: 8),
            Text(
              'Tide predictions available after beach data is loaded',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeDisplay extends StatelessWidget {
  const _TimeDisplay({required this.label, this.time, required this.icon});
  final String label;
  final DateTime? time;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final timeStr = time != null
        ? '${time!.hour.toString().padLeft(2, '0')}:${time!.minute.toString().padLeft(2, '0')}'
        : '--:--';
    return Column(
      children: [
        Icon(icon, size: 16, color: Colors.grey),
        const SizedBox(height: 4),
        Text(timeStr, style: const TextStyle(fontWeight: FontWeight.w600)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }
}

class _PeriodRow extends StatelessWidget {
  const _PeriodRow({
    required this.label,
    required this.start,
    required this.end,
    required this.color,
  });
  final String label;
  final DateTime start;
  final DateTime end;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final startStr =
        '${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}';
    final endStr =
        '${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(label),
          const Spacer(),
          Text('$startStr - $endStr',
              style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

/// 海滩选择器底部弹出
class _BeachPickerSheet extends ConsumerWidget {
  const _BeachPickerSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final beachesAsync = ref.watch(beachListProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      expand: false,
      builder: (context, controller) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Select Beach',
                  style: Theme.of(context).textTheme.titleLarge),
            ),
            Expanded(
              child: beachesAsync.when(
                loading: () =>
                    const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Error: $err')),
                data: (beaches) {
                  if (beaches.isEmpty) {
                    return const Center(
                      child: Text('No beaches loaded yet.\n'
                          'Beach data will be available after database seeding.'),
                    );
                  }
                  return ListView.builder(
                    controller: controller,
                    itemCount: beaches.length,
                    itemBuilder: (context, index) {
                      final beach = beaches[index];
                      return ListTile(
                        leading: const Icon(Icons.beach_access),
                        title: Text(beach.name),
                        subtitle: Text('${beach.region} • ${beach.beachType}'),
                        onTap: () {
                          ref.read(selectedBeachProvider.notifier).state =
                              beach;
                          Navigator.pop(context);
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}
