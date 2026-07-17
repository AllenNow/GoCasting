import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/catch_repository.dart';
import '../domain/catch_analysis.dart';

/// 渔获条件关联分析页面
class CatchAnalysisScreen extends StatefulWidget {
  const CatchAnalysisScreen({super.key});

  @override
  State<CatchAnalysisScreen> createState() => _CatchAnalysisScreenState();
}

class _CatchAnalysisScreenState extends State<CatchAnalysisScreen> {
  late final CatchRepository _repo;
  CatchAnalysisResult? _result;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _repo = CatchRepository(Get.find<UserDatabase>());
    _loadAnalysis();
  }

  Future<void> _loadAnalysis() async {
    final catches = await _repo.getAll();
    const engine = CatchAnalysisEngine();
    final result = engine.analyze(catches);
    if (mounted) setState(() { _result = result; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.catchAnalysis)),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _result == null || _result!.totalCatches == 0
              ? _buildEmpty()
              : _buildAnalysis(context),
    );
  }

  Widget _buildEmpty() {
    return const Center(child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.analytics_outlined, size: 64, color: Colors.grey),
        SizedBox(height: 16),
        Text('暂无数据', style: TextStyle(fontSize: 18)),
        SizedBox(height: 8),
        Text('记录更多渔获后，分析将在此显示'),
      ],
    ));
  }

  Widget _buildAnalysis(BuildContext context) {
    final r = _result!;
    return ListView(padding: const EdgeInsets.all(16), children: [
      // 概览
      _OverviewCard(total: r.totalCatches),
      const SizedBox(height: 16),

      // 洞察卡片
      if (r.insights.isNotEmpty) ...[
        Text('📊 关键洞察', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...r.insights.map((i) => _InsightCard(insight: i)),
        const SizedBox(height: 16),
      ],

      // 潮汐分析
      if (r.tideAnalysis.isNotEmpty)
        _BarSection(title: '🌊 潮汐 vs 渔获', stats: r.tideAnalysis, color: Colors.blue),

      // 时段分析
      if (r.timeAnalysis.isNotEmpty)
        _BarSection(title: '⏰ 时段 vs 渔获', stats: r.timeAnalysis, color: Colors.orange),

      // 饵料分析
      if (r.baitAnalysis.isNotEmpty)
        _BarSection(title: '🎣 饵料效率', stats: r.baitAnalysis, color: Colors.green),

      // 钓组分析
      if (r.rigAnalysis.isNotEmpty)
        _BarSection(title: '🔗 钓组效率', stats: r.rigAnalysis, color: Colors.purple),

      // 地点分析
      if (r.locationAnalysis.isNotEmpty)
        _BarSection(title: '📍 钓点排行', stats: r.locationAnalysis, color: Colors.teal),
    ]);
  }
}

/// 概览卡片
class _OverviewCard extends StatelessWidget {
  const _OverviewCard({required this.total});
  final int total;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(padding: const EdgeInsets.all(20), child: Row(children: [
        Text('$total', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold)),
        const SizedBox(width: 12),
        const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('总渔获', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
          Text('已纳入分析', style: TextStyle(fontSize: 12, color: Colors.grey)),
        ]),
      ])),
    );
  }
}

/// 洞察卡片
class _InsightCard extends StatelessWidget {
  const _InsightCard({required this.insight});
  final Insight insight;

  @override
  Widget build(BuildContext context) {
    final confColor = switch (insight.confidence) {
      InsightConfidence.high => Colors.green,
      InsightConfidence.medium => Colors.orange,
      InsightConfidence.low => Colors.grey,
    };

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(padding: const EdgeInsets.all(12), child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(insight.icon, style: const TextStyle(fontSize: 24)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(child: Text(insight.title, style: const TextStyle(fontWeight: FontWeight.w600))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: confColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                child: Text(insight.confidence.label, style: TextStyle(fontSize: 10, color: confColor)),
              ),
            ]),
            const SizedBox(height: 4),
            Text(insight.description, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          ])),
        ],
      )),
    );
  }
}

/// 条形图区块
class _BarSection extends StatelessWidget {
  const _BarSection({required this.title, required this.stats, required this.color});
  final String title;
  final List<ConditionStat> stats;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final displayStats = stats.take(6).toList(); // 最多显示 6 项
    final maxCount = displayStats.isNotEmpty ? displayStats.first.count : 1;

    return Padding(padding: const EdgeInsets.only(bottom: 20), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...displayStats.map((s) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(children: [
            SizedBox(width: 90, child: Text(s.label, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
            Expanded(child: Stack(children: [
              Container(height: 20, decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(4))),
              FractionallySizedBox(
                widthFactor: s.count / maxCount,
                child: Container(height: 20, decoration: BoxDecoration(color: color.withValues(alpha: 0.7), borderRadius: BorderRadius.circular(4))),
              ),
            ])),
            const SizedBox(width: 8),
            SizedBox(width: 50, child: Text('${s.count}  ${s.percent.toStringAsFixed(0)}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500))),
          ]),
        )),
      ],
    ));
  }
}
