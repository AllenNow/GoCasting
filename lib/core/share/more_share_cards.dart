// ignore_for_file: use_build_context_synchronously
import 'package:flutter/material.dart';

import 'share_card_service.dart';

/// Go-Score 邀请卡片 — "明天 85 分，一起去！"
class GoScoreShareCard extends StatelessWidget {
  const GoScoreShareCard({super.key, required this.repaintKey, required this.score, required this.bestWindow, required this.beachName, required this.date});
  final GlobalKey repaintKey;
  final int score;
  final String bestWindow; // "06:15 — 08:30"
  final String beachName;
  final String date;

  @override
  Widget build(BuildContext context) {
    final bgColors = score >= 70
        ? [const Color(0xFF1b5e20), const Color(0xFF2e7d32), const Color(0xFF388e3c)]
        : score >= 40
            ? [const Color(0xFFe65100), const Color(0xFFf57c00), const Color(0xFFffa000)]
            : [const Color(0xFFb71c1c), const Color(0xFFc62828), const Color(0xFFd32f2f)];

    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: bgColors),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // 头部
          Row(children: [
            const Text('🎣 GoCasting', style: TextStyle(color: Colors.white70, fontSize: 12)),
            const Spacer(),
            Text(date, style: const TextStyle(color: Colors.white54, fontSize: 12)),
          ]),
          const SizedBox(height: 20),

          // 大分数
          Container(
            width: 100, height: 100,
            decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.2)),
            child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text('$score', style: const TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.bold)),
              const Text('/ 100', style: TextStyle(color: Colors.white70, fontSize: 12)),
            ])),
          ),
          const SizedBox(height: 16),

          // 评价
          Text(
            score >= 80 ? '极佳出钓条件！' : score >= 60 ? '不错的出钓日' : score >= 40 ? '条件一般' : '不建议出行',
            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          // 最佳时段
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
            child: Column(children: [
              const Text('⏰ 最佳时段', style: TextStyle(color: Colors.white70, fontSize: 11)),
              const SizedBox(height: 2),
              Text(bestWindow, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
            ]),
          ),
          const SizedBox(height: 12),

          // 海滩
          Text('📍 $beachName', style: const TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 16),

          // CTA
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.25), borderRadius: BorderRadius.circular(20)),
            child: const Text('一起去钓鱼吧！🎣', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),

          const SizedBox(height: 12),
          const Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10)),
        ]),
      ),
    );
  }
}

/// 月度/周度报告卡片
class MonthlyReportShareCard extends StatelessWidget {
  const MonthlyReportShareCard({
    super.key,
    required this.repaintKey,
    required this.period, // "2026年7月" 或 "本周"
    required this.totalCatches,
    required this.totalSessions,
    required this.biggestFish,
    required this.biggestSpecies,
    required this.topBait,
    required this.topLocation,
  });
  final GlobalKey repaintKey;
  final String period;
  final int totalCatches;
  final int totalSessions;
  final String biggestFish; // "8.2 lb"
  final String biggestSpecies;
  final String? topBait;
  final String? topLocation;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFF0d47a1), Color(0xFF1565c0), Color(0xFF1976d2)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          // 头部
          Row(children: [
            const Text('🎣 GoCasting', style: TextStyle(color: Colors.white70, fontSize: 12)),
            const Spacer(),
            const Text('📊 钓鱼报告', style: TextStyle(color: Colors.white70, fontSize: 12)),
          ]),
          const SizedBox(height: 16),

          // 时期
          Text(period, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),

          // 数据网格
          Row(children: [
            _StatBlock(value: '$totalCatches', label: '渔获', emoji: '🐟'),
            _StatBlock(value: '$totalSessions', label: '出行', emoji: '🚗'),
            _StatBlock(value: biggestFish, label: '最大鱼', emoji: '🏆'),
          ]),
          const SizedBox(height: 16),

          // 详情
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (biggestSpecies.isNotEmpty)
                _DetailLine(emoji: '🐋', text: '最大鱼种：$biggestSpecies'),
              if (topBait != null)
                _DetailLine(emoji: '🎣', text: '王牌饵料：$topBait'),
              if (topLocation != null)
                _DetailLine(emoji: '📍', text: '最佳钓点：$topLocation'),
            ]),
          ),

          const SizedBox(height: 16),
          const Center(child: Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10))),
        ]),
      ),
    );
  }
}

/// 抛投纪录卡片
class CastRecordShareCard extends StatelessWidget {
  const CastRecordShareCard({
    super.key,
    required this.repaintKey,
    required this.distanceM,
    required this.previousBestM,
    this.gearSetup,
    this.date,
  });
  final GlobalKey repaintKey;
  final double distanceM;
  final double previousBestM;
  final String? gearSetup;
  final String? date;

  @override
  Widget build(BuildContext context) {
    final improvement = previousBestM > 0 ? ((distanceM - previousBestM) / previousBestM * 100) : 0.0;

    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFFe65100), Color(0xFFf57c00), Color(0xFFff9800)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          // 头部
          Row(children: [
            const Text('🎣 GoCasting', style: TextStyle(color: Colors.white70, fontSize: 12)),
            const Spacer(),
            if (date != null) Text(date!, style: const TextStyle(color: Colors.white54, fontSize: 12)),
          ]),
          const SizedBox(height: 16),

          // 新纪录标志
          const Text('🎯 新纪录！', style: TextStyle(color: Colors.yellow, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          // 距离大字
          Text('${distanceM.toStringAsFixed(0)}m', style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.bold)),
          Text('(${(distanceM * 1.09361).toStringAsFixed(0)} yds)', style: const TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 12),

          // 进步百分比
          if (improvement > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
              child: Text('📈 比上次提升 ${improvement.toStringAsFixed(0)}%', style: const TextStyle(color: Colors.white, fontSize: 13)),
            ),
          const SizedBox(height: 12),

          // 装备
          if (gearSetup != null)
            Text('🔧 $gearSetup', style: const TextStyle(color: Colors.white70, fontSize: 12)),

          const SizedBox(height: 16),
          const Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10)),
        ]),
      ),
    );
  }
}

/// 分享辅助方法扩展
class MoreShareHelper {
  /// 分享 Go-Score 邀请
  static Future<void> shareGoScore(BuildContext context, {
    required int score,
    required String bestWindow,
    required String beachName,
  }) async {
    final key = GlobalKey();
    final date = DateTime.now();
    final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

    final card = GoScoreShareCard(repaintKey: key, score: score, bestWindow: bestWindow, beachName: beachName, date: dateStr);
    await _shareCard(context, key, card, 'goscore_$dateStr.png', '今天 $beachName 的 Go-Score $score 分！最佳时段 $bestWindow，一起去钓鱼吧 🎣');
  }

  /// 分享月度报告
  static Future<void> shareMonthlyReport(BuildContext context, {
    required String period,
    required int totalCatches,
    required int totalSessions,
    required String biggestFish,
    required String biggestSpecies,
    String? topBait,
    String? topLocation,
  }) async {
    final key = GlobalKey();
    final card = MonthlyReportShareCard(
      repaintKey: key, period: period, totalCatches: totalCatches,
      totalSessions: totalSessions, biggestFish: biggestFish,
      biggestSpecies: biggestSpecies, topBait: topBait, topLocation: topLocation,
    );
    await _shareCard(context, key, card, 'report_$period.png', '📊 我的 $period 钓鱼报告：$totalCatches 条鱼，最大 $biggestFish $biggestSpecies！');
  }

  /// 分享抛投纪录
  static Future<void> shareCastRecord(BuildContext context, {
    required double distanceM,
    required double previousBestM,
    String? gearSetup,
  }) async {
    final key = GlobalKey();
    final date = DateTime.now();
    final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final card = CastRecordShareCard(repaintKey: key, distanceM: distanceM, previousBestM: previousBestM, gearSetup: gearSetup, date: dateStr);
    await _shareCard(context, key, card, 'cast_record_$dateStr.png', '🎯 抛投新纪录 ${distanceM.toStringAsFixed(0)}m！');
  }

  static Future<void> _shareCard(BuildContext context, GlobalKey key, Widget card, String fileName, String text) async {
    final overlay = Overlay.of(context);
    final entry = OverlayEntry(builder: (_) => Positioned(left: -1000, child: Material(child: card)));
    overlay.insert(entry);
    await Future.delayed(const Duration(milliseconds: 300));
    await ShareCardService.shareWidget(repaintKey: key, fileName: fileName, shareText: text);
    entry.remove();
  }
}

// === 内部组件 ===

class _StatBlock extends StatelessWidget {
  const _StatBlock({required this.value, required this.label, required this.emoji});
  final String value; final String label; final String emoji;
  @override
  Widget build(BuildContext context) => Expanded(child: Column(children: [
    Text(emoji, style: const TextStyle(fontSize: 20)),
    const SizedBox(height: 4),
    Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
    Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
  ]));
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({required this.emoji, required this.text});
  final String emoji; final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(children: [
      Text(emoji, style: const TextStyle(fontSize: 14)),
      const SizedBox(width: 8),
      Text(text, style: const TextStyle(color: Colors.white, fontSize: 13)),
    ]),
  );
}
