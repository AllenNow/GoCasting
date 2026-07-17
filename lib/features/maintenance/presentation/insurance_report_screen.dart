import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:flutter/services.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';
import '../domain/depreciation_engine.dart';

/// 保险报告导出页面
class InsuranceReportScreen extends StatefulWidget {
  const InsuranceReportScreen({super.key});

  @override
  State<InsuranceReportScreen> createState() => _InsuranceReportScreenState();
}

class _InsuranceReportScreenState extends State<InsuranceReportScreen> {
  final _repo = Get.find<MaintenanceRepository>();
  bool _loading = true;
  List<_GearReportItem> _items = [];
  double _totalOriginal = 0;
  double _totalCurrent = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final allGear = await _repo.getActiveGear();
    const engine = DepreciationEngine();
    final items = <_GearReportItem>[];

    for (final gear in allGear) {
      final originalPrice = gear.pricePaid ?? 0.0;
      double currentValue = originalPrice;

      if (originalPrice > 0 && gear.purchaseDate != null) {
        final purchaseDate = DateTime.tryParse(gear.purchaseDate!);
        final ageInDays = purchaseDate != null
            ? DateTime.now().difference(purchaseDate).inDays
            : 0;
        final totalSessions = await _repo.getUsageCount(gear.id);
        final usageLogs = await _repo.getUsageLogs(gear.id);
        final saltwaterCount = usageLogs.where((l) => l.environment == 'saltwater').length;
        final saltwaterRatio = usageLogs.isNotEmpty ? saltwaterCount / usageLogs.length : 1.0;
        final maintenanceLogs = await _repo.getMaintenanceLogs(gear.id);
        final expectedMaint = (totalSessions / 15).ceil();
        final maintenanceScore = engine.calculateMaintenanceScore(
          actualMaintenanceCount: maintenanceLogs.length,
          expectedMaintenanceCount: expectedMaint,
        );

        final result = engine.calculate(
          originalPrice: originalPrice,
          gearType: gear.gearType,
          ageInDays: ageInDays,
          totalSessions: totalSessions,
          saltwaterRatio: saltwaterRatio,
          maintenanceScore: maintenanceScore,
        );
        currentValue = result.currentValue;
      }

      items.add(_GearReportItem(
        gear: gear,
        currentValue: currentValue,
      ));
    }

    setState(() {
      _items = items;
      _totalOriginal = items.fold(0.0, (sum, i) => sum + (i.gear.pricePaid ?? 0.0));
      _totalCurrent = items.fold(0.0, (sum, i) => sum + i.currentValue);
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.insuranceReport),
        actions: [
          IconButton(
            onPressed: _loading ? null : _exportCsv,
            icon: const Icon(Icons.file_download),
            tooltip: 'Export CSV',
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? _buildEmpty()
              : _buildReport(context),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(context.tr.noActiveGear),
          const SizedBox(height: 8),
          Text(context.tr.addGearForReport),
        ],
      ),
    );
  }

  Widget _buildReport(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 摘要卡片
        _buildSummaryCard(context),
        const SizedBox(height: 16),

        // 导出按钮
        FilledButton.icon(
          onPressed: _exportCsv,
          icon: const Icon(Icons.file_download),
          label: Text(context.tr.exportAsCsv),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _copyToClipboard,
          icon: const Icon(Icons.copy),
          label: Text(context.tr.copyToClipboard),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
        const SizedBox(height: 16),

        // 装备列表
        Text('Gear Inventory (${_items.length} items)',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ..._items.map((item) => _GearReportCard(item: item)),
      ],
    );
  }

  Widget _buildSummaryCard(BuildContext context) {
    final retainedPercent = _totalOriginal > 0
        ? (_totalCurrent / _totalOriginal * 100)
        : 0.0;

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.shield_outlined),
                const SizedBox(width: 8),
                Text('Insurance Summary', style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _SummaryStat(
                  label: 'Total Items',
                  value: '${_items.length}',
                )),
                Expanded(child: _SummaryStat(
                  label: 'Original Value',
                  value: '\$${_totalOriginal.toStringAsFixed(0)}',
                )),
                Expanded(child: _SummaryStat(
                  label: 'Current Value',
                  value: '\$${_totalCurrent.toStringAsFixed(0)}',
                )),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _SummaryStat(
                  label: 'Value Retained',
                  value: '${retainedPercent.toStringAsFixed(0)}%',
                )),
                Expanded(child: _SummaryStat(
                  label: 'Report Date',
                  value: DateTime.now().toIso8601String().split('T').first,
                )),
                const Expanded(child: SizedBox()),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _generateCsvContent() {
    final buf = StringBuffer();
    // 报告头
    buf.writeln('GoCasting Insurance Report');
    buf.writeln('Generated: ${DateTime.now().toIso8601String().split('T').first}');
    buf.writeln('Total Items: ${_items.length}');
    buf.writeln('Total Original Value: \$${_totalOriginal.toStringAsFixed(2)}');
    buf.writeln('Total Current Value: \$${_totalCurrent.toStringAsFixed(2)}');
    buf.writeln('');
    // CSV 表头
    buf.writeln('Name,Type,Brand,Model,Purchase Date,Original Price,Current Value,Status');
    // 数据行
    for (final item in _items) {
      final g = item.gear;
      buf.writeln(
        '"${g.customName}","${g.gearType}","${g.brand ?? ''}","${g.model ?? ''}",'
        '"${g.purchaseDate ?? ''}",${g.pricePaid?.toStringAsFixed(2) ?? '0.00'},'
        '${item.currentValue.toStringAsFixed(2)},"${g.status}"',
      );
    }
    return buf.toString();
  }

  Future<void> _exportCsv() async {
    final csv = _generateCsvContent();
    final dir = await getApplicationDocumentsDirectory();
    final date = DateTime.now().toIso8601String().split('T').first;
    final file = File(p.join(dir.path, 'GoCasting_Insurance_Report_$date.csv'));
    await file.writeAsString(csv);

    if (mounted) {
      Get.snackbar(
        'Report Exported',
        'Saved to: ${file.path}',
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
    }
  }

  Future<void> _copyToClipboard() async {
    final csv = _generateCsvContent();
    await Clipboard.setData(ClipboardData(text: csv));
    if (mounted) {
      Get.snackbar(
        'Copied',
        'Report copied to clipboard',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }
}

class _GearReportItem {
  const _GearReportItem({required this.gear, required this.currentValue});
  final UserGearData gear;
  final double currentValue;
}

class _GearReportCard extends StatelessWidget {
  const _GearReportCard({required this.item});
  final _GearReportItem item;

  @override
  Widget build(BuildContext context) {
    final g = item.gear;
    final originalPrice = g.pricePaid ?? 0.0;
    final retainedPercent = originalPrice > 0
        ? (item.currentValue / originalPrice * 100)
        : 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // 图标
            CircleAvatar(
              radius: 20,
              backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Icon(_gearIcon(g.gearType), size: 20),
            ),
            const SizedBox(width: 12),
            // 信息
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(g.customName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    '${g.gearType.toUpperCase()} • ${g.brand ?? ''} ${g.model ?? ''}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  if (g.purchaseDate != null)
                    Text('Purchased: ${g.purchaseDate}',
                        style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            // 价值
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('\$${item.currentValue.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text(
                  '${retainedPercent.toStringAsFixed(0)}% of \$${originalPrice.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  IconData _gearIcon(String type) => switch (type.toLowerCase()) {
        'reel' => Icons.settings,
        'rod' => Icons.straighten,
        'line' => Icons.linear_scale,
        _ => Icons.inventory_2,
      };
}

class _SummaryStat extends StatelessWidget {
  const _SummaryStat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      );
}
