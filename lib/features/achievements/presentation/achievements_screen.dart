import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../core/share/catch_share_card.dart';
import '../../../l10n/l10n.dart';
import '../../catch_log/data/catch_repository.dart';
import '../../maintenance/data/maintenance_repository.dart';
import '../domain/achievement_engine.dart';

/// 成就页面
class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  List<AchievementStatus> _statuses = [];
  int _xp = 0;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final maintRepo = Get.find<MaintenanceRepository>();
    final catchRepo = CatchRepository(Get.find<UserDatabase>());

    // 收集统计数据
    final allGear = await maintRepo.getAllGear();
    final allCatches = await catchRepo.getAll();
    final speciesSet = allCatches.map((c) => c.species).toSet();
    final locationSet = allCatches.where((c) => c.location != null).map((c) => c.location!).toSet();
    final heaviest = allCatches.where((c) => c.weightLb != null).fold(0.0, (max, c) => c.weightLb! > max ? c.weightLb! : max);
    final dateSet = allCatches.map((c) => c.date).toSet();

    // 使用记录
    final allUsageLogs = <dynamic>[];
    for (final gear in allGear) {
      final logs = await maintRepo.getUsageLogs(gear.id);
      allUsageLogs.addAll(logs);
    }

    // 维护记录
    final allMaintLogs = <dynamic>[];
    for (final gear in allGear) {
      final logs = await maintRepo.getMaintenanceLogs(gear.id);
      allMaintLogs.addAll(logs);
    }

    final stats = UserStats(
      totalCatches: allCatches.length,
      totalSessions: allUsageLogs.length,
      totalGear: allGear.length,
      totalMaintenanceDone: allMaintLogs.length,
      heaviestFishLb: heaviest,
      speciesCount: speciesSet.length,
      daysActive: dateSet.length,
      locationsVisited: locationSet.length,
    );

    const engine = AchievementEngine();
    final statuses = engine.evaluate(stats);
    final xp = engine.calculateLevel(statuses);

    if (mounted) {
      setState(() { _statuses = statuses; _xp = xp; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(context.tr.achievements)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final unlocked = _statuses.where((s) => s.unlocked).length;
    final total = _statuses.length;
    const engine = AchievementEngine();
    final levelTitle = engine.getLevelTitle(_xp);

    return Scaffold(
      appBar: AppBar(title: Text(context.tr.achievements)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // 等级卡片
        Card(
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
            Text(levelTitle, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('$_xp XP • $unlocked / $total 成就已解锁', style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(value: unlocked / total, minHeight: 10, backgroundColor: Colors.grey[300]),
            ),
          ])),
        ),
        const SizedBox(height: 20),

        // 按类别分组
        ...AchievementCategory.values.map((cat) {
          final catStatuses = _statuses.where((s) => s.achievement.category == cat).toList();
          final catUnlocked = catStatuses.where((s) => s.unlocked).length;
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('${cat.labelZh} ($catUnlocked/${catStatuses.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ]),
            const SizedBox(height: 8),
            ...catStatuses.map((s) => _AchievementTile(status: s)),
            const SizedBox(height: 16),
          ]);
        }),
      ]),
    );
  }
}

class _AchievementTile extends StatelessWidget {
  const _AchievementTile({required this.status});
  final AchievementStatus status;

  @override
  Widget build(BuildContext context) {
    final a = status.achievement;
    final unlocked = status.unlocked;

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      color: unlocked ? null : Colors.grey[100],
      child: ListTile(
        leading: Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: unlocked ? a.category.color.withValues(alpha: 0.1) : Colors.grey[200],
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(child: Text(
            unlocked ? a.emoji : '🔒',
            style: TextStyle(fontSize: 22, color: unlocked ? null : Colors.grey),
          )),
        ),
        title: Text(
          a.titleZh,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: unlocked ? null : Colors.grey,
          ),
        ),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(a.descriptionZh, style: TextStyle(fontSize: 12, color: unlocked ? Colors.grey[600] : Colors.grey[400])),
          if (!unlocked && status.target != null) ...[
            const SizedBox(height: 4),
            Row(children: [
              Expanded(child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: status.progressPercent.clamp(0, 1),
                  minHeight: 4,
                  backgroundColor: Colors.grey[300],
                  color: Colors.blue,
                ),
              )),
              const SizedBox(width: 8),
              Text('${status.progress}/${status.target}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
            ]),
          ],
        ]),
        trailing: unlocked
            ? IconButton(
                icon: const Icon(Icons.share, size: 18),
                onPressed: () => ShareHelper.shareAchievement(
                  context,
                  emoji: a.emoji,
                  title: a.titleZh,
                  description: a.descriptionZh,
                  tier: a.tier.emoji,
                ),
              )
            : null,
      ),
    );
  }
}

extension on AchievementCategory {
  Color get color => switch (this) {
    AchievementCategory.catch_ => Colors.blue,
    AchievementCategory.gear => Colors.green,
    AchievementCategory.skill => Colors.orange,
    AchievementCategory.dedication => Colors.red,
    AchievementCategory.exploration => Colors.purple,
  };
}
