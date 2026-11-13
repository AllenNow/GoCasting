import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:go_casting/features/competition/presentation/competition_controller.dart';

class CompetitionStatsScreen extends StatelessWidget {
  final CompetitionController controller = Get.find<CompetitionController>();

  CompetitionStatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('比赛统计'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (controller.currentCompetition.value != null) {
                controller.loadStats(controller.currentCompetition.value!.id);
              }
            },
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final stats = controller.competitionStats.value;
        if (stats == null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.bar_chart, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text('暂无统计数据', style: TextStyle(fontSize: 18)),
                const SizedBox(height: 8),
                const Text('比赛还没有参赛记录'),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Get.toNamed('/competition/submit'),
                  child: const Text('去参赛'),
                ),
              ],
            ),
          );
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 概览卡片
              _buildOverviewCard(stats),
              const SizedBox(height: 20),

              // 区域分布
              _buildCountyDistribution(stats),
              const SizedBox(height: 20),

              // 钓法分布
              _buildFishingMethodDistribution(stats),
              const SizedBox(height: 20),

              // 验证状态
              _buildVerificationStatus(stats),
              const SizedBox(height: 20),

              // 排行榜预览
              _buildLeaderboardPreview(stats),
              const SizedBox(height: 20),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildOverviewCard(CompetitionStats stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Row(
              children: [
                Icon(Icons.insights, color: Colors.blue),
                SizedBox(width: 8),
                Text('比赛概览', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.group,
                  label: '参赛人数',
                  value: '${stats.totalParticipants}',
                  color: Colors.blue,
                ),
                _buildStatItem(
                  icon: Icons.list_alt,
                  label: '参赛记录',
                  value: '${stats.totalEntries}',
                  color: Colors.green,
                ),
                _buildStatItem(
                  icon: Icons.verified,
                  label: '已验证',
                  value: '${stats.verifiedEntries}',
                  color: Colors.green,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.question_answer,
                  label: '被质疑',
                  value: '${stats.challengedEntries}',
                  color: Colors.orange,
                ),
                _buildStatItem(
                  icon: Icons.check_circle,
                  label: '验证率',
                  value: stats.totalEntries > 0 
                    ? '${(stats.verifiedEntries / stats.totalEntries * 100).toStringAsFixed(1)}%'
                    : '0%',
                  color: Colors.purple,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 24, color: color),
        ),
        const SizedBox(height: 8),
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }

  Widget _buildCountyDistribution(CompetitionStats stats) {
    final entriesByCounty = stats.entriesByCounty;
    if (entriesByCounty.isEmpty) {
      return Container();
    }

    final sortedCounties = entriesByCounty.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.map, color: Colors.green),
                SizedBox(width: 8),
                Text('区域分布', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Column(
              children: sortedCounties.map((entry) {
                final percentage = stats.totalEntries > 0
                  ? (entry.value / stats.totalEntries * 100).toStringAsFixed(1)
                  : '0';
                
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(entry.key, style: const TextStyle(fontSize: 14)),
                      ),
                      Text(
                        '${entry.value} 条 (${percentage}%)',
                        style: const TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFishingMethodDistribution(CompetitionStats stats) {
    final entriesByMethod = stats.entriesByMethod;
    if (entriesByMethod.isEmpty) {
      return Container();
    }

    final total = stats.totalEntries.toDouble();
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.fishing, color: Colors.orange),
                SizedBox(width: 8),
                Text('钓法分布', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Column(
              children: entriesByMethod.entries.map((entry) {
                final percentage = total > 0 ? entry.value / total : 0;
                final methodName = _getFishingMethodChinese(entry.key);
                
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text('$methodName (${entry.value}条)'),
                          ),
                          Text('${(percentage * 100).toStringAsFixed(1)}%'),
                        ],
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(
                        value: percentage,
                        backgroundColor: Colors.grey[200],
                        color: _getFishingMethodColor(entry.key),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationStatus(CompetitionStats stats) {
    final pending = stats.totalEntries - stats.verifiedEntries - stats.challengedEntries;
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.verified_user, color: Colors.purple),
                SizedBox(width: 8),
                Text('验证状态', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildVerificationStat(
                  label: '已验证',
                  value: stats.verifiedEntries,
                  total: stats.totalEntries,
                  color: Colors.green,
                ),
                _buildVerificationStat(
                  label: '被质疑',
                  value: stats.challengedEntries,
                  total: stats.totalEntries,
                  color: Colors.red,
                ),
                _buildVerificationStat(
                  label: '待验证',
                  value: pending,
                  total: stats.totalEntries,
                  color: Colors.orange,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationStat({
    required String label,
    required int value,
    required int total,
    required Color color,
  }) {
    final percentage = total > 0 ? (value / total * 100).toStringAsFixed(1) : '0';
    
    return Column(
      children: [
        Container(
          width: 60,
          height: 60,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: color.withOpacity(0.2),
            borderRadius: BorderRadius.circular(30),
          ),
          child: Text(
            value.toString(),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontSize: 12)),
        Text('$percentage%', style: TextStyle(fontSize: 11, color: color)),
      ],
    );
  }

  Widget _buildLeaderboardPreview(CompetitionStats stats) {
    if (stats.topEntries.isEmpty) {
      return Container();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.leaderboard, color: Colors.amber),
                const SizedBox(width: 8),
                const Text('排行榜预览', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const Spacer(),
                TextButton(
                  onPressed: () => Get.toNamed('/competition/leaderboard'),
                  child: const Text('查看全部'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...stats.topEntries.take(3).map((entry) {
              final index = stats.topEntries.indexOf(entry) + 1;
              return _buildLeaderboardPreviewItem(entry, index);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaderboardPreviewItem(LeaderboardEntry entry, int rank) {
    Color rankColor;
    IconData? rankIcon;
    
    if (rank == 1) {
      rankColor = Colors.amber[800]!;
      rankIcon = Icons.emoji_events;
    } else if (rank == 2) {
      rankColor = Colors.grey[600]!;
      rankIcon = Icons.emoji_events;
    } else if (rank == 3) {
      rankColor = Colors.brown[600]!;
      rankIcon = Icons.emoji_events;
    } else {
      rankColor = Colors.grey;
      rankIcon = null;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          // 排名
          Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: rankColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(15),
            ),
            child: Text(
              '$rank',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: rankColor,
              ),
            ),
          ),
          const SizedBox(width: 12),
          
          // 参赛者信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.participantName,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(
                  '${entry.location} · ${entry.county}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          
          // 测量数据
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${entry.lengthCm.toStringAsFixed(1)}cm',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue),
              ),
              if (entry.weightG != null)
                Text(
                  '${entry.weightG!.toStringAsFixed(0)}g',
                  style: const TextStyle(fontSize: 11, color: Colors.green),
                ),
            ],
          ),
          
          if (rankIcon != null) ...[
            const SizedBox(width: 8),
            Icon(rankIcon, color: rankColor, size: 16),
          ],
        ],
      ),
    );
  }

  String _getFishingMethodChinese(String methodKey) {
    switch (methodKey) {
      case 'shore':
        return '岸钓/沙滩';
      case 'rock':
        return '登礁';
      case 'boat':
        return '船钓';
      case 'platform':
        return '鱼排';
      default:
        return methodKey;
    }
  }

  Color _getFishingMethodColor(String methodKey) {
    switch (methodKey) {
      case 'shore':
        return Colors.green;
      case 'rock':
        return Colors.orange;
      case 'boat':
        return Colors.blue;
      case 'platform':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}