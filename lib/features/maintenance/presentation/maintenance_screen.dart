import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/database/user_db.dart';
import '../providers/maintenance_providers.dart';

/// 维护追踪器主页面
class MaintenanceScreen extends ConsumerWidget {
  const MaintenanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gearAsync = ref.watch(allGearProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance'),
      ),
      body: gearAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
        data: (gear) {
          if (gear.isEmpty) {
            return const _EmptyState();
          }
          return _GearList(gear: gear);
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/maintenance/add'),
        icon: const Icon(Icons.add),
        label: const Text('Add Gear'),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.handyman, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Text(
            'No Gear Yet',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500),
          ),
          SizedBox(height: 8),
          Text(
            'Add your first piece of gear to start tracking',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }
}

class _GearList extends StatelessWidget {
  const _GearList({required this.gear});
  final List<UserGearData> gear;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 80),
      itemCount: gear.length,
      itemBuilder: (context, index) {
        final item = gear[index];
        return _GearCard(item: item);
      },
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
      'retired' => Colors.grey,
      _ => Colors.grey,
    };

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          child: Icon(icon),
        ),
        title: Text(item.customName),
        subtitle: Text(
          '${item.brand ?? ""} ${item.model ?? ""}'.trim().isEmpty
              ? item.gearType.toUpperCase()
              : '${item.brand} ${item.model}',
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            item.status,
            style: TextStyle(
              color: statusColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        onTap: () => context.push('/maintenance/detail/${item.id}'),
      ),
    );
  }
}
