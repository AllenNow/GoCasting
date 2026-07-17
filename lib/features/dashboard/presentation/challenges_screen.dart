import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';

/// 个人挑战系统
///
/// 用户设定目标，追踪进度。短期（7天）和长期（30天）挑战。
class ChallengesScreen extends StatefulWidget {
  const ChallengesScreen({super.key});

  @override
  State<ChallengesScreen> createState() => _ChallengesScreenState();
}

class _ChallengesScreenState extends State<ChallengesScreen> {
  final _challenges = <Challenge>[
    // 预设挑战模板
    Challenge(id: '1', title: '本周钓 5 条', emoji: '🐟', target: 5, current: 0, type: ChallengeType.catches, duration: 7),
    Challenge(id: '2', title: '本月出行 8 次', emoji: '🚗', target: 8, current: 0, type: ChallengeType.sessions, duration: 30),
    Challenge(id: '3', title: '收集 3 种新鱼', emoji: '🌈', target: 3, current: 0, type: ChallengeType.species, duration: 30),
    Challenge(id: '4', title: '抛投突破 100m', emoji: '🎯', target: 100, current: 0, type: ChallengeType.castDistance, duration: 30),
    Challenge(id: '5', title: '完成 3 次维护', emoji: '🔧', target: 3, current: 0, type: ChallengeType.maintenance, duration: 14),
  ];

  @override
  Widget build(BuildContext context) {
    final active = _challenges.where((c) => c.isActive).toList();
    final completed = _challenges.where((c) => c.isCompleted).toList();
    final available = _challenges.where((c) => !c.isActive && !c.isCompleted).toList();

    return Scaffold(
      appBar: AppBar(title: Text(context.tr.challenges)),
      floatingActionButton: FloatingActionButton(
        onPressed: _createCustom,
        child: const Icon(Icons.add),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // 活跃挑战
        if (active.isNotEmpty) ...[
          Text('进行中', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...active.map((c) => _ChallengeTile(challenge: c, onIncrement: () => _increment(c))),
          const SizedBox(height: 16),
        ],

        // 已完成
        if (completed.isNotEmpty) ...[
          Text('✅ 已完成', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...completed.map((c) => _ChallengeTile(challenge: c)),
          const SizedBox(height: 16),
        ],

        // 可接取
        if (available.isNotEmpty) ...[
          Text('可接取', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...available.map((c) => _ChallengeTile(challenge: c, onStart: () => _start(c))),
        ],

        if (_challenges.isEmpty)
          Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const SizedBox(height: 40),
            const Icon(Icons.flag_outlined, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(context.tr.setFishingGoals),
            const SizedBox(height: 8),
            const Text('点击 + 创建自定义挑战', style: TextStyle(color: Colors.grey)),
          ])),
      ]),
    );
  }

  void _start(Challenge c) => setState(() => c.isActive = true);
  void _increment(Challenge c) => setState(() { if (c.current < c.target) c.current++; });

  Future<void> _createCustom() async {
    final titleCtrl = TextEditingController();
    final targetCtrl = TextEditingController(text: '10');
    var duration = 7;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) => Padding(
        padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(ctx).viewInsets.bottom + 16),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('创建挑战', style: Theme.of(ctx).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: '挑战名称', border: OutlineInputBorder(), hintText: '例如：本周每天出行')),
          const SizedBox(height: 12),
          TextField(controller: targetCtrl, decoration: const InputDecoration(labelText: '目标数量', border: OutlineInputBorder()), keyboardType: TextInputType.number),
          const SizedBox(height: 12),
          Text('持续时间', style: Theme.of(ctx).textTheme.titleSmall),
          const SizedBox(height: 8),
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 7, label: Text('7天')),
              ButtonSegment(value: 14, label: Text('14天')),
              ButtonSegment(value: 30, label: Text('30天')),
            ],
            selected: {duration},
            onSelectionChanged: (s) => setSheet(() => duration = s.first),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: () { if (titleCtrl.text.isNotEmpty) Navigator.pop(ctx, true); }, child: Text(context.tr.create)),
        ])),
      )),
    );

    if (result == true) {
      setState(() => _challenges.add(Challenge(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: titleCtrl.text,
        emoji: '🎯',
        target: int.tryParse(targetCtrl.text) ?? 10,
        current: 0,
        type: ChallengeType.custom,
        duration: duration,
        isActive: true,
      )));
    }
    titleCtrl.dispose(); targetCtrl.dispose();
  }
}

class _ChallengeTile extends StatelessWidget {
  const _ChallengeTile({required this.challenge, this.onStart, this.onIncrement});
  final Challenge challenge;
  final VoidCallback? onStart;
  final VoidCallback? onIncrement;

  @override
  Widget build(BuildContext context) {
    final progress = challenge.target > 0 ? challenge.current / challenge.target : 0.0;
    final completed = challenge.isCompleted;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: completed ? Colors.green.withValues(alpha: 0.05) : null,
      child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
        // Emoji
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: completed ? Colors.green.withValues(alpha: 0.1) : Colors.blue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(child: Text(challenge.emoji, style: const TextStyle(fontSize: 22))),
        ),
        const SizedBox(width: 12),
        // 信息
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(challenge.title, style: TextStyle(fontWeight: FontWeight.w600, decoration: completed ? TextDecoration.lineThrough : null)),
          const SizedBox(height: 4),
          Row(children: [
            Expanded(child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress.clamp(0, 1),
                minHeight: 6,
                backgroundColor: Colors.grey[200],
                color: completed ? Colors.green : Colors.blue,
              ),
            )),
            const SizedBox(width: 8),
            Text('${challenge.current}/${challenge.target}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          ]),
          Text('${challenge.duration} 天', style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ])),
        // 操作按钮
        if (onStart != null)
          FilledButton(onPressed: onStart, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12)), child: const Text('开始', style: TextStyle(fontSize: 12)))
        else if (onIncrement != null && !completed)
          IconButton(icon: const Icon(Icons.add_circle, color: Colors.blue), onPressed: onIncrement)
        else if (completed)
          const Icon(Icons.check_circle, color: Colors.green),
      ])),
    );
  }
}

/// 挑战模型
class Challenge {
  Challenge({
    required this.id,
    required this.title,
    required this.emoji,
    required this.target,
    required this.current,
    required this.type,
    required this.duration,
    this.isActive = false,
  });

  final String id;
  final String title;
  final String emoji;
  final int target;
  int current;
  final ChallengeType type;
  final int duration; // 天
  bool isActive;

  bool get isCompleted => current >= target;
}

enum ChallengeType {
  catches, sessions, species, castDistance, maintenance, custom;
}
