import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide Value;

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';

/// 维修状态追踪页面
class ServiceRecordsScreen extends StatefulWidget {
  const ServiceRecordsScreen({super.key, required this.gearId, required this.gearName});
  final int gearId;
  final String gearName;

  @override
  State<ServiceRecordsScreen> createState() => _ServiceRecordsScreenState();
}

class _ServiceRecordsScreenState extends State<ServiceRecordsScreen> {
  final _repo = Get.find<MaintenanceRepository>();
  List<ServiceRecord> _records = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadRecords();
  }

  Future<void> _loadRecords() async {
    final records = await _repo.getServiceRecords(widget.gearId);
    setState(() {
      _records = records;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Service — ${widget.gearName}')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addRecord,
        icon: const Icon(Icons.local_shipping),
        label: Text(context.tr.sendForService),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _records.isEmpty
              ? _buildEmpty()
              : _buildList(),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.local_shipping_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(context.tr.noServiceRecords),
          const SizedBox(height: 8),
          Text('Track professional repairs and servicing here.',
              style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }

  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _records.length,
      itemBuilder: (ctx, i) => _ServiceRecordCard(
        record: _records[i],
        onUpdateStatus: () => _updateStatus(_records[i]),
      ),
    );
  }

  Future<void> _addRecord() async {
    final providerController = TextEditingController();
    final notesController = TextEditingController();
    DateTime dateSent = DateTime.now();
    DateTime? estimatedReturn;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 16, right: 16, top: 16,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Send for Service', style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 16),
                TextField(
                  controller: providerController,
                  decoration: const InputDecoration(
                    labelText: 'Service Provider *',
                    border: OutlineInputBorder(),
                    hintText: 'e.g. Local Reel Repair Shop',
                  ),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: dateSent,
                      firstDate: DateTime(2020),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) setSheetState(() => dateSent = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Date Sent',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today),
                    ),
                    child: Text(dateSent.toIso8601String().split('T').first),
                  ),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: DateTime.now().add(const Duration(days: 14)),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 180)),
                    );
                    if (picked != null) setSheetState(() => estimatedReturn = picked);
                  },
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Estimated Return (optional)',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.calendar_today),
                    ),
                    child: Text(estimatedReturn?.toIso8601String().split('T').first ?? 'Not set'),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes (optional)',
                    border: OutlineInputBorder(),
                    hintText: 'Reason for service...',
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    if (providerController.text.isEmpty) return;
                    Navigator.pop(ctx, true);
                  },
                  icon: const Icon(Icons.check),
                  label: Text(context.tr.record),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    if (result == true) {
      final now = DateTime.now().toIso8601String();
      await _repo.addServiceRecord(ServiceRecordsCompanion(
        gearId: Value(widget.gearId),
        serviceProvider: Value(providerController.text),
        dateSent: Value(dateSent.toIso8601String().split('T').first),
        estimatedReturnDate: Value(estimatedReturn?.toIso8601String().split('T').first),
        status: const Value('sent'),
        notes: Value(notesController.text.isNotEmpty ? notesController.text : null),
        createdAt: Value(now),
      ));
      _loadRecords();
      Get.snackbar('Done', 'Service record created', snackPosition: SnackPosition.BOTTOM);
    }
    providerController.dispose();
    notesController.dispose();
  }

  Future<void> _updateStatus(ServiceRecord record) async {
    final nextStatus = switch (record.status) {
      'sent' => 'in_repair',
      'in_repair' => 'returned',
      _ => null,
    };

    if (nextStatus == null) return; // 已经是 returned

    final costController = TextEditingController();
    String? costValue;

    if (nextStatus == 'returned') {
      // 返回时可以记录费用
      final result = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(context.tr.markReturned),
          content: TextField(
            controller: costController,
            decoration: const InputDecoration(
              labelText: 'Service Cost (\$)',
              border: OutlineInputBorder(),
              hintText: '0.00 (optional)',
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.confirm)),
          ],
        ),
      );
      if (result != true) {
        costController.dispose();
        return;
      }
      costValue = costController.text;
      costController.dispose();
    }

    final now = DateTime.now().toIso8601String().split('T').first;
    final cost = double.tryParse(costValue ?? '');

    await _repo.updateServiceRecord(record.id, ServiceRecordsCompanion(
      status: Value(nextStatus),
      actualReturnDate: nextStatus == 'returned' ? Value(now) : const Value.absent(),
      cost: cost != null ? Value(cost) : const Value.absent(),
    ));
    _loadRecords();

    final msg = switch (nextStatus) {
      'in_repair' => 'Status updated: In Repair',
      'returned' => 'Gear returned! Welcome back.',
      _ => 'Updated',
    };
    Get.snackbar('Done', msg, snackPosition: SnackPosition.BOTTOM);
  }
}

/// 维修记录卡片
class _ServiceRecordCard extends StatelessWidget {
  const _ServiceRecordCard({required this.record, required this.onUpdateStatus});
  final ServiceRecord record;
  final VoidCallback onUpdateStatus;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(record.status);
    final canAdvance = record.status != 'returned';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 状态和服务商
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_statusIcon(record.status), size: 14, color: color),
                      const SizedBox(width: 4),
                      Text(_statusLabel(record.status),
                          style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
                    ],
                  ),
                ),
                const Spacer(),
                if (canAdvance)
                  TextButton.icon(
                    onPressed: onUpdateStatus,
                    icon: const Icon(Icons.arrow_forward, size: 16),
                    label: Text(_nextActionLabel(record.status)),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(record.serviceProvider, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 4),
            Text('Sent: ${record.dateSent}', style: Theme.of(context).textTheme.bodySmall),
            if (record.estimatedReturnDate != null)
              Text('Est. return: ${record.estimatedReturnDate}', style: Theme.of(context).textTheme.bodySmall),
            if (record.actualReturnDate != null)
              Text('Returned: ${record.actualReturnDate}', style: Theme.of(context).textTheme.bodySmall),
            if (record.cost != null)
              Text('Cost: \$${record.cost!.toStringAsFixed(2)}',
                  style: TextStyle(fontWeight: FontWeight.w500, color: Colors.green[700])),
            if (record.notes != null) ...[
              const SizedBox(height: 4),
              Text(record.notes!, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic)),
            ],
          ],
        ),
      ),
    );
  }

  Color _statusColor(String status) => switch (status) {
        'sent' => Colors.orange,
        'in_repair' => Colors.blue,
        'returned' => Colors.green,
        _ => Colors.grey,
      };

  IconData _statusIcon(String status) => switch (status) {
        'sent' => Icons.local_shipping,
        'in_repair' => Icons.build,
        'returned' => Icons.check_circle,
        _ => Icons.help,
      };

  String _statusLabel(String status) => switch (status) {
        'sent' => 'Sent',
        'in_repair' => 'In Repair',
        'returned' => 'Returned',
        _ => status,
      };

  String _nextActionLabel(String status) => switch (status) {
        'sent' => 'Mark In Repair',
        'in_repair' => 'Mark Returned',
        _ => '',
      };
}
