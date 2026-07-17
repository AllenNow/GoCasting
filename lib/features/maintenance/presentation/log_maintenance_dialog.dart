import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide Value;

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';
import '../domain/maintenance_scheduler.dart';

/// 维护记录对话框 — 支持选择维护类型、输入费用
class LogMaintenanceDialog extends StatefulWidget {
  const LogMaintenanceDialog({super.key, required this.gearId, required this.gearType});
  final int gearId;
  final String gearType;

  /// 显示对话框并返回是否成功记录
  static Future<bool?> show(BuildContext context, {required int gearId, required String gearType}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => LogMaintenanceDialog(gearId: gearId, gearType: gearType),
    );
  }

  @override
  State<LogMaintenanceDialog> createState() => _LogMaintenanceDialogState();
}

class _LogMaintenanceDialogState extends State<LogMaintenanceDialog> {
  final _repo = Get.find<MaintenanceRepository>();
  final _costController = TextEditingController();
  final _notesController = TextEditingController();
  final _providerController = TextEditingController();

  late final List<MaintenanceRule> _rules;
  String? _selectedType;
  String _costCategory = 'self_service';
  DateTime _date = DateTime.now();

  @override
  void initState() {
    super.initState();
    const scheduler = MaintenanceScheduler();
    _rules = scheduler.getRulesForGearType(widget.gearType);
    if (_rules.isNotEmpty) _selectedType = _rules.first.type;
  }

  @override
  void dispose() {
    _costController.dispose();
    _notesController.dispose();
    _providerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16, right: 16, top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 标题
            Row(
              children: [
                const Icon(Icons.build, color: Colors.blue),
                const SizedBox(width: 8),
                Text('Log Maintenance', style: Theme.of(context).textTheme.titleLarge),
              ],
            ),
            const SizedBox(height: 16),

            // 维护类型选择
            if (_rules.isNotEmpty) ...[
              Text('Maintenance Type', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _rules.map((rule) => ChoiceChip(
                  label: Text(rule.label),
                  selected: _selectedType == rule.type,
                  onSelected: (_) => setState(() => _selectedType = rule.type),
                )).toList(),
              ),
              const SizedBox(height: 16),
            ],

            // 日期
            Text('Date', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                  isDense: true,
                ),
                child: Text(_date.toIso8601String().split('T').first),
              ),
            ),
            const SizedBox(height: 16),

            // 费用类别
            Text('Cost Category', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'self_service', label: Text('Self'), icon: Icon(Icons.handyman)),
                ButtonSegment(value: 'professional', label: Text('Pro'), icon: Icon(Icons.store)),
                ButtonSegment(value: 'parts_replacement', label: Text('Parts'), icon: Icon(Icons.settings)),
              ],
              selected: {_costCategory},
              onSelectionChanged: (s) => setState(() => _costCategory = s.first),
            ),
            const SizedBox(height: 16),

            // 费用
            TextFormField(
              controller: _costController,
              decoration: const InputDecoration(
                labelText: 'Cost (\$)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.attach_money),
                hintText: '0.00 (optional)',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 12),

            // 服务商（专业维护时）
            if (_costCategory == 'professional')
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TextFormField(
                  controller: _providerController,
                  decoration: const InputDecoration(
                    labelText: 'Service Provider',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.store),
                    hintText: 'e.g. Local Reel Shop',
                  ),
                ),
              ),

            // 备注
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.notes),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 20),

            // 保存
            FilledButton.icon(
              onPressed: _save,
              icon: const Icon(Icons.check),
              label: Text(context.tr.recordMaintenance),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save() async {
    final now = DateTime.now().toIso8601String();
    final cost = double.tryParse(_costController.text);

    await _repo.addMaintenanceLog(MaintenanceLogsCompanion(
      gearId: Value(widget.gearId),
      date: Value(_date.toIso8601String().split('T').first),
      maintenanceType: Value(_selectedType ?? 'full_service'),
      notes: Value(_notesController.text.isNotEmpty ? _notesController.text : null),
      cost: Value(cost),
      costCategory: Value(cost != null ? _costCategory : null),
      serviceProvider: Value(_providerController.text.isNotEmpty ? _providerController.text : null),
      createdAt: Value(now),
    ));

    if (mounted) Navigator.of(context).pop(true);
  }
}
