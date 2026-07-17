import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';
import '../domain/maintenance_tutorials.dart';

/// 维护教程库页面
class TutorialsScreen extends StatefulWidget {
  const TutorialsScreen({super.key, this.filterGearType});
  final String? filterGearType;

  @override
  State<TutorialsScreen> createState() => _TutorialsScreenState();
}

class _TutorialsScreenState extends State<TutorialsScreen> {
  static const _library = TutorialLibrary();
  String? _selectedGearType;
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _selectedGearType = widget.filterGearType;
  }

  List<MaintenanceTutorial> get _filteredTutorials {
    var list = _library.getAll();
    if (_selectedGearType != null) {
      list = list.where((t) => t.gearType == _selectedGearType).toList();
    }
    if (_selectedCategory != null) {
      list = list.where((t) => t.category == _selectedCategory).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.tutorialsScreen)),
      body: Column(
        children: [
          // 筛选器
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // 装备类型筛选
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    initialValue: _selectedGearType,
                    decoration: const InputDecoration(
                      labelText: 'Gear Type',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'reel', child: Text('Reel')),
                      DropdownMenuItem(value: 'rod', child: Text('Rod')),
                      DropdownMenuItem(value: 'line', child: Text('Line')),
                    ],
                    onChanged: (v) => setState(() => _selectedGearType = v),
                  ),
                ),
                const SizedBox(width: 8),
                // 类别筛选
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    initialValue: _selectedCategory,
                    decoration: const InputDecoration(
                      labelText: 'Category',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'cleaning', child: Text('Cleaning')),
                      DropdownMenuItem(value: 'lubrication', child: Text('Lubrication')),
                      DropdownMenuItem(value: 'inspection', child: Text('Inspection')),
                      DropdownMenuItem(value: 'replacement', child: Text('Replacement')),
                    ],
                    onChanged: (v) => setState(() => _selectedCategory = v),
                  ),
                ),
              ],
            ),
          ),
          // 教程列表
          Expanded(
            child: _filteredTutorials.isEmpty
                ? const Center(child: Text('No tutorials found for this filter'))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: _filteredTutorials.length,
                    itemBuilder: (ctx, i) => _TutorialCard(
                      tutorial: _filteredTutorials[i],
                      onTap: () => _openTutorial(_filteredTutorials[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  void _openTutorial(MaintenanceTutorial tutorial) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _TutorialDetailScreen(tutorial: tutorial),
      ),
    );
  }
}

/// 教程列表卡片
class _TutorialCard extends StatelessWidget {
  const _TutorialCard({required this.tutorial, required this.onTap});
  final MaintenanceTutorial tutorial;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _gearTypeColor(tutorial.gearType),
          child: Icon(_gearTypeIcon(tutorial.gearType), color: Colors.white, size: 20),
        ),
        title: Text(tutorial.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Row(
          children: [
            _DifficultyIndicator(difficulty: tutorial.difficulty),
            const SizedBox(width: 8),
            Text('${tutorial.estimatedMinutes} min'),
            const SizedBox(width: 8),
            Text('• ${tutorial.steps.length} steps'),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }

  Color _gearTypeColor(String type) => switch (type) {
        'reel' => Colors.blue,
        'rod' => Colors.green,
        'line' => Colors.orange,
        _ => Colors.grey,
      };

  IconData _gearTypeIcon(String type) => switch (type) {
        'reel' => Icons.settings,
        'rod' => Icons.straighten,
        'line' => Icons.linear_scale,
        _ => Icons.build,
      };
}

/// 难度指示器
class _DifficultyIndicator extends StatelessWidget {
  const _DifficultyIndicator({required this.difficulty});
  final TutorialDifficulty difficulty;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (i) => Icon(
        Icons.star,
        size: 12,
        color: i < difficulty.stars ? Colors.amber : Colors.grey[300],
      )),
    );
  }
}

/// 教程详情页
class _TutorialDetailScreen extends StatelessWidget {
  const _TutorialDetailScreen({required this.tutorial});
  final MaintenanceTutorial tutorial;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tutorial.title)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 概览信息
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _DifficultyIndicator(difficulty: tutorial.difficulty),
                      const SizedBox(width: 8),
                      Text(tutorial.difficulty.label),
                      const Spacer(),
                      const Icon(Icons.timer_outlined, size: 16),
                      const SizedBox(width: 4),
                      Text('~${tutorial.estimatedMinutes} min'),
                    ],
                  ),
                  if (tutorial.intervalRecommendation != null) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.schedule, size: 16, color: Colors.blue),
                        const SizedBox(width: 4),
                        Expanded(child: Text(tutorial.intervalRecommendation!,
                            style: const TextStyle(color: Colors.blue))),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 所需工具
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.handyman, size: 18),
                      const SizedBox(width: 8),
                      Text('Tools Needed', style: Theme.of(context).textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...tutorial.tools.map((tool) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            const Text('• ', style: TextStyle(fontSize: 16)),
                            Expanded(child: Text(tool)),
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 步骤列表
          Text('Steps', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...tutorial.steps.map((step) => _StepCard(step: step)),
        ],
      ),
    );
  }
}

/// 步骤卡片
class _StepCard extends StatelessWidget {
  const _StepCard({required this.step});
  final TutorialStep step;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: Text('${step.stepNumber}',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(step.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(step.description),
                    ],
                  ),
                ),
              ],
            ),
            if (step.tip != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.lightbulb_outline, size: 16, color: Colors.blue),
                    const SizedBox(width: 6),
                    Expanded(child: Text(step.tip!, style: const TextStyle(fontSize: 13, color: Colors.blue))),
                  ],
                ),
              ),
            ],
            if (step.warning != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.warning_amber, size: 16, color: Colors.orange),
                    const SizedBox(width: 6),
                    Expanded(child: Text(step.warning!, style: const TextStyle(fontSize: 13, color: Colors.deepOrange))),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
