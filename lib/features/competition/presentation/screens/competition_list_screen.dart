import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:go_casting/features/competition/presentation/competition_controller.dart';
import 'package:go_casting/features/competition/domain/competition_models.dart';

class CompetitionListScreen extends StatelessWidget {
  final CompetitionController controller = Get.find<CompetitionController>();

  CompetitionListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('钓鱼比赛'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.loadCompetitions,
          ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showCreateCompetitionDialog(context),
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        if (controller.error.value.isNotEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('错误: ${controller.error.value}'),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: controller.loadCompetitions,
                  child: const Text('重试'),
                ),
              ],
            ),
          );
        }

        if (controller.competitions.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.emoji_events_outlined, size: 64, color: Colors.grey),
                const SizedBox(height: 16),
                const Text('暂无比赛', style: TextStyle(fontSize: 18)),
                const SizedBox(height: 8),
                const Text('点击右上角创建新比赛'),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  icon: const Icon(Icons.add),
                  label: const Text('创建比赛'),
                  onPressed: () => _showCreateCompetitionDialog(context),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          itemCount: controller.competitions.length,
          itemBuilder: (context, index) {
            final competition = controller.competitions[index];
            return _buildCompetitionCard(competition);
          },
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('参赛'),
        onPressed: () {
          if (controller.currentCompetition.value != null) {
            Get.toNamed('/competition/submit');
          } else {
            Get.snackbar('提示', '请先选择比赛');
          }
        },
      ),
    );
  }

  Widget _buildCompetitionCard(Competition competition) {
    final isCurrent = controller.currentCompetition.value?.id == competition.id;
    final statusColor = _getStatusColor(competition.status);
    final statusText = controller.getCompetitionStatusDescription(competition.status);

    return Card(
      margin: const EdgeInsets.all(8),
      elevation: isCurrent ? 4 : 2,
      color: isCurrent ? Colors.blue[50] : null,
      child: InkWell(
        onTap: () => controller.switchCompetition(competition),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.emoji_events,
                    color: statusColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      competition.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  if (isCurrent)
                    const Icon(Icons.check_circle, color: Colors.green),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                competition.description,
                style: const TextStyle(color: Colors.grey),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Chip(
                    label: Text(statusText),
                    backgroundColor: statusColor.withOpacity(0.2),
                    labelStyle: TextStyle(color: statusColor),
                  ),
                  const Spacer(),
                  _buildDateRange(competition),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.date_range, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    '${competition.startDate.year}-${competition.startDate.month}-${competition.startDate.day}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const Text(' 至 ', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  Text(
                    '${competition.endDate.year}-${competition.endDate.month}-${competition.endDate.day}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateRange(Competition competition) {
    final now = DateTime.now();
    final daysLeft = competition.endDate.difference(now).inDays;
    
    if (competition.status == CompetitionStatus.ended) {
      return const Text('已结束', style: TextStyle(color: Colors.grey));
    } else if (daysLeft < 0) {
      return const Text('已过期', style: TextStyle(color: Colors.red));
    } else if (daysLeft <= 7) {
      return Text(
        '还剩$daysLeft天',
        style: const TextStyle(color: Colors.orange),
      );
    } else {
      return Text('还剩$daysLeft天', style: const TextStyle(color: Colors.green));
    }
  }

  Color _getStatusColor(CompetitionStatus status) {
    switch (status) {
      case CompetitionStatus.upcoming:
        return Colors.blue;
      case CompetitionStatus.active:
        return Colors.green;
      case CompetitionStatus.ended:
        return Colors.grey;
    }
  }

  void _showCreateCompetitionDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('创建新比赛'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  decoration: const InputDecoration(
                    labelText: '比赛名称',
                    hintText: '如：第一届纯粹的钓鱼大师赛',
                  ),
                  onChanged: controller.competitionName,
                ),
                const SizedBox(height: 16),
                TextField(
                  decoration: const InputDecoration(
                    labelText: '比赛描述',
                    hintText: '比赛规则和说明',
                  ),
                  maxLines: 3,
                  onChanged: controller.competitionDescription,
                ),
                const SizedBox(height: 16),
                Obx(() => InputDatePickerFormField(
                  firstDate: DateTime.now(),
                  lastDate: DateTime(2030),
                  fieldHintText: '开始日期',
                  fieldLabelText: '开始日期',
                  initialDate: controller.startDate.value ?? DateTime.now(),
                  onDateSaved: (date) => controller.startDate.value = date,
                )),
                const SizedBox(height: 16),
                Obx(() => InputDatePickerFormField(
                  firstDate: controller.startDate.value ?? DateTime.now().add(const Duration(days: 1)),
                  lastDate: DateTime(2030),
                  fieldHintText: '结束日期',
                  fieldLabelText: '结束日期',
                  initialDate: controller.endDate.value ?? DateTime.now().add(const Duration(days: 30)),
                  onDateSaved: (date) => controller.endDate.value = date,
                )),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Get.back(),
              child: const Text('取消'),
            ),
            ElevatedButton(
              onPressed: () async {
                final success = await controller.createNewCompetition();
                if (success && context.mounted) {
                  Navigator.of(context).pop();
                }
              },
              child: const Text('创建'),
            ),
          ],
        );
      },
    );
  }
}