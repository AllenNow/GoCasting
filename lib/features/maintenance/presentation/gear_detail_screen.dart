import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../data/maintenance_repository.dart';
import '../domain/maintenance_scheduler.dart';

/// 装备详情页
class GearDetailScreen extends StatelessWidget {
  const GearDetailScreen({super.key, required this.gearId});
  final int gearId;

  @override
  Widget build(BuildContext context) {
    final repo = Get.find<MaintenanceRepository>();

    return Scaffold(
      appBar: AppBar(title: const Text('Gear Detail')),
      body: FutureBuilder<List<UserGearData>>(
        future: repo.getAllGear(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final gear = snapshot.data!.where((g) => g.id == gearId).firstOrNull;
          if (gear == null) return const Center(child: Text('Not found'));
          return _Detail(gear: gear, repo: repo);
        },
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.gear, required this.repo});
  final UserGearData gear;
  final MaintenanceRepository repo;

  @override
  Widget build(BuildContext context) {
    const scheduler = MaintenanceScheduler();
    final lifespan = scheduler.getDefaultLifespan(gear.gearType);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Details', style: Theme.of(context).textTheme.titleMedium),
            if (gear.brand != null) _R('Brand', gear.brand!),
            if (gear.model != null) _R('Model', gear.model!),
            _R('Type', gear.gearType.toUpperCase()),
            _R('Status', gear.status),
            if (gear.purchaseDate != null) _R('Purchased', gear.purchaseDate!),
            if (gear.pricePaid != null) _R('Price', '\$${gear.pricePaid!.toStringAsFixed(2)}'),
          ]),
        )),
        const SizedBox(height: 16),
        // 寿命
        FutureBuilder<int>(
          future: repo.getUsageCount(gearId),
          builder: (ctx, snap) {
            final sessions = snap.data ?? 0;
            final progress = (sessions / lifespan).clamp(0.0, 1.0);
            final costPer = gear.pricePaid != null && sessions > 0 ? gear.pricePaid! / sessions : null;
            return Card(child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Lifespan', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                LinearProgressIndicator(value: progress, color: progress > 0.8 ? Colors.red : Colors.green),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('$sessions sessions'), Text('~${lifespan - sessions} remaining'),
                ]),
                if (costPer != null) Text('Cost/session: \$${costPer.toStringAsFixed(2)}', style: Theme.of(context).textTheme.bodySmall),
              ]),
            ));
          },
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: () => _logSession(context),
          icon: const Icon(Icons.waves),
          label: const Text('Log Saltwater Session'),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => _logMaint(context),
          icon: const Icon(Icons.build),
          label: const Text('Mark Maintenance Done'),
        ),
      ],
    );
  }

  int get gearId => gear.id;

  Future<void> _logSession(BuildContext context) async {
    final now = DateTime.now().toIso8601String();
    await repo.addUsageLog(UsageLogsCompanion.insert(
      gearId: gearId, date: now.split('T').first, environment: 'saltwater', createdAt: now,
    ));
    if (context.mounted) {
      Get.snackbar('Done', 'Session logged!', snackPosition: SnackPosition.BOTTOM);
    }
  }

  Future<void> _logMaint(BuildContext context) async {
    final now = DateTime.now().toIso8601String();
    await repo.addMaintenanceLog(MaintenanceLogsCompanion.insert(
      gearId: gearId, date: now.split('T').first, maintenanceType: 'full_service', createdAt: now,
    ));
    if (context.mounted) {
      Get.snackbar('Done', 'Maintenance recorded!', snackPosition: SnackPosition.BOTTOM);
    }
  }
}

class _R extends StatelessWidget {
  const _R(this.label, this.value);
  final String label; final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(children: [
      SizedBox(width: 90, child: Text(label, style: const TextStyle(color: Colors.grey))),
      Expanded(child: Text(value)),
    ]),
  );
}
