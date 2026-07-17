import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';

/// TCO（总拥有成本）分析页面
class TcoAnalysisScreen extends StatefulWidget {
  const TcoAnalysisScreen({super.key, required this.gearId, required this.gearName});
  final int gearId;
  final String gearName;

  @override
  State<TcoAnalysisScreen> createState() => _TcoAnalysisScreenState();
}

class _TcoAnalysisScreenState extends State<TcoAnalysisScreen> {
  final _repo = Get.find<MaintenanceRepository>();

  bool _loading = true;
  double _purchasePrice = 0.0;
  double _totalMaintenanceCost = 0.0;
  int _totalSessions = 0;
  Map<String, double> _costByCategory = {};
  List<MaintenanceLog> _maintenanceLogs = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final gear = (await _repo.getAllGear()).where((g) => g.id == widget.gearId).firstOrNull;
    final maintCost = await _repo.getTotalMaintenanceCost(widget.gearId);
    final sessions = await _repo.getUsageCount(widget.gearId);
    final byCategory = await _repo.getMaintenanceCostByCategory(widget.gearId);
    final logs = await _repo.getMaintenanceLogs(widget.gearId);

    setState(() {
      _purchasePrice = gear?.pricePaid ?? 0.0;
      _totalMaintenanceCost = maintCost;
      _totalSessions = sessions;
      _costByCategory = byCategory;
      _maintenanceLogs = logs;
      _loading = false;
    });
  }

  double get _tco => _purchasePrice + _totalMaintenanceCost;
  double get _costPerSession => _totalSessions > 0 ? _tco / _totalSessions : 0.0;
  double get _maintenanceRatio =>
      _tco > 0 ? (_totalMaintenanceCost / _tco * 100) : 0.0;

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(context.tr.tcoAnalysis)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text('TCO — ${widget.gearName}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 总成本概览
          _buildSummaryCard(context),
          const SizedBox(height: 16),

          // 成本构成饼图
          if (_tco > 0) ...[
            _buildPieChart(context),
            const SizedBox(height: 16),
          ],

          // 分类明细
          if (_costByCategory.isNotEmpty) ...[
            _buildCategoryBreakdown(context),
            const SizedBox(height: 16),
          ],

          // 维护历史（带费用）
          _buildMaintenanceHistory(context),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cost Summary', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            // 大数字显示
            Center(
              child: Column(
                children: [
                  Text('\$${_tco.toStringAsFixed(2)}',
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          )),
                  Text('Total Cost of Ownership',
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            _InfoRow('Purchase Price', '\$${_purchasePrice.toStringAsFixed(2)}'),
            _InfoRow('Maintenance Cost', '\$${_totalMaintenanceCost.toStringAsFixed(2)}'),
            _InfoRow('Maintenance Ratio', '${_maintenanceRatio.toStringAsFixed(1)}%'),
            const Divider(),
            _InfoRow('Total Sessions', '$_totalSessions'),
            _InfoRow('Cost / Session', '\$${_costPerSession.toStringAsFixed(2)}'),
            if (_totalSessions > 0)
              _InfoRow('Maintenance / Session',
                  '\$${(_totalMaintenanceCost / _totalSessions).toStringAsFixed(2)}'),
          ],
        ),
      ),
    );
  }

  Widget _buildPieChart(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Cost Breakdown', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: [
                    PieChartSectionData(
                      value: _purchasePrice,
                      title: 'Purchase\n${(_purchasePrice / _tco * 100).toStringAsFixed(0)}%',
                      color: Colors.blue,
                      radius: 80,
                      titleStyle: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    if (_totalMaintenanceCost > 0)
                      PieChartSectionData(
                        value: _totalMaintenanceCost,
                        title: 'Maint.\n${(_totalMaintenanceCost / _tco * 100).toStringAsFixed(0)}%',
                        color: Colors.orange,
                        radius: 80,
                        titleStyle: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                  ],
                  sectionsSpace: 2,
                  centerSpaceRadius: 30,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBreakdown(BuildContext context) {
    final categories = _costByCategory.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('By Category', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...categories.map((entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(_categoryIcon(entry.key), size: 20, color: _categoryColor(entry.key)),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_categoryLabel(entry.key))),
                      Text('\$${entry.value.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w500)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  Widget _buildMaintenanceHistory(BuildContext context) {
    final logsWithCost = _maintenanceLogs.where((l) => l.cost != null && l.cost! > 0).toList();
    if (logsWithCost.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(Icons.receipt_long, size: 40, color: Colors.grey[400]),
              const SizedBox(height: 8),
              Text(context.tr.noMaintenanceCosts),
              const SizedBox(height: 4),
              Text('Costs will appear here when you log maintenance with a cost.',
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Maintenance Cost History', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...logsWithCost.map((log) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  leading: Icon(_categoryIcon(log.costCategory ?? 'other'),
                      color: _categoryColor(log.costCategory ?? 'other')),
                  title: Text(_maintenanceTypeLabel(log.maintenanceType)),
                  subtitle: Text(log.date),
                  trailing: Text('\$${log.cost!.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                )),
          ],
        ),
      ),
    );
  }

  String _categoryLabel(String category) => switch (category) {
        'self_service' => 'Self Service',
        'professional' => 'Professional Service',
        'parts_replacement' => 'Parts Replacement',
        _ => 'Other',
      };

  IconData _categoryIcon(String category) => switch (category) {
        'self_service' => Icons.handyman,
        'professional' => Icons.store,
        'parts_replacement' => Icons.settings,
        _ => Icons.receipt,
      };

  Color _categoryColor(String category) => switch (category) {
        'self_service' => Colors.green,
        'professional' => Colors.blue,
        'parts_replacement' => Colors.orange,
        _ => Colors.grey,
      };

  String _maintenanceTypeLabel(String type) => switch (type) {
        'full_service' => 'Full Service',
        'drag_grease' => 'Drag Grease',
        'guide_inspect' => 'Guide Inspection',
        'line_replace' => 'Line Replacement',
        _ => type.replaceAll('_', ' ').capitalize ?? type,
      };
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(color: Colors.grey[600])),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
      );
}
