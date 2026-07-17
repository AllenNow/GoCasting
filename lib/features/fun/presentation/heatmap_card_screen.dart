// ignore_for_file: use_build_context_synchronously
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../core/share/share_card_service.dart';
import '../../../l10n/l10n.dart';
import '../../catch_log/data/catch_repository.dart';

/// 出钓热力图 + 个人名片 + 趣味统计（合并页面）
class HeatmapCardScreen extends StatefulWidget {
  const HeatmapCardScreen({super.key});

  @override
  State<HeatmapCardScreen> createState() => _HeatmapCardScreenState();
}

class _HeatmapCardScreenState extends State<HeatmapCardScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  bool _loading = true;
  List<CatchLog> _catches = [];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _load();
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    final repo = CatchRepository(Get.find<UserDatabase>());
    final catches = await repo.getAll();
    if (mounted) setState(() { _catches = catches; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.moreFun),
        bottom: TabBar(controller: _tabCtrl, tabs: const [
          Tab(text: '热力图'),
          Tab(text: '名片'),
          Tab(text: '趣味统计'),
        ]),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(controller: _tabCtrl, children: [
              _HeatmapTab(catches: _catches),
              _ProfileCardTab(catches: _catches),
              _FunStatsTab(catches: _catches),
            ]),
    );
  }
}

/// ===== 出钓热力图（GitHub Contribution 风格）=====
class _HeatmapTab extends StatelessWidget {
  const _HeatmapTab({required this.catches});
  final List<CatchLog> catches;

  @override
  Widget build(BuildContext context) {
    final cardKey = GlobalKey();
    final year = DateTime.now().year;
    final dayMap = <int, int>{}; // dayOfYear → catch count
    for (final c in catches) {
      if (c.date.startsWith('$year')) {
        final d = DateTime.tryParse(c.date);
        if (d != null) {
          final doy = d.difference(DateTime(year, 1, 1)).inDays;
          dayMap[doy] = (dayMap[doy] ?? 0) + 1;
        }
      }
    }
    final activeDays = dayMap.length;
    final totalThisYear = catches.where((c) => c.date.startsWith('$year')).length;

    return SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
      RepaintBoundary(
        key: cardKey,
        child: Container(
          width: 360, padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.grey[900], borderRadius: BorderRadius.circular(16)),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Text('🎣 GoCasting', style: TextStyle(color: Colors.white54, fontSize: 11)),
              const Spacer(),
              Text('$year 出钓热力图', style: const TextStyle(color: Colors.white70, fontSize: 11)),
            ]),
            const SizedBox(height: 12),
            // 热力图网格（简化版：52周 × 7天）
            SizedBox(
              height: 90,
              child: Row(
                children: List.generate(52, (week) => Expanded(child: Column(
                  children: List.generate(7, (day) {
                    final doy = week * 7 + day;
                    final count = dayMap[doy] ?? 0;
                    final color = count == 0 ? Colors.grey[800]! : count == 1 ? Colors.green[300]! : count <= 3 ? Colors.green[500]! : Colors.green[700]!;
                    return Expanded(child: Container(
                      margin: const EdgeInsets.all(0.5),
                      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(1.5)),
                    ));
                  }),
                ))),
              ),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Text('$activeDays 天出钓', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              const SizedBox(width: 8),
              Text('$totalThisYear 条渔获', style: const TextStyle(color: Colors.white70)),
              const Spacer(),
              // 图例
              _Legend(Colors.grey[800]!, '0'),
              _Legend(Colors.green[300]!, '1'),
              _Legend(Colors.green[500]!, '2-3'),
              _Legend(Colors.green[700]!, '4+'),
            ]),
          ]),
        ),
      ),
      const SizedBox(height: 16),
      FilledButton.icon(
        onPressed: () => ShareCardService.shareWidget(repaintKey: cardKey, fileName: 'heatmap_$year.png', shareText: '🗓️ 我的 $year 年出钓热力图：$activeDays 天出钓，$totalThisYear 条渔获！'),
        icon: const Icon(Icons.share), label: Text(context.tr.shareHeatmap),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44)),
      ),
    ]));
  }
}

class _Legend extends StatelessWidget {
  const _Legend(this.color, this.label);
  final Color color; final String label;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(left: 4), child: Row(mainAxisSize: MainAxisSize.min, children: [
    Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
    const SizedBox(width: 2),
    Text(label, style: const TextStyle(color: Colors.white54, fontSize: 9)),
  ]));
}

/// ===== 个人钓鱼名片 =====
class _ProfileCardTab extends StatelessWidget {
  const _ProfileCardTab({required this.catches});
  final List<CatchLog> catches;

  @override
  Widget build(BuildContext context) {
    final cardKey = GlobalKey();
    final totalCatches = catches.length;
    final heaviest = catches.where((c) => c.weightLb != null).fold(0.0, (max, c) => c.weightLb! > max ? c.weightLb! : max);
    final speciesSet = catches.map((c) => c.species).toSet();
    final topSpecies = _topN(catches.map((c) => c.species).toList(), 3);

    return SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
      RepaintBoundary(
        key: cardKey,
        child: Container(
          width: 360, padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF0d47a1), Color(0xFF1565c0), Color(0xFF42a5f5)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            // 头像
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.2)),
              child: const Center(child: Text('🎣', style: TextStyle(fontSize: 32))),
            ),
            const SizedBox(height: 12),
            const Text('GoCasting 钓手', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            // 数据行
            Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              _NCStat(value: '$totalCatches', label: '渔获'),
              _NCStat(value: heaviest > 0 ? '${heaviest.toStringAsFixed(1)}lb' : '--', label: '最大鱼'),
              _NCStat(value: '${speciesSet.length}', label: '鱼种'),
            ]),
            const SizedBox(height: 16),
            // 最擅长鱼种
            if (topSpecies.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Text('擅长：${topSpecies.join(' / ')}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ),
            const SizedBox(height: 14),
            const Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10)),
          ]),
        ),
      ),
      const SizedBox(height: 16),
      FilledButton.icon(
        onPressed: () => ShareCardService.shareWidget(repaintKey: cardKey, fileName: 'fishing_card.png', shareText: '🎣 这是我的钓鱼名片！$totalCatches 条渔获，${speciesSet.length} 种鱼。'),
        icon: const Icon(Icons.share), label: Text(context.tr.shareProfileCard),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44)),
      ),
    ]));
  }

  List<String> _topN(List<String> items, int n) {
    final counts = <String, int>{};
    for (final i in items) { counts[i] = (counts[i] ?? 0) + 1; }
    final sorted = counts.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return sorted.take(n).map((e) => e.key).toList();
  }
}

class _NCStat extends StatelessWidget {
  const _NCStat({required this.value, required this.label});
  final String value; final String label;
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
    Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
  ]);
}

/// ===== 趣味统计 =====
class _FunStatsTab extends StatelessWidget {
  const _FunStatsTab({required this.catches});
  final List<CatchLog> catches;

  @override
  Widget build(BuildContext context) {
    final cardKey = GlobalKey();
    // 趣味数据计算
    final totalWeight = catches.where((c) => c.weightLb != null).fold(0.0, (sum, c) => sum + c.weightLb!);
    final releasedCount = catches.where((c) => c.released).length;
    final hours = catches.length * 3; // 假设每条鱼平均花 3 小时

    final funFacts = <_FunFact>[
      _FunFact('⏱️', '你在海边站了约 $hours 小时', '相当于看了 ${(hours / 2).toStringAsFixed(0)} 部电影'),
      _FunFact('⚖️', '总渔获重量约 ${totalWeight.toStringAsFixed(0)} 磅', '相当于 ${(totalWeight / 2.2).toStringAsFixed(0)} 公斤鲜鱼'),
      _FunFact('🐟', '你放流了 $releasedCount 条鱼', '如果它们排队游，长约 ${releasedCount * 40}cm'),
      _FunFact('🌊', '出钓 ${catches.length} 次', '平均每次带回 ${catches.isEmpty ? 0 : (totalWeight / catches.length).toStringAsFixed(1)} 磅'),
      if (catches.isNotEmpty) _FunFact('📅', '平均每 ${(365 / catches.length).toStringAsFixed(0)} 天出钓一次', '比上班还勤快？'),
    ];

    return SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
      RepaintBoundary(
        key: cardKey,
        child: Container(
          width: 360, padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF4a148c), Color(0xFF6a1b9a), Color(0xFF8e24aa)]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Row(children: [
              Text('🎣 GoCasting', style: TextStyle(color: Colors.white54, fontSize: 11)),
              Spacer(),
              Text('趣味统计', style: TextStyle(color: Colors.white54, fontSize: 11)),
            ]),
            const SizedBox(height: 14),
            const Center(child: Text('🤣', style: TextStyle(fontSize: 36))),
            const SizedBox(height: 8),
            const Center(child: Text('你可能不知道的钓鱼数据', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold))),
            const SizedBox(height: 16),
            ...funFacts.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(f.emoji, style: const TextStyle(fontSize: 18)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(f.title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
                  Text(f.subtitle, style: const TextStyle(color: Colors.white60, fontSize: 12)),
                ])),
              ]),
            )),
            const SizedBox(height: 10),
            const Center(child: Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10))),
          ]),
        ),
      ),
      const SizedBox(height: 16),
      FilledButton.icon(
        onPressed: () => ShareCardService.shareWidget(repaintKey: cardKey, fileName: 'fun_stats.png', shareText: '🤣 我的趣味钓鱼统计：站在海边约 $hours 小时，放流 $releasedCount 条鱼！'),
        icon: const Icon(Icons.share), label: Text(context.tr.shareFunStats),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(44)),
      ),
    ]));
  }
}

class _FunFact {
  const _FunFact(this.emoji, this.title, this.subtitle);
  final String emoji; final String title; final String subtitle;
}
