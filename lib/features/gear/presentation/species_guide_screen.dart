import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../l10n/l10n.dart';
import '../domain/species_guide.dart';

/// 鱼种图鉴页面
class SpeciesGuideScreen extends StatefulWidget {
  const SpeciesGuideScreen({super.key});

  @override
  State<SpeciesGuideScreen> createState() => _SpeciesGuideScreenState();
}

class _SpeciesGuideScreenState extends State<SpeciesGuideScreen> {
  static const _library = SpeciesGuideLibrary();
  SpeciesCategory? _filter;
  String _search = '';

  List<SpeciesInfo> get _filtered {
    var list = _filter == null ? _library.getAll() : _library.getByCategory(_filter!);
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      list = list.where((s) => s.commonName.toLowerCase().contains(q) || s.scientificName.toLowerCase().contains(q)).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.speciesGuide)),
      body: Column(children: [
        // 搜索框
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: TextField(
            decoration: InputDecoration(
              hintText: context.tr.searchSpecies,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _search = v),
          ),
        ),
        // 类别筛选
        Padding(
          padding: const EdgeInsets.all(12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              FilterChip(label: Text(context.tr.all), selected: _filter == null,
                onSelected: (_) => setState(() => _filter = null)),
              const SizedBox(width: 8),
              ...SpeciesCategory.values.map((c) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(label: Text(c.label), selected: _filter == c,
                  onSelected: (_) => setState(() => _filter = _filter == c ? null : c)),
              )),
            ]),
          ),
        ),
        // 列表
        Expanded(
          child: _filtered.isEmpty
              ? const Center(child: Text('No species found'))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _filtered.length,
                  itemBuilder: (ctx, i) => _SpeciesCard(species: _filtered[i]),
                ),
        ),
      ]),
    );
  }
}

class _SpeciesCard extends StatelessWidget {
  const _SpeciesCard({required this.species});
  final SpeciesInfo species;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _SpeciesDetailPage(species: species))),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            // 鱼种图标
            CircleAvatar(
              radius: 24,
              backgroundColor: _categoryColor(species.category).withValues(alpha: 0.1),
              child: Text(_categoryEmoji(species.category), style: const TextStyle(fontSize: 22)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(species.commonName, style: const TextStyle(fontWeight: FontWeight.bold)),
              Text(species.scientificName, style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey[600])),
              const SizedBox(height: 4),
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: _categoryColor(species.category).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Text(species.category.label, style: TextStyle(fontSize: 10, color: _categoryColor(species.category))),
                ),
                const SizedBox(width: 6),
                Text(species.sizeRange.commonLb, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ]),
            ])),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ]),
        ),
      ),
    );
  }

  Color _categoryColor(SpeciesCategory cat) => switch (cat) {
    SpeciesCategory.gamefish => Colors.blue,
    SpeciesCategory.panfish => Colors.green,
    SpeciesCategory.shark => Colors.red,
  };

  String _categoryEmoji(SpeciesCategory cat) => switch (cat) {
    SpeciesCategory.gamefish => '🐟',
    SpeciesCategory.panfish => '🐠',
    SpeciesCategory.shark => '🦈',
  };
}

/// 鱼种详情页
class _SpeciesDetailPage extends StatelessWidget {
  const _SpeciesDetailPage({required this.species});
  final SpeciesInfo species;

  @override
  Widget build(BuildContext context) {
    final gear = species.gearRecommendation;
    return Scaffold(
      appBar: AppBar(title: Text(species.commonName)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // 标题
        Text(species.scientificName, style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey[600])),
        const SizedBox(height: 8),
        Text(species.description, style: const TextStyle(fontSize: 15)),
        const SizedBox(height: 16),

        // 识别特征
        _Section(title: context.tr.identification, icon: Icons.visibility, children: [
          ...species.identification.map((f) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
              Expanded(child: Text(f)),
            ]),
          )),
        ]),

        // 栖息地和行为
        _Section(title: context.tr.habitatBehavior, icon: Icons.water, children: [
          Text(species.habitat),
          const SizedBox(height: 8),
          Text(species.behavior),
        ]),

        // 装备推荐
        _Section(title: context.tr.gearRecommendation, icon: Icons.settings, children: [
          _InfoRow('Rod', '${gear.rodPower}, ${gear.rodLength}'),
          _InfoRow('Reel', gear.reelSize),
          _InfoRow('Main Line', gear.mainLine),
          _InfoRow('Leader', gear.leader),
          _InfoRow('Best Rig', species.bestRig),
        ]),

        // 最佳饵料
        _Section(title: context.tr.bestBait, icon: Icons.set_meal, children: [
          Wrap(spacing: 6, runSpacing: 4, children: species.bestBait.map((b) =>
            Chip(label: Text(b, style: const TextStyle(fontSize: 12)), visualDensity: VisualDensity.compact),
          ).toList()),
        ]),

        // 季节规律
        _Section(title: context.tr.seasonalPattern, icon: Icons.calendar_month, children: [
          Text(species.seasonalPattern),
        ]),

        // 体型
        _Section(title: context.tr.size, icon: Icons.straighten, children: [
          _InfoRow('Common', species.sizeRange.commonLb),
          _InfoRow('Trophy', species.sizeRange.trophyLb),
          _InfoRow('Length', species.sizeRange.commonLengthIn),
        ]),

        // 法规
        if (species.regulations != null)
          _Section(title: context.tr.regulations, icon: Icons.gavel, children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.orange.withValues(alpha: 0.3))),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                const SizedBox(width: 6),
                Expanded(child: Text(species.regulations!, style: const TextStyle(fontSize: 13))),
              ]),
            ),
          ]),

        const SizedBox(height: 16),
        // 配置装备按钮
        FilledButton.icon(
          onPressed: () => Get.toNamed(AppRoutes.gearWizard),
          icon: const Icon(Icons.auto_fix_high),
          label: Text('Configure Gear for ${species.commonName}'),
        ),
      ]),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.icon, required this.children});
  final String title; final IconData icon; final List<Widget> children;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Icon(icon, size: 18), const SizedBox(width: 8), Text(title, style: Theme.of(context).textTheme.titleMedium)]),
        const SizedBox(height: 8),
        ...children,
      ],
    ))),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);
  final String label; final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(children: [
      SizedBox(width: 80, child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13))),
      Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
    ]),
  );
}
