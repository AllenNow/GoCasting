import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../catch_log/data/catch_repository.dart';
import '../../catch_log/domain/catch_analysis.dart';
import '../domain/fishing_coach.dart';
import '../domain/go_score.dart';

/// AI 钓况教练卡片 — 显示在规划器顶部
class CoachCard extends StatefulWidget {
  const CoachCard({super.key, required this.lat, required this.lon});
  final double lat;
  final double lon;

  @override
  State<CoachCard> createState() => _CoachCardState();
}

class _CoachCardState extends State<CoachCard> {
  List<CoachAdvice> _advice = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _generate();
  }

  Future<void> _generate() async {
    final catchRepo = CatchRepository(Get.find<UserDatabase>());
    final catches = await catchRepo.getAll();

    // 分析渔获
    const analysisEngine = CatchAnalysisEngine();
    final analysis = catches.isNotEmpty ? analysisEngine.analyze(catches) : null;

    // 获取 Go-Score
    const goScoreEngine = GoScoreEngine();
    final todayScore = goScoreEngine.calculateDaily(
      date: DateTime.now(), lat: widget.lat, lon: widget.lon,
    );

    // 获取最佳条件
    String? bestTide;
    String? bestTime;
    String? bestBait;
    String? bestRig;
    if (analysis != null) {
      if (analysis.tideAnalysis.isNotEmpty) bestTide = analysis.tideAnalysis.first.label;
      if (analysis.timeAnalysis.isNotEmpty) bestTime = analysis.timeAnalysis.first.label;
      if (analysis.baitAnalysis.isNotEmpty) bestBait = analysis.baitAnalysis.first.label;
      if (analysis.rigAnalysis.isNotEmpty) bestRig = analysis.rigAnalysis.first.label;
    }

    const coach = FishingCoachEngine();
    final advice = coach.generateAdvice(
      recentCatches: catches,
      analysis: analysis,
      pendingMaintenanceCount: 0, // TODO: 从维护模块获取
      goScore: todayScore.overallScore,
      bestTideState: bestTide,
      bestTimePeriod: bestTime,
      bestBait: bestBait,
      bestRig: bestRig,
    );

    if (mounted) setState(() { _advice = advice; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _advice.isEmpty) return const SizedBox.shrink();

    // 显示前 3 条建议
    final displayAdvice = _advice.take(3).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Text('🤖', style: TextStyle(fontSize: 18)),
              const SizedBox(width: 8),
              Text('钓况教练', style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              Text('今日建议', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
            ]),
            const SizedBox(height: 12),
            ...displayAdvice.map((a) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(a.emoji, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 8),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(a.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text(a.body, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                  if (a.actionLabel != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: GestureDetector(
                        onTap: () { if (a.actionRoute != null) Get.toNamed(a.actionRoute!); },
                        child: Text(a.actionLabel!, style: const TextStyle(fontSize: 12, color: Colors.blue, fontWeight: FontWeight.w500)),
                      ),
                    ),
                ])),
              ]),
            )),
          ],
        ),
      ),
    );
  }
}
