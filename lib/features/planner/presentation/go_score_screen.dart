import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../core/share/more_share_cards.dart';
import '../../../l10n/l10n.dart';
import '../domain/go_score.dart';

/// Go-Score 仪表板页面
class GoScoreScreen extends StatefulWidget {
  const GoScoreScreen({super.key, required this.lat, required this.lon, required this.beachName});
  final double lat;
  final double lon;
  final String beachName;

  @override
  State<GoScoreScreen> createState() => _GoScoreScreenState();
}

class _GoScoreScreenState extends State<GoScoreScreen> {
  static const _engine = GoScoreEngine();
  late List<DailyGoScore> _weekScores;
  int _selectedDayIndex = 0;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _weekScores = _engine.calculateWeek(
      startDate: today,
      lat: widget.lat,
      lon: widget.lon,
    );
  }

  DailyGoScore get _selectedDay => _weekScores[_selectedDayIndex];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.goScore),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              final bestW = _selectedDay.bestWindow;
              final windowStr = bestW != null
                  ? '${bestW.start.hour.toString().padLeft(2, '0')}:${bestW.start.minute.toString().padLeft(2, '0')} — ${bestW.end.hour.toString().padLeft(2, '0')}:${bestW.end.minute.toString().padLeft(2, '0')}'
                  : '--:--';
              MoreShareHelper.shareGoScore(context,
                score: _selectedDay.overallScore,
                bestWindow: windowStr,
                beachName: widget.beachName,
              );
            },
            tooltip: '分享',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 大分数显示
          _ScoreHero(score: _selectedDay),
          const SizedBox(height: 16),

          // 7 天热力条
          _WeekHeatStrip(
            scores: _weekScores,
            selectedIndex: _selectedDayIndex,
            onSelect: (i) => setState(() => _selectedDayIndex = i),
          ),
          const SizedBox(height: 16),

          // 最佳时段卡片
          if (_selectedDay.bestWindow != null)
            _BestWindowCard(window: _selectedDay.bestWindow!),
          const SizedBox(height: 16),

          // 24 小时评分条形图
          _HourlyChart(hourlyScores: _selectedDay.hourlyScores),
          const SizedBox(height: 16),

          // 评分因素明细
          _FactorsCard(factors: _selectedDay.factors),
        ],
      ),
    );
  }
}

/// 大分数英雄区
class _ScoreHero extends StatelessWidget {
  const _ScoreHero({required this.score});
  final DailyGoScore score;

  @override
  Widget build(BuildContext context) {
    final color = _scoreColor(score.overallScore);
    final dateStr = '${score.date.month}/${score.date.day}';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // 环形进度
            SizedBox(
              width: 120,
              height: 120,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: CircularProgressIndicator(
                      value: score.overallScore / 100,
                      strokeWidth: 10,
                      backgroundColor: Colors.grey[200],
                      color: color,
                    ),
                  ),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${score.overallScore}',
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: color,
                        ),
                      ),
                      Text(score.label,
                          style: TextStyle(fontSize: 12, color: color)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(dateStr, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

/// 7 天热力条
class _WeekHeatStrip extends StatelessWidget {
  const _WeekHeatStrip({
    required this.scores,
    required this.selectedIndex,
    required this.onSelect,
  });
  final List<DailyGoScore> scores;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: List.generate(scores.length, (i) {
            final s = scores[i];
            final isSelected = i == selectedIndex;
            final dayLabel = weekDays[s.date.weekday - 1];
            final color = _scoreColor(s.overallScore);

            return GestureDetector(
              onTap: () => onSelect(i),
              child: Column(
                children: [
                  Text(dayLabel,
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                  const SizedBox(height: 4),
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: isSelected ? 1.0 : 0.3),
                      borderRadius: BorderRadius.circular(8),
                      border: isSelected
                          ? Border.all(color: color, width: 2)
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        '${s.overallScore}',
                        style: TextStyle(
                          color: isSelected ? Colors.white : color,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text('${s.date.day}',
                      style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            );
          }),
        ),
      ),
    );
  }
}

/// 最佳时段卡片
class _BestWindowCard extends StatelessWidget {
  const _BestWindowCard({required this.window});
  final TimeSlotScore window;

  @override
  Widget build(BuildContext context) {
    final color = _scoreColor(window.score);
    final startStr =
        '${window.start.hour.toString().padLeft(2, '0')}:${window.start.minute.toString().padLeft(2, '0')}';
    final endStr =
        '${window.end.hour.toString().padLeft(2, '0')}:${window.end.minute.toString().padLeft(2, '0')}';

    return Card(
      color: color.withValues(alpha: 0.1),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.star, color: color, size: 32),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(context.tr.bestWindow,
                      style: TextStyle(
                          color: color, fontWeight: FontWeight.bold)),
                  Text('$startStr — $endStr',
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.w600)),
                  Text('Score: ${window.score}/100 • ${window.label}',
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 24 小时评分条形图
class _HourlyChart extends StatelessWidget {
  const _HourlyChart({required this.hourlyScores});
  final List<TimeSlotScore> hourlyScores;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.tr.hourlyScore, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SizedBox(
              height: 150,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: 100,
                  barTouchData: BarTouchData(
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, gIdx, rod, rIdx) {
                        return BarTooltipItem(
                          '${group.x}:00\n${rod.toY.toInt()}/100',
                          const TextStyle(color: Colors.white, fontSize: 11),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (v, _) {
                          if (v.toInt() % 4 == 0) {
                            return Text('${v.toInt()}', style: const TextStyle(fontSize: 9));
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                  barGroups: hourlyScores.map((slot) {
                    final hour = slot.start.hour;
                    final color = _scoreColor(slot.score);
                    return BarChartGroupData(
                      x: hour,
                      barRods: [
                        BarChartRodData(
                          toY: slot.score.toDouble(),
                          color: color.withValues(alpha: 0.7),
                          width: 8,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 评分因素明细卡片
class _FactorsCard extends StatelessWidget {
  const _FactorsCard({required this.factors});
  final List<ScoreFactor> factors;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(context.tr.scoreFactors, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...factors.map((f) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 100,
                        child: Text(f.name,
                            style: const TextStyle(fontWeight: FontWeight.w500)),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(3),
                              child: LinearProgressIndicator(
                                value: f.maxPoints > 0 ? f.points / f.maxPoints : 0,
                                minHeight: 6,
                                backgroundColor: Colors.grey[200],
                                color: _scoreColor(
                                    (f.points / f.maxPoints * 100).round()),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(f.description,
                                style: const TextStyle(
                                    fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text('${f.points}/${f.maxPoints}',
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

/// 全局颜色映射
Color _scoreColor(int score) {
  if (score >= 80) return Colors.green;
  if (score >= 60) return Colors.teal;
  if (score >= 40) return Colors.orange;
  if (score >= 20) return Colors.deepOrange;
  return Colors.red;
}
