import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';
import '../domain/maintenance_scheduler.dart';
import 'components_screen.dart';
import 'insurance_report_screen.dart';
import 'log_maintenance_dialog.dart';
import 'preseason_checklist_screen.dart';
import 'service_records_screen.dart';
import 'tco_analysis_screen.dart';
import 'tutorials_screen.dart';
import 'valuation_card.dart';
import 'warranty_screen.dart';
import 'photos_screen.dart';

/// 装备详情页
class GearDetailScreen extends StatelessWidget {
  const GearDetailScreen({super.key, required this.gearId});
  final int gearId;

  @override
  Widget build(BuildContext context) {
    final repo = Get.find<MaintenanceRepository>();

    return Scaffold(
      appBar: AppBar(title: Text(context.tr.gearDetail)),
      body: FutureBuilder<List<UserGearData>>(
        future: repo.getAllGear(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final gear = snapshot.data!.where((g) => g.id == gearId).firstOrNull;
          if (gear == null) return Center(child: Text(context.tr.notFound));
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
        // 基本信息
        Card(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(context.tr.details, style: Theme.of(context).textTheme.titleMedium),
            if (gear.brand != null) _R(context.tr.brand, gear.brand!),
            if (gear.model != null) _R(context.tr.model, gear.model!),
            _R(context.tr.gearType, gear.gearType.toUpperCase()),
            _R(context.tr.status, gear.status),
            if (gear.purchaseDate != null) _R(context.tr.purchased, gear.purchaseDate!),
            if (gear.pricePaid != null) _R(context.tr.price, '\$${gear.pricePaid!.toStringAsFixed(2)}'),
          ]),
        )),
        const SizedBox(height: 16),

        // V2: 保修状态
        _WarrantyCard(gearId: gear.id, gearName: gear.customName, repo: repo),
        const SizedBox(height: 16),

        // V2: TCO 概览
        _TcoCard(gear: gear, repo: repo),
        const SizedBox(height: 16),

        // 寿命
        FutureBuilder<int>(
          future: repo.getUsageCount(gearId),
          builder: (ctx, snap) {
            final sessions = snap.data ?? 0;
            final progress = (sessions / lifespan).clamp(0.0, 1.0);
            return Card(child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(context.tr.lifespan, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                LinearProgressIndicator(value: progress, color: progress > 0.8 ? Colors.red : Colors.green),
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('$sessions sessions'), Text('~${lifespan - sessions} remaining'),
                ]),
              ]),
            ));
          },
        ),
        const SizedBox(height: 16),

        // 操作按钮
        FilledButton.icon(
          onPressed: () => _logSession(context),
          icon: const Icon(Icons.waves),
          label: Text(context.tr.logSaltwaterSession),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => LogMaintenanceDialog.show(
            context, gearId: gear.id, gearType: gear.gearType),
          icon: const Icon(Icons.build),
          label: Text(context.tr.logMaintenance),
        ),
        const SizedBox(height: 8),

        // V2: 保修和照片快捷入口
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Get.to(() => WarrantyScreen(
                    gearId: gear.id, gearName: gear.customName)),
                icon: const Icon(Icons.verified_user),
                label: Text(context.tr.warranty),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Get.to(() => PhotosScreen(
                    gearId: gear.id, gearName: gear.customName)),
                icon: const Icon(Icons.photo_library),
                label: Text(context.tr.photos),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        // V2 P1: 零件、教程、维修入口
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Get.to(() => ComponentsScreen(
                    gearId: gear.id, gearName: gear.customName, gearType: gear.gearType)),
                icon: const Icon(Icons.settings),
                label: Text(context.tr.parts),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Get.to(() => ServiceRecordsScreen(
                    gearId: gear.id, gearName: gear.customName)),
                icon: const Icon(Icons.local_shipping),
                label: Text(context.tr.service),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () => Get.to(() => TutorialsScreen(filterGearType: gear.gearType)),
          icon: const Icon(Icons.menu_book),
          label: Text(context.tr.maintenanceGuides),
        ),
        const SizedBox(height: 8),

        // V2 P2: 季前检查和保险报告入口
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Get.to(() => PreseasonChecklistScreen(gear: gear)),
                icon: const Icon(Icons.checklist),
                label: Text(context.tr.seasonCheck),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => Get.to(() => const InsuranceReportScreen()),
                icon: const Icon(Icons.shield_outlined),
                label: Text(context.tr.insurance),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // V2 P1: 装备估值
        ValuationCard(gear: gear, repo: repo),
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
}

/// V2: 保修状态卡片
class _WarrantyCard extends StatelessWidget {
  const _WarrantyCard({required this.gearId, required this.gearName, required this.repo});
  final int gearId;
  final String gearName;
  final MaintenanceRepository repo;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<GearWarranty?>(
      future: repo.getWarranty(gearId),
      builder: (ctx, snap) {
        if (snap.connectionState == ConnectionState.waiting) return const SizedBox.shrink();
        final warranty = snap.data;
        if (warranty == null) {
          return Card(
            child: ListTile(
              leading: Icon(Icons.verified_user_outlined, color: Colors.grey[400]),
              title: Text(context.tr.noWarrantyRecorded),
              subtitle: Text(context.tr.tapToAddWarranty),
              trailing: const Icon(Icons.add),
              onTap: () => Get.to(() => WarrantyScreen(gearId: gearId, gearName: gearName)),
            ),
          );
        }

        final now = DateTime.now();
        final expiry = DateTime.parse(warranty.warrantyExpiryDate);
        final isExpired = now.isAfter(expiry);
        final isExpiringSoon = !isExpired && expiry.difference(now).inDays <= 30;
        final color = isExpired ? Colors.red : isExpiringSoon ? Colors.orange : Colors.green;
        final label = isExpired ? context.tr.warrantyExpired : isExpiringSoon ? context.tr.warrantyExpiringSoon : context.tr.warrantyActive;
        final daysLeft = isExpired ? 0 : expiry.difference(now).inDays;

        return Card(
          child: ListTile(
            leading: Icon(Icons.verified_user, color: color),
            title: Text('${context.tr.warranty}: $label'),
            subtitle: Text(isExpired
                ? 'Expired on ${warranty.warrantyExpiryDate}'
                : '$daysLeft days remaining • Expires ${warranty.warrantyExpiryDate}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Get.to(() => WarrantyScreen(gearId: gearId, gearName: gearName)),
          ),
        );
      },
    );
  }
}

/// V2: TCO 概览卡片
class _TcoCard extends StatelessWidget {
  const _TcoCard({required this.gear, required this.repo});
  final UserGearData gear;
  final MaintenanceRepository repo;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<double>>(
      future: Future.wait([
        repo.getTotalMaintenanceCost(gear.id),
        repo.getUsageCount(gear.id).then((c) => c.toDouble()),
      ]),
      builder: (ctx, snap) {
        if (!snap.hasData) return const SizedBox.shrink();
        final maintCost = snap.data![0];
        final sessions = snap.data![1].toInt();
        final purchasePrice = gear.pricePaid ?? 0.0;
        final tco = purchasePrice + maintCost;
        final costPerSession = sessions > 0 ? tco / sessions : 0.0;

        return GestureDetector(
          onTap: () => Get.to(() => TcoAnalysisScreen(
              gearId: gear.id, gearName: gear.customName)),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(context.tr.totalCostOwnership, style: Theme.of(context).textTheme.titleMedium),
                      const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _R(context.tr.purchasePrice, '\$${purchasePrice.toStringAsFixed(2)}'),
                  _R(context.tr.maintenanceCost, '\$${maintCost.toStringAsFixed(2)}'),
                  const Divider(),
                  _R(context.tr.totalTco, '\$${tco.toStringAsFixed(2)}'),
                  if (sessions > 0)
                    _R('Cost / Session', '\$${costPerSession.toStringAsFixed(2)}'),
                ],
              ),
            ),
          ),
        );
      },
    );
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
