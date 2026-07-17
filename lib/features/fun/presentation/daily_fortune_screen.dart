// ignore_for_file: use_build_context_synchronously
import 'dart:math';

import 'package:flutter/material.dart';

import '../../../core/share/share_card_service.dart';
import '../../../l10n/l10n.dart';

/// 每日钓鱼运势
class DailyFortuneScreen extends StatelessWidget {
  const DailyFortuneScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final fortune = _generateFortune();
    final cardKey = GlobalKey();

    return Scaffold(
      appBar: AppBar(title: Text(context.tr.dailyFortune)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // 分享卡片
          _FortuneCard(fortune: fortune, repaintKey: cardKey),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () => ShareCardService.shareWidget(repaintKey: cardKey, fileName: 'fortune_${DateTime.now().day}.png', shareText: '🎣 今日钓鱼运势 ${fortune.stars}颗星！${fortune.quote}'),
            icon: const Icon(Icons.share),
            label: Text(context.tr.shareFortune),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          ),
        ]),
      ),
    );
  }

  Fortune _generateFortune() {
    final now = DateTime.now();
    final seed = now.year * 10000 + now.month * 100 + now.day;
    final rng = Random(seed);

    final species = _luckySpecies[rng.nextInt(_luckySpecies.length)];
    final bait = _luckyBaits[rng.nextInt(_luckyBaits.length)];
    final direction = _directions[rng.nextInt(_directions.length)];
    final timeSlot = _timeSlots[rng.nextInt(_timeSlots.length)];
    final stars = rng.nextInt(3) + 3; // 3-5 星
    final quote = _quotes[rng.nextInt(_quotes.length)];
    final mood = _moods[stars - 1];

    return Fortune(species: species, bait: bait, direction: direction, timeSlot: timeSlot, stars: stars, quote: quote, mood: mood);
  }

  static const _luckySpecies = ['条纹鲈', '红鼓', '竹荚鱼', '比目鱼', '鲳鱼', '黑鼓', '斑点海鳟', '西班牙鲭鱼', '银鱼', '军曹鱼', '羊鲷', '大海鲢'];
  static const _luckyBaits = ['切块鲱鱼', '活虾', '沙蟹', '鱿鱼条', '血虫', '活鳗鱼', '人工拟饵', '面包虫', '冷冻沙丁鱼'];
  static const _directions = ['东方', '南方', '西方', '北方', '东南方', '西南方', '东北方', '西北方'];
  static const _timeSlots = ['清晨 5:00-7:00', '早上 7:00-9:00', '上午 9:00-11:00', '傍晚 16:00-18:00', '黄昏 18:00-20:00', '夜间 20:00-22:00'];
  static const _quotes = [
    '耐心是钓鱼的第一美德',
    '大鱼往往在你想收杆的时候来',
    '今天的空军是明天爆桶的铺垫',
    '装备可以一般，心态必须优秀',
    '海风吹过，烦恼全部交给大海',
    '没有钓不到的鱼，只有不对的时机',
    '钓鱼不是为了鱼，是为了那份宁静',
    '今天出门，好运将伴随你的鱼线',
  ];
  static const _moods = ['⛅ 一般', '⛅ 一般', '🌤️ 不错', '☀️ 极佳', '🌟 爆发'];
}

class Fortune {
  const Fortune({required this.species, required this.bait, required this.direction, required this.timeSlot, required this.stars, required this.quote, required this.mood});
  final String species; final String bait; final String direction; final String timeSlot; final int stars; final String quote; final String mood;
}

class _FortuneCard extends StatelessWidget {
  const _FortuneCard({required this.fortune, required this.repaintKey});
  final Fortune fortune; final GlobalKey repaintKey;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final dateStr = '${now.year}.${now.month}.${now.day}';

    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360, padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF1a237e), Color(0xFF283593), Color(0xFF3949ab)]),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            const Text('🎣 GoCasting', style: TextStyle(color: Colors.white70, fontSize: 11)),
            const Spacer(),
            Text(dateStr, style: const TextStyle(color: Colors.white54, fontSize: 11)),
          ]),
          const SizedBox(height: 16),
          const Text('🔮', style: TextStyle(fontSize: 40)),
          const SizedBox(height: 8),
          const Text('今日钓鱼运势', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          // 星级
          Row(mainAxisAlignment: MainAxisAlignment.center, children: List.generate(5, (i) => Text(i < fortune.stars ? '⭐' : '☆', style: const TextStyle(fontSize: 20)))),
          const SizedBox(height: 4),
          Text(fortune.mood, style: const TextStyle(color: Colors.amber, fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(height: 16),
          // 运势项
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              _FortuneLine(label: '幸运鱼种', value: '🐟 ${fortune.species}'),
              _FortuneLine(label: '幸运饵料', value: '🎣 ${fortune.bait}'),
              _FortuneLine(label: '幸运方位', value: '🧭 ${fortune.direction}'),
              _FortuneLine(label: '幸运时段', value: '⏰ ${fortune.timeSlot}'),
            ]),
          ),
          const SizedBox(height: 14),
          // 金句
          Text('「${fortune.quote}」', style: const TextStyle(color: Colors.white70, fontSize: 13, fontStyle: FontStyle.italic), textAlign: TextAlign.center),
          const SizedBox(height: 12),
          const Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10)),
        ]),
      ),
    );
  }
}

class _FortuneLine extends StatelessWidget {
  const _FortuneLine({required this.label, required this.value});
  final String label; final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(children: [
      SizedBox(width: 70, child: Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12))),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 13)),
    ]),
  );
}
