import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../l10n/l10n.dart';
import '../domain/trip_checklist.dart';

/// 出行装载清单页面
class TripChecklistScreen extends StatefulWidget {
  const TripChecklistScreen({super.key});

  @override
  State<TripChecklistScreen> createState() => _TripChecklistScreenState();
}

class _TripChecklistScreenState extends State<TripChecklistScreen> {
  static const _generator = TripChecklistGenerator();

  TripScenario _scenario = TripScenario.general;
  late List<ChecklistCategory> _checklist;
  final Set<String> _checked = {};

  @override
  void initState() {
    super.initState();
    _regenerate();
  }

  void _regenerate() {
    _checklist = _generator.generate(scenario: _scenario);
    _checked.clear();
  }

  int get _totalItems => _checklist.fold(0, (s, c) => s + c.items.length);
  double get _progress => _totalItems > 0 ? _checked.length / _totalItems : 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.tripChecklist),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => setState(_regenerate), tooltip: 'Reset'),
        ],
      ),
      body: Column(children: [
        // 场景选择
        Padding(
          padding: const EdgeInsets.all(12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: TripScenario.values.map((s) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(s.label),
                selected: _scenario == s,
                onSelected: (_) => setState(() { _scenario = s; _regenerate(); }),
              ),
            )).toList()),
          ),
        ),
        // 进度条
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('${_checked.length} / $_totalItems packed', style: const TextStyle(fontWeight: FontWeight.w500)),
              Text('${(_progress * 100).toInt()}%', style: TextStyle(fontWeight: FontWeight.bold, color: _progress >= 1.0 ? Colors.green : null)),
            ]),
            const SizedBox(height: 6),
            ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
              value: _progress, minHeight: 8, backgroundColor: Colors.grey[200],
              color: _progress >= 1.0 ? Colors.green : Theme.of(context).colorScheme.primary,
            )),
          ]),
        ),
        const SizedBox(height: 8),
        // 分类清单
        Expanded(child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _checklist.length,
          itemBuilder: (ctx, i) => _CategorySection(
            category: _checklist[i],
            checked: _checked,
            onToggle: (id) => setState(() {
              if (_checked.contains(id)) { _checked.remove(id); } else { _checked.add(id); }
            }),
          ),
        )),
      ]),
      bottomNavigationBar: _progress >= 1.0 ? SafeArea(child: Padding(
        padding: const EdgeInsets.all(16),
        child: FilledButton.icon(
          onPressed: () { Get.snackbar('Ready! 🎣', 'All items packed. Have a great session!', snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white); Navigator.pop(context); },
          icon: const Icon(Icons.check_circle),
          label: Text(context.tr.allPackedGoFish),
          style: FilledButton.styleFrom(backgroundColor: Colors.green, minimumSize: const Size.fromHeight(48)),
        ),
      )) : null,
    );
  }
}

class _CategorySection extends StatelessWidget {
  const _CategorySection({required this.category, required this.checked, required this.onToggle});
  final ChecklistCategory category;
  final Set<String> checked;
  final ValueChanged<String> onToggle;

  @override
  Widget build(BuildContext context) {
    final catChecked = category.items.where((i) => checked.contains(i.id)).length;
    final allDone = catChecked == category.items.length;

    return Padding(padding: const EdgeInsets.only(bottom: 12), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(category.icon, size: 18, color: allDone ? Colors.green : Colors.grey[700]),
          const SizedBox(width: 8),
          Text(category.name, style: TextStyle(fontWeight: FontWeight.bold, color: allDone ? Colors.green : null)),
          const Spacer(),
          Text('$catChecked/${category.items.length}', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
        ]),
        const SizedBox(height: 6),
        ...category.items.map((item) {
          final done = checked.contains(item.id);
          return InkWell(
            onTap: () => onToggle(item.id),
            child: Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(children: [
              Icon(done ? Icons.check_box : Icons.check_box_outline_blank, size: 20, color: done ? Colors.green : Colors.grey),
              const SizedBox(width: 10),
              Expanded(child: Text(item.name, style: TextStyle(decoration: done ? TextDecoration.lineThrough : null, color: done ? Colors.grey : null))),
              if (item.note != null) Tooltip(message: item.note!, child: const Icon(Icons.info_outline, size: 16, color: Colors.grey)),
            ])),
          );
        }),
      ],
    ));
  }
}
