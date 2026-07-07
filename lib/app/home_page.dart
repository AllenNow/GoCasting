import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../features/gear/presentation/gear_screen.dart';
import '../features/maintenance/presentation/maintenance_screen.dart';
import '../features/planner/presentation/planner_screen.dart';
import '../l10n/l10n.dart';

/// 主页 — 底部导航控制器
class HomeController extends GetxController {
  final currentIndex = 0.obs;
  void changePage(int index) => currentIndex.value = index;
}

/// 带底部导航栏的主页面
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(HomeController());

    final pages = const [
      GearScreen(),
      MaintenanceScreen(),
      PlannerScreen(),
    ];

    return Obx(() => Scaffold(
          body: IndexedStack(
            index: controller.currentIndex.value,
            children: pages,
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: controller.currentIndex.value,
            onDestinationSelected: controller.changePage,
            destinations: [
              NavigationDestination(
                icon: const Icon(Icons.build_outlined),
                selectedIcon: const Icon(Icons.build),
                label: context.tr.tabGear,
              ),
              NavigationDestination(
                icon: const Icon(Icons.handyman_outlined),
                selectedIcon: const Icon(Icons.handyman),
                label: context.tr.tabMaintenance,
              ),
              NavigationDestination(
                icon: const Icon(Icons.water_outlined),
                selectedIcon: const Icon(Icons.water),
                label: context.tr.tabPlanner,
              ),
            ],
          ),
        ));
  }
}
