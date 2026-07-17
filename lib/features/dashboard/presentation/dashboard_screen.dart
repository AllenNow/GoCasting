import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../core/database/user_db.dart';
import '../../achievements/domain/achievement_engine.dart';
import '../../catch_log/data/catch_repository.dart';
import '../../maintenance/data/maintenance_repository.dart';

/// 数据统计仪表板 — 首页概览
///
/// 汇总展示用户的全部核心数据，让每次打开 App 都有"成就感"。
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  int _totalCatches = 0;
  int _totalSessions = 0;
  int _totalGear = 0;
  int _speciesCount = 0;
  double _heaviestFish = 0;
  int _achievementsUnlocked = 0;
  int _achievementsTotal = 0;
  int _xp = 0;
  String _level = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final maintRepo = Get.find<MaintenanceRepository>();
    final catchRepo = CatchRepository(Get.find<UserDatabase>());

    final allGear = await maintRepo.getAllGear();
    final allCatches = await catchRepo.getAll();
    final speciesSet = allCatches.map((c) => c.species).toSet();
    final heaviest = allCatches.where((c) => c.weightLb != null).fold(0.0, (max, c) => c.weightLb! > max ? c.weightLb! : max);

    // 使用记录
    int sessionCount = 0;
    int maintCount = 0;
    for (final gear in allGear) {
      final logs = await maintRepo.getUsageLogs(gear.id);
      sessionCount += logs.length;
      final mLogs = await maintRepo.getMaintenanceLogs(gear.id);
      maintCount += mLogs.length;
    }

    // 成就
    final stats = UserStats(
      totalCatches: allCatches.length,
      totalSessions: sessionCount,
      totalGear: allGear.length,
      totalMaintenanceDone: maintCount,
      heaviestFishLb: heaviest,
      speciesCount: speciesSet.length,
    );
    const engine = AchievementEngine();
    final statuses = engine.evaluate(stats);
    final unlocked = statuses.where((s) => s.unlocked).length;
    final xp = engine.calculateLevel(statuses);

    if (mounted) {
      setState(() {
        _totalCatches = allCatches.length;
        _totalSessions = sessionCount;
        _totalGear = allGear.length;
        _speciesCount = speciesSet.length;
        _heaviestFish = heaviest;
        _achievementsUnlocked = unlocked;
        _achievementsTotal = statuses.length;
        _xp = xp;
        _level = engine.getLevelTitle(xp);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 等级卡片
        _LevelCard(level: _level, xp: _xp, unlocked: _achievementsUnlocked, total: _achievementsTotal),
        const SizedBox(height: 16),

        // 核心数据网格
        _StatsGrid(
          catches: _totalCatches,
          sessions: _totalSessions,
          gear: _totalGear,
          species: _speciesCount,
          heaviest: _heaviestFish,
        ),
        const SizedBox(height: 16),

        // 快捷操作
        _QuickActions(),
      ],
    );
  }
}

/// 等级卡片
class _LevelCard extends StatelessWidget {
  const _LevelCard({required this.level, required this.xp, required this.unlocked, required this.total});
  final String level;
  final int xp;
  final int unlocked;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: InkWell(
        onTap: () => Get.toNamed(AppRoutes.settings), // 跳转到设置→成就
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              // 等级图标
              Container(
                width: 56, height: 56,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Center(child: Text('🎣', style: TextStyle(fontSize: 28))),
              ),
              const SizedBox(width: 16),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(level, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('$xp XP • $unlocked/$total 成就', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: total > 0 ? unlocked / total : 0,
                      minHeight: 6,
                    ),
                  ),
                ],
              )),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}

/// 核心数据网格
class _StatsGrid extends StatelessWidget {
  const _StatsGrid({required this.catches, required this.sessions, required this.gear, required this.species, required this.heaviest});
  final int catches;
  final int sessions;
  final int gear;
  final int species;
  final double heaviest;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Row(children: [
        _StatTile(emoji: '🐟', value: '$catches', label: '总渔获', color: Colors.blue),
        const SizedBox(width: 8),
        _StatTile(emoji: '🚗', value: '$sessions', label: '总出行', color: Colors.green),
        const SizedBox(width: 8),
        _StatTile(emoji: '🎒', value: '$gear', label: '装备', color: Colors.orange),
      ]),
      const SizedBox(height: 8),
      Row(children: [
        _StatTile(emoji: '🌈', value: '$species', label: '鱼种', color: Colors.purple),
        const SizedBox(width: 8),
        _StatTile(emoji: '🏆', value: heaviest > 0 ? '${heaviest.toStringAsFixed(1)}lb' : '--', label: '最大鱼', color: Colors.amber),
        const SizedBox(width: 8),
        _StatTile(emoji: '📅', value: _daysSinceStart(), label: '钓龄(天)', color: Colors.teal),
      ]),
    ]);
  }

  String _daysSinceStart() {
    // 简化：使用当前年初作为起点
    return '${DateTime.now().difference(DateTime(DateTime.now().year, 1, 1)).inDays}';
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.emoji, required this.value, required this.label, required this.color});
  final String emoji; final String value; final String label; final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Card(child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      child: Column(children: [
        Text(emoji, style: const TextStyle(fontSize: 22)),
        const SizedBox(height: 6),
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ]),
    )));
  }
}

/// 快捷操作区
class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('快捷操作', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Row(children: [
          _ActionButton(emoji: '🐟', label: '记录渔获', onTap: () => Get.toNamed(AppRoutes.catchLog)),
          const SizedBox(width: 8),
          _ActionButton(emoji: '🌊', label: '出行规划', onTap: () => Get.toNamed(AppRoutes.planner)),
          const SizedBox(width: 8),
          _ActionButton(emoji: '🔧', label: '装备维护', onTap: () => Get.toNamed(AppRoutes.maintenance)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          _ActionButton(emoji: '🧮', label: '计算器', onTap: () => Get.toNamed(AppRoutes.gearCalculators)),
          const SizedBox(width: 8),
          _ActionButton(emoji: '🔗', label: '绳结指南', onTap: () => Get.toNamed(AppRoutes.gearKnotsRigs)),
          const SizedBox(width: 8),
          _ActionButton(emoji: '📖', label: '鱼种图鉴', onTap: () => Get.toNamed(AppRoutes.gearSpeciesGuide)),
        ]),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.emoji, required this.label, required this.onTap});
  final String emoji; final String label; final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Card(child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(children: [
          Text(emoji, style: const TextStyle(fontSize: 22)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11)),
        ]),
      ),
    )));
  }
}
