import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';

/// 维护追踪器主页面
class MaintenanceScreen extends StatelessWidget {
  const MaintenanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.tabMaintenance)),
      body: FutureBuilder<List<UserGearData>>(
        future: Get.find<MaintenanceRepository>().getAllGear(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final gear = snapshot.data ?? [];
          if (gear.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.handyman, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(context.tr.noGearYet, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Text(context.tr.noGearDesc, style: const TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.only(bottom: 80),
            itemCount: gear.length,
            itemBuilder: (_, i) => _GearCard(item: gear[i]),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Get.toNamed(AppRoutes.maintenanceAdd);
          // 返回后刷新页面
          (context as Element).markNeedsBuild();
        },
        icon: const Icon(Icons.add),
        label: Text(context.tr.addGear),
      ),
    );
  }
}

class _GearCard extends StatelessWidget {
  const _GearCard({required this.item});
  final UserGearData item;

  @override
  Widget build(BuildContext context) {
    final icon = switch (item.gearType) {
      'rod' => Icons.straighten,
      'reel' => Icons.settings_backup_restore,
      'line' => Icons.linear_scale,
      _ => Icons.build,
    };
    final statusColor = switch (item.status) {
      'active' => Colors.green,
      'stored' => Colors.orange,
      _ => Colors.grey,
    };

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(child: Icon(icon)),
        title: Text(item.customName),
        subtitle: Text('${item.brand ?? ""} ${item.model ?? ""}'.trim().isEmpty
            ? item.gearType.toUpperCase()
            : '${item.brand} ${item.model}'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(item.status, style: TextStyle(color: statusColor, fontSize: 12)),
        ),
        onTap: () => Get.toNamed('${AppRoutes.maintenanceDetail}/${item.id}'),
      ),
    );
  }
}
