import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../l10n/l10n.dart';
import 'daily_fortune_screen.dart';
import 'heatmap_card_screen.dart';
import 'personality_test_screen.dart';

/// 趣味功能入口集合
class FunHubScreen extends StatelessWidget {
  const FunHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.funHub)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        _FunTile(
          emoji: '🔮', title: '今日钓鱼运势', subtitle: '看看今天适不适合出钓',
          color: Colors.indigo,
          onTap: () => Get.to(() => const DailyFortuneScreen()),
        ),
        _FunTile(
          emoji: '🧬', title: '钓鱼人格测试', subtitle: '你是什么类型的钓手？',
          color: Colors.purple,
          onTap: () => Get.to(() => const PersonalityTestScreen()),
        ),
        _FunTile(
          emoji: '🗓️', title: '年度报告', subtitle: '你的钓鱼年度总结',
          color: Colors.blue,
          onTap: () => Get.toNamed('/annual-report'),
        ),
        _FunTile(
          emoji: '🏁', title: '个人挑战', subtitle: '设定目标，超越自己',
          color: Colors.green,
          onTap: () => Get.toNamed('/challenges'),
        ),
        _FunTile(
          emoji: '🏆', title: '成就与等级', subtitle: '查看解锁的勋章',
          color: Colors.amber,
          onTap: () => Get.toNamed('/settings'),
        ),
        _FunTile(
          emoji: '🗓️', title: '热力图 / 名片 / 趣味统计', subtitle: '出钓日历、个人名片、搞笑数据',
          color: Colors.teal,
          onTap: () => Get.to(() => const HeatmapCardScreen()),
        ),
      ]),
    );
  }
}

class _FunTile extends StatelessWidget {
  const _FunTile({required this.emoji, required this.title, required this.subtitle, required this.color, required this.onTap});
  final String emoji; final String title; final String subtitle; final Color color; final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
          Container(
            width: 50, height: 50,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(emoji, style: const TextStyle(fontSize: 26))),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          ])),
          const Icon(Icons.chevron_right, color: Colors.grey),
        ])),
      ),
    );
  }
}
