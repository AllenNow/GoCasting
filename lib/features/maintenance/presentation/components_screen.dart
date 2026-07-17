import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide Value;

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';

/// 零件级追踪页面
class ComponentsScreen extends StatefulWidget {
  const ComponentsScreen({super.key, required this.gearId, required this.gearName, required this.gearType});
  final int gearId;
  final String gearName;
  final String gearType;

  @override
  State<ComponentsScreen> createState() => _ComponentsScreenState();
}

class _ComponentsScreenState extends State<ComponentsScreen> {
  final _repo = Get.find<MaintenanceRepository>();
  List<GearComponent> _components = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadComponents();
  }

  Future<void> _loadComponents() async {
    var components = await _repo.getComponents(widget.gearId);
    // 如果没有零件，自动初始化默认列表
    if (components.isEmpty) {
      await _repo.initDefaultComponents(widget.gearId, widget.gearType);
      components = await _repo.getComponents(widget.gearId);
    }
    setState(() {
      _components = components;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Components — ${widget.gearName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _addCustomComponent,
            tooltip: 'Add Component',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _components.isEmpty
              ? _buildEmpty()
              : _buildList(),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.settings_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(context.tr.noComponentsTracked),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: () async {
              await _repo.initDefaultComponents(widget.gearId, widget.gearType);
              _loadComponents();
            },
            icon: const Icon(Icons.auto_fix_high),
            label: Text(context.tr.addDefaultComponents),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _components.length,
      itemBuilder: (ctx, i) {
        final comp = _components[i];
        return _ComponentCard(
          component: comp,
          onMarkMaintenance: () => _markComponentMaintenance(comp),
          onReplace: () => _replaceComponent(comp),
          onDelete: () => _deleteComponent(comp),
        );
      },
    );
  }

  Future<void> _markComponentMaintenance(GearComponent comp) async {
    final now = DateTime.now().toIso8601String().split('T').first;
    await _repo.updateComponent(comp.id, GearComponentsCompanion(
      lastMaintenanceDate: Value(now),
    ));
    _loadComponents();
    Get.snackbar('Done', '${comp.componentLabel} maintenance logged', snackPosition: SnackPosition.BOTTOM);
  }

  Future<void> _replaceComponent(GearComponent comp) async {
    final costController = TextEditingController();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Replace ${comp.componentLabel}?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(context.tr.replaceComponentDesc),
            const SizedBox(height: 12),
            TextField(
              controller: costController,
              decoration: const InputDecoration(
                labelText: 'Replacement Cost (\$)',
                border: OutlineInputBorder(),
                hintText: '0.00 (optional)',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.replaceComponent)),
        ],
      ),
    );

    if (confirm == true) {
      final cost = double.tryParse(costController.text);
      await _repo.replaceComponent(comp.id, replacementCost: cost);
      // 创建新的同名零件
      final now = DateTime.now().toIso8601String();
      await _repo.addComponent(GearComponentsCompanion(
        gearId: Value(widget.gearId),
        componentName: Value(comp.componentName),
        componentLabel: Value(comp.componentLabel),
        installDate: Value(now.split('T').first),
        maintenanceIntervalSessions: Value(comp.maintenanceIntervalSessions),
        maintenanceIntervalDays: Value(comp.maintenanceIntervalDays),
        replacementCost: Value(cost),
        createdAt: Value(now),
      ));
      _loadComponents();
      Get.snackbar('Done', '${comp.componentLabel} replaced', snackPosition: SnackPosition.BOTTOM);
    }
    costController.dispose();
  }

  Future<void> _deleteComponent(GearComponent comp) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete ${comp.componentLabel}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.delete)),
        ],
      ),
    );
    if (confirm == true) {
      await _repo.deleteComponent(comp.id);
      _loadComponents();
    }
  }

  Future<void> _addCustomComponent() async {
    final nameController = TextEditingController();
    final sessionsController = TextEditingController(text: '30');
    final daysController = TextEditingController(text: '180');

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr.addComponent),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Component Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: sessionsController,
              decoration: const InputDecoration(labelText: 'Maintenance every N sessions', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: daysController,
              decoration: const InputDecoration(labelText: 'Maintenance every N days', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.confirm)),
        ],
      ),
    );

    if (result == true && nameController.text.isNotEmpty) {
      final now = DateTime.now().toIso8601String();
      await _repo.addComponent(GearComponentsCompanion(
        gearId: Value(widget.gearId),
        componentName: Value(nameController.text.toLowerCase().replaceAll(' ', '_')),
        componentLabel: Value(nameController.text),
        installDate: Value(now.split('T').first),
        maintenanceIntervalSessions: Value(int.tryParse(sessionsController.text)),
        maintenanceIntervalDays: Value(int.tryParse(daysController.text)),
        createdAt: Value(now),
      ));
      _loadComponents();
    }
    nameController.dispose();
    sessionsController.dispose();
    daysController.dispose();
  }
}

/// 单个零件卡片
class _ComponentCard extends StatelessWidget {
  const _ComponentCard({
    required this.component,
    required this.onMarkMaintenance,
    required this.onReplace,
    required this.onDelete,
  });
  final GearComponent component;
  final VoidCallback onMarkMaintenance;
  final VoidCallback onReplace;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final daysSinceMaint = _daysSinceLastMaintenance();
    final intervalDays = component.maintenanceIntervalDays ?? 180;
    final ratio = daysSinceMaint != null ? daysSinceMaint / intervalDays : 0.0;
    final statusColor = ratio >= 1.0 ? Colors.red : ratio >= 0.8 ? Colors.orange : Colors.green;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.settings, color: statusColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(component.componentLabel,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
                PopupMenuButton<String>(
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'maintain', child: Text('Mark Maintained')),
                    const PopupMenuItem(value: 'replace', child: Text('Replace')),
                    const PopupMenuItem(value: 'delete', child: Text('Delete')),
                  ],
                  onSelected: (v) => switch (v) {
                    'maintain' => onMarkMaintenance(),
                    'replace' => onReplace(),
                    'delete' => onDelete(),
                    _ => null,
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),
            // 维护进度条
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: ratio.clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: Colors.grey[200],
                color: statusColor,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  component.lastMaintenanceDate != null
                      ? 'Last: ${component.lastMaintenanceDate}'
                      : 'Never maintained',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(
                  'Every ${component.maintenanceIntervalDays ?? "?"} days',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            if (component.replacementCost != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  'Cost: \$${component.replacementCost!.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
                ),
              ),
          ],
        ),
      ),
    );
  }

  int? _daysSinceLastMaintenance() {
    if (component.lastMaintenanceDate == null) {
      // 如果有安装日期，用安装日期
      if (component.installDate != null) {
        final install = DateTime.tryParse(component.installDate!);
        if (install != null) return DateTime.now().difference(install).inDays;
      }
      return null;
    }
    final last = DateTime.tryParse(component.lastMaintenanceDate!);
    if (last == null) return null;
    return DateTime.now().difference(last).inDays;
  }
}
