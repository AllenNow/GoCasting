import 'package:flutter/material.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';
import '../domain/depreciation_engine.dart';

/// 装备估值卡片 — 显示当前市场价值、保值率、状况评级
class ValuationCard extends StatelessWidget {
  const ValuationCard({super.key, required this.gear, required this.repo});
  final UserGearData gear;
  final MaintenanceRepository repo;

  @override
  Widget build(BuildContext context) {
    // 必须有购买价格和购买日期才能计算
    if (gear.pricePaid == null || gear.purchaseDate == null) {
      return Card(
        child: ListTile(
          leading: Icon(Icons.trending_down, color: Colors.grey[400]),
          title: Text(context.tr.estimatedValue),
          subtitle: Text(context.tr.addPriceForValuation),
        ),
      );
    }

    return FutureBuilder<ValuationResult>(
      future: _calculateValuation(),
      builder: (ctx, snap) {
        if (!snap.hasData) return const SizedBox.shrink();
        final result = snap.data!;
        return _buildCard(context, result);
      },
    );
  }

  Future<ValuationResult> _calculateValuation() async {
    const engine = DepreciationEngine();

    // 计算年龄
    final purchaseDate = DateTime.tryParse(gear.purchaseDate!);
    final ageInDays = purchaseDate != null
        ? DateTime.now().difference(purchaseDate).inDays
        : 0;

    // 获取使用数据
    final totalSessions = await repo.getUsageCount(gear.id);
    final usageLogs = await repo.getUsageLogs(gear.id);
    final saltwaterCount = usageLogs.where((l) => l.environment == 'saltwater').length;
    final saltwaterRatio = usageLogs.isNotEmpty ? saltwaterCount / usageLogs.length : 1.0;

    // 计算维护评分
    final maintenanceLogs = await repo.getMaintenanceLogs(gear.id);
    // 简化：按预期维护频率(每15次session一次)估算应维护次数
    final expectedMaint = (totalSessions / 15).ceil();
    final maintenanceScore = engine.calculateMaintenanceScore(
      actualMaintenanceCount: maintenanceLogs.length,
      expectedMaintenanceCount: expectedMaint,
    );

    return engine.calculate(
      originalPrice: gear.pricePaid!,
      gearType: gear.gearType,
      ageInDays: ageInDays,
      totalSessions: totalSessions,
      saltwaterRatio: saltwaterRatio,
      maintenanceScore: maintenanceScore,
    );
  }

  Widget _buildCard(BuildContext context, ValuationResult result) {
    final conditionColor = _conditionColor(result.condition);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Estimated Value', style: Theme.of(context).textTheme.titleMedium),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: conditionColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    result.condition.label,
                    style: TextStyle(color: conditionColor, fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 当前估值大数字
            Center(
              child: Text(
                '\$${result.currentValue.toStringAsFixed(0)}',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
            ),
            const SizedBox(height: 8),

            // 保值率进度条
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (result.valueRetainedPercent / 100).clamp(0.0, 1.0),
                      minHeight: 8,
                      backgroundColor: Colors.grey[200],
                      color: conditionColor,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text('${result.valueRetainedPercent.toStringAsFixed(0)}%',
                    style: TextStyle(fontWeight: FontWeight.bold, color: conditionColor)),
              ],
            ),
            const SizedBox(height: 4),
            Text('Value retained', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 12),

            // 详细信息
            Row(
              children: [
                Expanded(child: _MiniStat(
                  label: 'Original',
                  value: '\$${result.originalPrice.toStringAsFixed(0)}',
                )),
                Expanded(child: _MiniStat(
                  label: 'Depreciation',
                  value: '-\$${result.depreciationTaken.toStringAsFixed(0)}',
                )),
                Expanded(child: _MiniStat(
                  label: 'Life Left',
                  value: '${result.remainingLifeYears.toStringAsFixed(1)} yr',
                )),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _conditionColor(GearCondition condition) => switch (condition) {
        GearCondition.excellent => Colors.green,
        GearCondition.good => Colors.teal,
        GearCondition.fair => Colors.orange,
        GearCondition.worn => Colors.deepOrange,
        GearCondition.endOfLife => Colors.red,
        GearCondition.unknown => Colors.grey,
      };
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      );
}
