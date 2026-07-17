import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';
import '../domain/knots_and_rigs.dart';

/// 钓组/打结指南主页面
class KnotsRigsScreen extends StatelessWidget {
  const KnotsRigsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr.knotsRigsScreen),
          bottom: TabBar(tabs: [
            Tab(icon: const Icon(Icons.link), text: context.tr.knots),
            Tab(icon: const Icon(Icons.schema_outlined), text: context.tr.rigs),
          ]),
        ),
        body: const TabBarView(children: [
          _KnotsTab(),
          _RigsTab(),
        ]),
      ),
    );
  }
}

// ========== 绳结标签页 ==========

class _KnotsTab extends StatefulWidget {
  const _KnotsTab();
  @override
  State<_KnotsTab> createState() => _KnotsTabState();
}

class _KnotsTabState extends State<_KnotsTab> {
  static const _library = KnotLibrary();
  KnotCategory? _filter;

  List<FishingKnot> get _filteredKnots {
    if (_filter == null) return _library.getAll();
    return _library.getByCategory(_filter!);
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // 类别筛选
      Padding(
        padding: const EdgeInsets.all(12),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: [
            FilterChip(label: Text(context.tr.all), selected: _filter == null,
              onSelected: (_) => setState(() => _filter = null)),
            const SizedBox(width: 8),
            ...KnotCategory.values.map((c) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(label: Text(c.label), selected: _filter == c,
                onSelected: (_) => setState(() => _filter = _filter == c ? null : c)),
            )),
          ]),
        ),
      ),
      // 列表
      Expanded(
        child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: _filteredKnots.length,
          itemBuilder: (ctx, i) {
            final knot = _filteredKnots[i];
            return _KnotCard(knot: knot, onTap: () => _openKnotDetail(knot));
          },
        ),
      ),
    ]);
  }

  void _openKnotDetail(FishingKnot knot) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => _KnotDetailPage(knot: knot)));
  }
}

class _KnotCard extends StatelessWidget {
  const _KnotCard({required this.knot, required this.onTap});
  final FishingKnot knot;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _categoryColor(knot.category).withValues(alpha: 0.1),
          child: Text('${knot.strength}%', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _categoryColor(knot.category))),
        ),
        title: Text(knot.name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(knot.bestFor, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 4),
          Row(children: [
            _DifficultyDots(difficulty: knot.difficulty),
            const SizedBox(width: 8),
            ...knot.lineTypes.map((t) => Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(8)),
                child: Text(t, style: const TextStyle(fontSize: 10)),
              ),
            )),
          ]),
        ]),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  Color _categoryColor(KnotCategory cat) => switch (cat) {
    KnotCategory.terminal => Colors.blue,
    KnotCategory.lineToLine => Colors.green,
    KnotCategory.loop => Colors.purple,
    KnotCategory.shockLeader => Colors.orange,
  };
}

class _DifficultyDots extends StatelessWidget {
  const _DifficultyDots({required this.difficulty});
  final KnotDifficulty difficulty;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: List.generate(3, (i) => Icon(Icons.circle, size: 8,
      color: i < difficulty.stars ? Colors.amber : Colors.grey[300])),
  );
}

// ========== 绳结详情页 ==========

class _KnotDetailPage extends StatelessWidget {
  const _KnotDetailPage({required this.knot});
  final FishingKnot knot;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(knot.name)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // 概览
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              _DifficultyDots(difficulty: knot.difficulty),
              const SizedBox(width: 8),
              Text(knot.difficulty.label),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Text('${knot.strength}% strength', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12)),
              ),
            ]),
            const SizedBox(height: 12),
            Text(knot.bestFor),
            const SizedBox(height: 8),
            Wrap(spacing: 6, children: knot.lineTypes.map((t) => Chip(label: Text(t), visualDensity: VisualDensity.compact)).toList()),
          ],
        ))),
        const SizedBox(height: 16),
        // 步骤
        Text(context.tr.steps, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...knot.steps.map((step) => _StepTile(step: step)),
        // 提示
        if (knot.tips != null) ...[
          const SizedBox(height: 16),
          Card(color: Colors.blue.withValues(alpha: 0.05), child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.lightbulb_outline, color: Colors.blue, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(knot.tips!, style: const TextStyle(color: Colors.blue))),
            ]),
          )),
        ],
      ]),
    );
  }
}

// ========== 钓组标签页 ==========

class _RigsTab extends StatelessWidget {
  const _RigsTab();

  @override
  Widget build(BuildContext context) {
    const library = RigLibrary();
    final rigs = library.getAll();

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: rigs.length,
      itemBuilder: (ctx, i) {
        final rig = rigs[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: InkWell(
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _RigDetailPage(rig: rig))),
            borderRadius: BorderRadius.circular(12),
            child: Padding(padding: const EdgeInsets.all(16), child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(rig.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text(rig.description, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 4, children: rig.targetSpecies.take(4).map((s) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(color: Colors.teal.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Text(s, style: const TextStyle(fontSize: 11, color: Colors.teal)),
                )).toList()),
              ],
            )),
          ),
        );
      },
    );
  }
}

// ========== 钓组详情页 ==========

class _RigDetailPage extends StatelessWidget {
  const _RigDetailPage({required this.rig});
  final FishingRig rig;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(rig.name)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(rig.description, style: const TextStyle(fontSize: 15)),
        const SizedBox(height: 8),
        Text('Best for: ${rig.bestFor}', style: TextStyle(color: Colors.grey[600])),
        const SizedBox(height: 16),
        // 目标鱼种
        Wrap(spacing: 6, runSpacing: 4, children: rig.targetSpecies.map((s) => Chip(label: Text(s), visualDensity: VisualDensity.compact)).toList()),
        const SizedBox(height: 16),
        // 所需组件
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [const Icon(Icons.inventory_2, size: 18), const SizedBox(width: 8), Text(context.tr.components, style: Theme.of(context).textTheme.titleMedium)]),
            const SizedBox(height: 8),
            ...rig.components.map((c) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(children: [
                const Text('• '), Expanded(child: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w500))),
                Text(c.spec, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                if (c.quantity > 1) Text(' ×${c.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
              ]),
            )),
          ],
        ))),
        const SizedBox(height: 16),
        // 组装步骤
        Text(context.tr.assembly, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...rig.assemblySteps.map((step) => _StepTile(step: step)),
        // 提示
        if (rig.tips != null) ...[
          const SizedBox(height: 16),
          Card(color: Colors.blue.withValues(alpha: 0.05), child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.lightbulb_outline, color: Colors.blue, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(rig.tips!, style: const TextStyle(color: Colors.blue))),
            ]),
          )),
        ],
      ]),
    );
  }
}

// ========== 共用步骤组件 ==========

class _StepTile extends StatelessWidget {
  const _StepTile({required this.step});
  final KnotStep step;

  @override
  Widget build(BuildContext context) {
    return Card(margin: const EdgeInsets.only(bottom: 8), child: Padding(
      padding: const EdgeInsets.all(12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        CircleAvatar(radius: 14, backgroundColor: Theme.of(context).colorScheme.primary,
          child: Text('${step.stepNumber}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(step.instruction),
          if (step.tip != null) Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.info_outline, size: 14, color: Colors.orange),
              const SizedBox(width: 4),
              Expanded(child: Text(step.tip!, style: const TextStyle(fontSize: 12, color: Colors.orange))),
            ]),
          ),
        ])),
      ]),
    ));
  }
}
