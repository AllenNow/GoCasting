import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide Value;

import '../../../core/database/user_db.dart';
import '../../../core/notifications/notification_service.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';

/// 保修信息管理页面
class WarrantyScreen extends StatefulWidget {
  const WarrantyScreen({super.key, required this.gearId, required this.gearName});
  final int gearId;
  final String gearName;

  @override
  State<WarrantyScreen> createState() => _WarrantyScreenState();
}

class _WarrantyScreenState extends State<WarrantyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _repo = Get.find<MaintenanceRepository>();

  late final TextEditingController _providerController;
  late final TextEditingController _termsController;
  late final TextEditingController _durationController;

  DateTime _startDate = DateTime.now();
  GearWarranty? _existing;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _providerController = TextEditingController();
    _termsController = TextEditingController();
    _durationController = TextEditingController(text: '12');
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    final warranty = await _repo.getWarranty(widget.gearId);
    if (warranty != null) {
      _existing = warranty;
      _startDate = DateTime.parse(warranty.warrantyStartDate);
      _durationController.text = warranty.warrantyDurationMonths.toString();
      _providerController.text = warranty.providerName ?? '';
      _termsController.text = warranty.warrantyTerms ?? '';
    }
    setState(() => _loading = false);
  }

  DateTime get _expiryDate {
    final months = int.tryParse(_durationController.text) ?? 12;
    return DateTime(_startDate.year, _startDate.month + months, _startDate.day);
  }

  String get _warrantyStatus {
    final now = DateTime.now();
    final expiry = _expiryDate;
    if (now.isAfter(expiry)) return 'expired';
    if (expiry.difference(now).inDays <= 30) return 'expiring_soon';
    return 'active';
  }

  Color get _statusColor => switch (_warrantyStatus) {
        'active' => Colors.green,
        'expiring_soon' => Colors.orange,
        'expired' => Colors.red,
        _ => Colors.grey,
      };

  String get _statusLabel => switch (_warrantyStatus) {
        'active' => 'Active',
        'expiring_soon' => 'Expiring Soon',
        'expired' => 'Expired',
        _ => 'Unknown',
      };

  @override
  void dispose() {
    _providerController.dispose();
    _termsController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(context.tr.warranty)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Warranty — ${widget.gearName}'),
        actions: [
          if (_existing != null)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: _deleteWarranty,
              tooltip: 'Delete Warranty',
            ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 保修状态卡片
            if (_existing != null)
              Card(
                color: _statusColor.withValues(alpha: 0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(Icons.verified_user, color: _statusColor, size: 32),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_statusLabel,
                              style: TextStyle(
                                  color: _statusColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16)),
                          Text(
                            'Expires: ${_expiryDate.toIso8601String().split('T').first}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),

            // 保修开始日期
            Text('Warranty Start Date',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            InkWell(
              onTap: _pickStartDate,
              child: InputDecorator(
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                child: Text(_startDate.toIso8601String().split('T').first),
              ),
            ),
            const SizedBox(height: 16),

            // 保修时长
            TextFormField(
              controller: _durationController,
              decoration: const InputDecoration(
                labelText: 'Warranty Duration (months)',
                border: OutlineInputBorder(),
                hintText: 'e.g. 12',
              ),
              keyboardType: TextInputType.number,
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (int.tryParse(v) == null || int.parse(v) <= 0) {
                  return 'Enter a valid number';
                }
                return null;
              },
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),

            // 供应商
            TextFormField(
              controller: _providerController,
              decoration: const InputDecoration(
                labelText: 'Provider / Retailer',
                border: OutlineInputBorder(),
                hintText: 'e.g. Bass Pro Shops',
              ),
            ),
            const SizedBox(height: 16),

            // 保修条款
            TextFormField(
              controller: _termsController,
              decoration: const InputDecoration(
                labelText: 'Warranty Terms (optional)',
                border: OutlineInputBorder(),
                hintText: 'Brief summary of coverage...',
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),

            // 计算后的到期日期
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.event, color: Colors.blue),
                    const SizedBox(width: 8),
                    Text(
                      'Calculated Expiry: ${_expiryDate.toIso8601String().split('T').first}',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // 保存按钮
            FilledButton.icon(
              onPressed: _save,
              icon: const Icon(Icons.save),
              label: Text(_existing != null ? 'Update Warranty' : 'Save Warranty'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final now = DateTime.now().toIso8601String();
    final duration = int.parse(_durationController.text);
    final expiry = DateTime(_startDate.year, _startDate.month + duration, _startDate.day);

    final data = GearWarrantiesCompanion(
      gearId: Value(widget.gearId),
      warrantyStartDate: Value(_startDate.toIso8601String().split('T').first),
      warrantyDurationMonths: Value(duration),
      warrantyExpiryDate: Value(expiry.toIso8601String().split('T').first),
      providerName: Value(_providerController.text.isNotEmpty ? _providerController.text : null),
      warrantyTerms: Value(_termsController.text.isNotEmpty ? _termsController.text : null),
      createdAt: Value(now),
    );

    if (_existing != null) {
      await _repo.updateWarranty(_existing!.id, data);
      Get.snackbar('Done', 'Warranty updated', snackPosition: SnackPosition.BOTTOM);
    } else {
      await _repo.addWarranty(data);
      Get.snackbar('Done', 'Warranty saved', snackPosition: SnackPosition.BOTTOM);
    }

    // 调度保修到期提醒通知（30天前 + 7天前）
    await NotificationService.instance.scheduleWarrantyReminders(
      gearId: widget.gearId,
      gearName: widget.gearName,
      expiryDate: expiry,
    );

    if (mounted) Navigator.of(context).pop(true);
  }

  Future<void> _deleteWarranty() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr.deleteWarranty),
        content: Text(context.tr.deleteWarrantyConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.delete)),
        ],
      ),
    );
    if (confirm == true) {
      await _repo.deleteWarranty(widget.gearId);
      await NotificationService.instance.cancelWarrantyReminders(widget.gearId);
      Get.snackbar('Deleted', 'Warranty removed', snackPosition: SnackPosition.BOTTOM);
      if (mounted) Navigator.of(context).pop(true);
    }
  }
}
