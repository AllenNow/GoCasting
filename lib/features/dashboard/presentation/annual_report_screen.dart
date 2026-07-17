import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../core/share/more_share_cards.dart';
import '../../../l10n/l10n.dart';
import '../../catch_log/data/catch_repository.dart';
import '../../maintenance/data/maintenance_repository.dart';

/// 年度报告页面
class AnnualReportScreen extends StatefulWidget {
  const AnnualReportScreen({super.key});

  @override
  State<AnnualReportScreen> createState() => _AnnualReportScreenState();
}

class _AnnualReportScreenState extends State<AnnualReportScreen> {
  bool _loading = true;
  final int _year = DateTime.now().year;
  int _totalCatches = 0;
  int _totalSessions = 0;
  double _heaviestFish = 0;
  String _heaviestSpecies = '';
  String? _topBait;
  String? _topLocation;
  int _speciesCount = 0;
  int _maintenanceCount = 0;
  int _daysActive = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final catchRepo = CatchRepository(Get.find<UserDatabase>());
    final maintRepo = Get.find<MaintenanceRepository>();

    final allCatches = await catchRepo.getAll();
    // 筛选当年
    final yearCatches = allCatches.where((c) => c.date.startsWith('$_year')).toList();

    final speciesSet = yearCatches.map((c) => c.species).toSet();
    final daysSet = yearCatches.map((c) => c.date).toSet();

    // 最大鱼
    double heaviest = 0;
    String heaviestSpecies = '';
    for (final c in yearCatches) {
      if (c.weightLb != null && c.weightLb! > heaviest) {
        heaviest = c.weightLb!;
        heaviestSpecies = c.species;
      }
    }

    // 最佳饵料
    final baitCounts = <String, int>{};
    for (final c in yearCatches) {
      if (c.bait != null && c.bait!.isNotEmpty) {
        baitCounts[c.bait!] = (baitCounts[c.bait!] ?? 0) + 1;
      }
    }
    final topBait = baitCounts.entries.isNotEmpty
        ? (baitCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).first.key
        : null;

    // 最佳地点
    final locCounts = <String, int>{};
    for (final c in yearCatches) {
      if (c.location != null && c.location!.isNotEmpty) {
        locCounts[c.location!] = (locCounts[c.location!] ?? 0) + 1;
      }
    }
    final topLoc = locCounts.entries.isNotEmpty
        ? (locCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).first.key
        : null;

    // 出行次数
    int sessionCount = 0;
    int maintCount = 0;
    final allGear = await maintRepo.getAllGear();
    for (final gear in allGear) {
      final logs = await maintRepo.getUsageLogs(gear.id);
      sessionCount += logs.length;
      final mLogs = await maintRepo.getMaintenanceLogs(gear.id);
      maintCount += mLogs.length;
    }

    if (mounted) {
      setState(() {
        _totalCatches = yearCatches.length;
        _totalSessions = sessionCount;
        _heaviestFish = heaviest;
        _heaviestSpecies = heaviestSpecies;
        _topBait = topBait;
        _topLocation = topLoc;
        _speciesCount = speciesSet.length;
        _maintenanceCount = maintCount;
        _daysActive = daysSet.length;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('$_year 年度报告'),
        actions: [
          IconButton(icon: const Icon(Icons.share), onPressed: _share, tooltip: '分享'),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _buildReport(context),
    );
  }

  Widget _buildReport(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      // 标题
      Card(
        color: Theme.of(context).colorScheme.primaryContainer,
        child: Padding(padding: const EdgeInsets.all(24), child: Column(children: [
          const Text('🎣', style: TextStyle(fontSize: 40)),
          const SizedBox(height: 8),
          Text('$_year 年钓鱼总结', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('$_daysActive 天的精彩回忆', style: TextStyle(color: Colors.grey[600])),
        ])),
      ),
      const SizedBox(height: 16),

      // 核心数据
      Row(children: [
        _BigStat(value: '$_totalCatches', label: '条鱼', emoji: '🐟'),
        _BigStat(value: '$_totalSessions', label: '次出行', emoji: '🚗'),
        _BigStat(value: '$_speciesCount', label: '种鱼', emoji: '🌈'),
      ]),
      const SizedBox(height: 16),

      // 高光时刻
      if (_heaviestFish > 0)
        _HighlightCard(emoji: '🏆', title: '年度最大鱼', value: '$_heaviestSpecies — ${_heaviestFish.toStringAsFixed(1)} lb'),
      if (_topBait != null)
        _HighlightCard(emoji: '🎣', title: '年度王牌饵料', value: _topBait!),
      if (_topLocation != null)
        _HighlightCard(emoji: '📍', title: '年度最佳钓点', value: _topLocation!),
      _HighlightCard(emoji: '🔧', title: '维护完成', value: '$_maintenanceCount 次'),
      const SizedBox(height: 24),

      // 分享按钮
      FilledButton.icon(
        onPressed: _share,
        icon: const Icon(Icons.share),
        label: Text(context.tr.shareAnnualReport),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
      ),
    ]);
  }

  Future<void> _share() async {
    MoreShareHelper.shareMonthlyReport(
      context,
      period: '$_year 年度',
      totalCatches: _totalCatches,
      totalSessions: _totalSessions,
      biggestFish: _heaviestFish > 0 ? '${_heaviestFish.toStringAsFixed(1)} lb' : '--',
      biggestSpecies: _heaviestSpecies,
      topBait: _topBait,
      topLocation: _topLocation,
    );
  }
}

class _BigStat extends StatelessWidget {
  const _BigStat({required this.value, required this.label, required this.emoji});
  final String value; final String label; final String emoji;
  @override
  Widget build(BuildContext context) => Expanded(child: Card(child: Padding(
    padding: const EdgeInsets.symmetric(vertical: 20),
    child: Column(children: [
      Text(emoji, style: const TextStyle(fontSize: 24)),
      const SizedBox(height: 8),
      Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
    ]),
  )));
}

class _HighlightCard extends StatelessWidget {
  const _HighlightCard({required this.emoji, required this.title, required this.value});
  final String emoji; final String title; final String value;
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 8),
    child: ListTile(
      leading: Text(emoji, style: const TextStyle(fontSize: 24)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      trailing: Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
    ),
  );
}
