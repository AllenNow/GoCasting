import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../core/database/reference_db.dart';

/// 装备浏览控制器
class GearBrowseController extends GetxController {
  final isRods = true.obs;
  final rods = <Rod>[].obs;
  final reels = <Reel>[].obs;
  final selectedForCompare = <dynamic>[].obs;

  @override
  void onInit() {
    super.onInit();
    _load();
  }

  Future<void> _load() async {
    final db = Get.find<ReferenceDatabase>();
    rods.value = await db.select(db.rods).get();
    reels.value = await db.select(db.reels).get();
  }

  void toggleCompare(dynamic item) {
    if (selectedForCompare.contains(item)) {
      selectedForCompare.remove(item);
    } else if (selectedForCompare.length < 3) {
      selectedForCompare.add(item);
    }
  }
}

/// 装备浏览页面
class GearBrowseScreen extends StatelessWidget {
  const GearBrowseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(GearBrowseController());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Browse Gear'),
        actions: [
          Obx(() => ctrl.selectedForCompare.length >= 2
              ? IconButton(
                  icon: const Icon(Icons.compare_arrows),
                  onPressed: () => Get.toNamed(AppRoutes.gearCompare),
                )
              : const SizedBox.shrink()),
        ],
      ),
      body: Column(
        children: [
          Obx(() => Padding(
                padding: const EdgeInsets.all(8),
                child: SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: true, label: Text('Rods')),
                    ButtonSegment(value: false, label: Text('Reels')),
                  ],
                  selected: {ctrl.isRods.value},
                  onSelectionChanged: (s) {
                    ctrl.isRods.value = s.first;
                    ctrl.selectedForCompare.clear();
                  },
                ),
              )),
          Expanded(child: Obx(() => ctrl.isRods.value ? _RodList(ctrl: ctrl) : _ReelList(ctrl: ctrl))),
        ],
      ),
    );
  }
}

class _RodList extends StatelessWidget {
  const _RodList({required this.ctrl});
  final GearBrowseController ctrl;

  @override
  Widget build(BuildContext context) {
    if (ctrl.rods.isEmpty) return const Center(child: Text('No rods'));
    return ListView.builder(
      itemCount: ctrl.rods.length,
      itemBuilder: (_, i) {
        final rod = ctrl.rods[i];
        return Obx(() {
          final selected = ctrl.selectedForCompare.contains(rod);
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: selected ? Theme.of(context).colorScheme.primaryContainer : null,
              child: selected ? const Icon(Icons.check) : Text("${rod.lengthFt.toInt()}'"),
            ),
            title: Text('${rod.brand} ${rod.model}'),
            subtitle: Text('${rod.power} | ${rod.action} | Corrosion: ${rod.corrosionRating}/5'),
            onLongPress: () => ctrl.toggleCompare(rod),
          );
        });
      },
    );
  }
}

class _ReelList extends StatelessWidget {
  const _ReelList({required this.ctrl});
  final GearBrowseController ctrl;

  @override
  Widget build(BuildContext context) {
    if (ctrl.reels.isEmpty) return const Center(child: Text('No reels'));
    return ListView.builder(
      itemCount: ctrl.reels.length,
      itemBuilder: (_, i) {
        final reel = ctrl.reels[i];
        return Obx(() {
          final selected = ctrl.selectedForCompare.contains(reel);
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: selected ? Theme.of(context).colorScheme.primaryContainer : null,
              child: selected ? const Icon(Icons.check) : Text('${reel.size}'),
            ),
            title: Text('${reel.brand} ${reel.model}'),
            subtitle: Text('${reel.maxDragLb}lb drag | ${reel.sealType}'),
            onLongPress: () => ctrl.toggleCompare(reel),
          );
        });
      },
    );
  }
}
