import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:go_casting/features/competition/presentation/competition_controller.dart';
import 'package:go_casting/features/competition/domain/competition_models.dart';

class LeaderboardScreen extends StatelessWidget {
  final CompetitionController controller = Get.find<CompetitionController>();

  LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('排行榜'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (controller.selectedCategoryId.value != -1) {
                controller.loadLeaderboard(controller.selectedCategoryId.value);
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterDialog(context),
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final leaderboard = controller.getCurrentLeaderboard();
        if (leaderboard.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.leaderboard_outlined, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text('暂无排行榜数据', style: TextStyle(fontSize: 18)),
                const SizedBox(height: 8),
                const Text('该类别还没有参赛记录'),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Get.toNamed('/competition/submit'),
                  child: const Text('去参赛'),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            _buildCategorySelector(),
            Expanded(
              child: ListView.builder(
                itemCount: leaderboard.length,
                itemBuilder: (context, index) {
                  return _buildLeaderboardItem(leaderboard[index], index + 1);
                },
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _buildCategorySelector() {
    final categories = controller.competitionCategories;
    if (categories.isEmpty) {
      return Container();
    }

    return Container(
      color: Colors.grey[100],
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Row(
        children: [
          const Icon(Icons.category, size: 20, color: Colors.grey),
          const SizedBox(width: 8),
          const Text('类别: ', style: TextStyle(fontWeight: FontWeight.bold)),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: categories.map((category) {
                  final isSelected = controller.selectedCategoryId.value == category.id;
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ChoiceChip(
                      label: Text(category.categoryName),
                      selected: isSelected,
                      onSelected: (_) => controller.switchCategory(category.id),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeaderboardItem(LeaderboardEntry entry, int rank) {
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

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // 排名
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: rankColor.withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '$rank',
                style: TextStyle(
                  fontSize: 18,
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
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          entry.participantName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (rankIcon != null) Icon(rankIcon, color: rankColor, size: 20),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        '${entry.location} · ${entry.county}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      const Spacer(),
                      Text(
                        '${entry.catchDate.month}-${entry.catchDate.day}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            // 测量数据
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  children: [
                    Icon(Icons.straighten, size: 16, color: Colors.blue),
                    const SizedBox(width: 4),
                    Text(
                      '${entry.lengthCm.toStringAsFixed(1)}cm',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                if (entry.weightG != null)
                  Row(
                    children: [
                      Icon(Icons.scale, size: 14, color: Colors.green),
                      const SizedBox(width: 4),
                      Text(
                        '${entry.weightG!.toStringAsFixed(0)}g',
                        style: const TextStyle(fontSize: 12, color: Colors.green),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showFilterDialog(BuildContext context) {
    final counties = controller.competitionEntries
        .map((e) => e.county)
        .toSet()
        .toList()
      ..sort();
    
    counties.insert(0, '全部');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('筛选设置'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('选择区域:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: counties.map((county) {
                    final isSelected = controller.selectedCounty.value == county;
                    return FilterChip(
                      label: Text(county),
                      selected: isSelected,
                      onSelected: (_) => controller.switchCounty(county),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                const Text('验证状态:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilterChip(
                      label: const Text('全部'),
                      selected: controller.selectedVerificationStatus.value == null,
                      onSelected: (_) => controller.switchVerificationStatus(null),
                    ),
                    FilterChip(
                      label: const Text('待验证'),
                      selected: controller.selectedVerificationStatus.value == VerificationStatus.pending,
                      onSelected: (_) => controller.switchVerificationStatus(VerificationStatus.pending),
                      selectedColor: Colors.orange.withOpacity(0.3),
                    ),
                    FilterChip(
                      label: const Text('已验证'),
                      selected: controller.selectedVerificationStatus.value == VerificationStatus.verified,
                      onSelected: (_) => controller.switchVerificationStatus(VerificationStatus.verified),
                      selectedColor: Colors.green.withOpacity(0.3),
                    ),
                    FilterChip(
                      label: const Text('被质疑'),
                      selected: controller.selectedVerificationStatus.value == VerificationStatus.challenged,
                      onSelected: (_) => controller.switchVerificationStatus(VerificationStatus.challenged),
                      selectedColor: Colors.red.withOpacity(0.3),
                    ),
                  ],
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: controller.clearFilters,
              child: const Text('清空筛选'),
            ),
            ElevatedButton(
              onPressed: () => Get.back(),
              child: const Text('确定'),
            ),
          ],
        );
      },
    );
  }
}