import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/database/reference_db.dart';

/// 当前对比选择 Provider
final compareSelectionProvider =
    StateProvider<List<dynamic>>((ref) => []);

/// 装备对比页面 — 最多 3 个同类项目
class GearCompareScreen extends ConsumerWidget {
  const GearCompareScreen({super.key, required this.category});

  final String category; // 'rod' or 'reel'

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(compareSelectionProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Compare ${category == "rod" ? "Rods" : "Reels"}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            ref.read(compareSelectionProvider.notifier).state = [];
            context.pop();
          },
        ),
      ),
      body: selected.isEmpty
          ? const Center(child: Text('Select items to compare'))
          : category == 'rod'
              ? _RodComparison(rods: selected.cast<Rod>())
              : _ReelComparison(reels: selected.cast<Reel>()),
    );
  }
}

/// Rod 对比表格
class _RodComparison extends StatelessWidget {
  const _RodComparison({required this.rods});
  final List<Rod> rods;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        child: DataTable(
          columns: [
            const DataColumn(label: Text('Spec')),
            ...rods.map((r) => DataColumn(
                  label: Text('${r.brand}\n${r.model}',
                      style: const TextStyle(fontSize: 12)),
                )),
          ],
          rows: [
            _row('Length', rods.map((r) => '${r.lengthFt} ft')),
            _row('Power', rods.map((r) => r.power)),
            _row('Action', rods.map((r) => r.action)),
            _row('Material', rods.map((r) => r.material)),
            _row('Cast Weight',
                rods.map((r) => '${r.castWeightMinOz}-${r.castWeightMaxOz} oz')),
            _row('Line Rating', rods.map((r) => r.lineRating)),
            _row('Corrosion', rods.map((r) => '${r.corrosionRating}/5')),
            _row('Price Tier', rods.map((r) => _priceTierLabel(r.priceTier))),
          ],
        ),
      ),
    );
  }
}

/// Reel 对比表格
class _ReelComparison extends StatelessWidget {
  const _ReelComparison({required this.reels});
  final List<Reel> reels;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SingleChildScrollView(
        child: DataTable(
          columns: [
            const DataColumn(label: Text('Spec')),
            ...reels.map((r) => DataColumn(
                  label: Text('${r.brand}\n${r.model}',
                      style: const TextStyle(fontSize: 12)),
                )),
          ],
          rows: [
            _row('Size', reels.map((r) => '${r.size}')),
            _row('Gear Ratio', reels.map((r) => '${r.gearRatio}:1')),
            _row('Max Drag', reels.map((r) => '${r.maxDragLb} lb')),
            _row('Line Cap.', reels.map((r) => '${r.lineCapacityYds} yds')),
            _row('Weight', reels.map((r) => '${r.weightOz} oz')),
            _row('Seal Type', reels.map((r) => r.sealType)),
            _row('Price Tier', reels.map((r) => _priceTierLabel(r.priceTier))),
          ],
        ),
      ),
    );
  }
}

DataRow _row(String label, Iterable<String> values) {
  return DataRow(cells: [
    DataCell(Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
    ...values.map((v) => DataCell(Text(v))),
  ]);
}

String _priceTierLabel(int tier) => switch (tier) {
      1 => 'Entry',
      2 => 'Mid',
      3 => 'Premium',
      _ => 'Unknown',
    };
