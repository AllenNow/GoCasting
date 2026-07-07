import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/reference_db.dart';
import 'gear_browse_screen.dart';

/// 装备对比页面
class GearCompareScreen extends StatelessWidget {
  const GearCompareScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final browseCtrl = Get.find<GearBrowseController>();
    final items = browseCtrl.selectedForCompare;

    return Scaffold(
      appBar: AppBar(title: const Text('Compare')),
      body: items.isEmpty
          ? const Center(child: Text('No items selected'))
          : browseCtrl.isRods.value
              ? _RodTable(rods: items.cast<Rod>())
              : _ReelTable(reels: items.cast<Reel>()),
    );
  }
}

class _RodTable extends StatelessWidget {
  const _RodTable({required this.rods});
  final List<Rod> rods;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: DataTable(
      columns: [const DataColumn(label: Text('Spec')), ...rods.map((r) => DataColumn(label: Text('${r.brand}\n${r.model}', style: const TextStyle(fontSize: 11))))],
      rows: [
        _r('Length', rods.map((r) => '${r.lengthFt}ft')),
        _r('Power', rods.map((r) => r.power)),
        _r('Action', rods.map((r) => r.action)),
        _r('Material', rods.map((r) => r.material)),
        _r('Cast Wt', rods.map((r) => '${r.castWeightMinOz}-${r.castWeightMaxOz}oz')),
        _r('Corrosion', rods.map((r) => '${r.corrosionRating}/5')),
      ],
    ),
  );
}

class _ReelTable extends StatelessWidget {
  const _ReelTable({required this.reels});
  final List<Reel> reels;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: DataTable(
      columns: [const DataColumn(label: Text('Spec')), ...reels.map((r) => DataColumn(label: Text('${r.brand}\n${r.model}', style: const TextStyle(fontSize: 11))))],
      rows: [
        _r('Size', reels.map((r) => '${r.size}')),
        _r('Ratio', reels.map((r) => '${r.gearRatio}:1')),
        _r('Max Drag', reels.map((r) => '${r.maxDragLb}lb')),
        _r('Capacity', reels.map((r) => '${r.lineCapacityYds}yds')),
        _r('Weight', reels.map((r) => '${r.weightOz}oz')),
        _r('Seal', reels.map((r) => r.sealType)),
      ],
    ),
  );
}

DataRow _r(String label, Iterable<String> values) => DataRow(cells: [
  DataCell(Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
  ...values.map((v) => DataCell(Text(v))),
]);
