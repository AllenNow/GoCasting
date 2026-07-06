import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/user_db.dart';
import '../domain/maintenance_scheduler.dart';
import '../providers/maintenance_providers.dart';

/// 装备详情页 — 使用记录 + 维护状态 + 寿命
class GearDetailScreen extends ConsumerWidget {
  const GearDetailScreen({super.key, required this.gearId});
  final int gearId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gearAsync = ref.watch(allGearProvider);
    final usageAsync = ref.watch(usageLogsProvider(gearId));
    final maintAsync = ref.watch(maintenanceLogsProvider(gearId));

    return gearAsync.when(
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, _) => Scaffold(body: Center(child: Text('Error: $err'))),
      data: (allGear) {
        final gear = allGear.where((g) => g.id == gearId).firstOrNull;
        if (gear == null) {
          return const Scaffold(body: Center(child: Text('Gear not found')));
        }

        return Scaffold(
          appBar: AppBar(title: Text(gear.customName)),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // 基本信息
              _InfoCard(gear: gear),
              const SizedBox(height: 16),
              // 寿命追踪
              _LifespanCard(gear: gear, usageAsync: usageAsync),
              const SizedBox(height: 16),
              // 维护状态
              _MaintenanceStatusCard(
                  gear: gear, usageAsync: usageAsync, maintAsync: maintAsync),
              const SizedBox(height: 16),
              // 快速操作
              _QuickActions(gearId: gearId, gear: gear),
            ],
          ),
        );
      },
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.gear});
  final UserGearData gear;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Details',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (gear.brand != null) _Row('Brand', gear.brand!),
            if (gear.model != null) _Row('Model', gear.model!),
            _Row('Type', gear.gearType.toUpperCase()),
            _Row('Status', gear.status),
            if (gear.purchaseDate != null)
              _Row('Purchased', gear.purchaseDate!),
            if (gear.pricePaid != null)
              _Row('Price', '\$${gear.pricePaid!.toStringAsFixed(2)}'),
          ],
        ),
      ),
    );
  }
}

class _LifespanCard extends StatelessWidget {
  const _LifespanCard({required this.gear, required this.usageAsync});
  final UserGearData gear;
  final AsyncValue<List<UsageLog>> usageAsync;

  @override
  Widget build(BuildContext context) {
    const scheduler = MaintenanceScheduler();
    final totalLifespan = scheduler.getDefaultLifespan(gear.gearType);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Lifespan',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            usageAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, __) => const Text('Error loading usage'),
              data: (logs) {
                final sessions = logs.length;
                final progress =
                    (sessions / totalLifespan).clamp(0.0, 1.0);
                final remaining = totalLifespan - sessions;
                final costPerSession = gear.pricePaid != null && sessions > 0
                    ? gear.pricePaid! / sessions
                    : null;

                return Column(
                  children: [
                    LinearProgressIndicator(
                      value: progress,
                      backgroundColor: Colors.grey.shade200,
                      color: progress > 0.8 ? Colors.red : Colors.green,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('$sessions sessions used'),
                        Text('~$remaining remaining'),
                      ],
                    ),
                    if (costPerSession != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Cost per session: \$${costPerSession.toStringAsFixed(2)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MaintenanceStatusCard extends StatelessWidget {
  const _MaintenanceStatusCard({
    required this.gear,
    required this.usageAsync,
    required this.maintAsync,
  });

  final UserGearData gear;
  final AsyncValue<List<UsageLog>> usageAsync;
  final AsyncValue<List<MaintenanceLog>> maintAsync;

  @override
  Widget build(BuildContext context) {
    const scheduler = MaintenanceScheduler();
    final rules = scheduler.getRulesForGearType(gear.gearType);

    if (rules.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Maintenance Status',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...rules.map((rule) => _MaintenanceRuleStatus(rule: rule)),
          ],
        ),
      ),
    );
  }
}

class _MaintenanceRuleStatus extends StatelessWidget {
  const _MaintenanceRuleStatus({required this.rule});
  final MaintenanceRule rule;

  @override
  Widget build(BuildContext context) {
    // 简化显示 — 真实状态计算需要 usage/maint 数据
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.check_circle, color: Colors.green, size: 20),
      title: Text(rule.label),
      subtitle: Text(
          'Every ${rule.triggerSessions} sessions or ${rule.triggerDays} days'),
    );
  }
}

class _QuickActions extends ConsumerWidget {
  const _QuickActions({required this.gearId, required this.gear});
  final int gearId;
  final UserGearData gear;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 快速记录使用
        FilledButton.icon(
          onPressed: () => _logUsage(context, ref),
          icon: const Icon(Icons.waves),
          label: const Text('Log Saltwater Session'),
        ),
        const SizedBox(height: 8),
        // 记录维护
        OutlinedButton.icon(
          onPressed: () => _logMaintenance(context, ref),
          icon: const Icon(Icons.build),
          label: const Text('Mark Maintenance Done'),
        ),
      ],
    );
  }

  Future<void> _logUsage(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(maintenanceRepositoryProvider);
    final now = DateTime.now().toIso8601String();
    await repo.addUsageLog(UsageLogsCompanion.insert(
      gearId: gearId,
      date: now.split('T').first,
      environment: 'saltwater',
      createdAt: now,
    ));
    ref.invalidate(usageLogsProvider(gearId));
    ref.invalidate(usageCountProvider(gearId));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Session logged!')),
      );
    }
  }

  Future<void> _logMaintenance(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(maintenanceRepositoryProvider);
    final now = DateTime.now().toIso8601String();
    await repo.addMaintenanceLog(MaintenanceLogsCompanion.insert(
      gearId: gearId,
      date: now.split('T').first,
      maintenanceType: 'full_service',
      createdAt: now,
    ));
    ref.invalidate(maintenanceLogsProvider(gearId));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maintenance recorded!')),
      );
    }
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
              width: 90,
              child: Text(label,
                  style: const TextStyle(color: Colors.grey))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
