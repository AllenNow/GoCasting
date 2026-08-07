import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../features/catch_log/presentation/catch_log_screen.dart';
import '../features/dashboard/presentation/dashboard_screen.dart';
import '../features/gear/presentation/gear_hub_screen.dart';
import '../features/planner/presentation/planner_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../l10n/l10n.dart';

/// 主页 — 底部导航控制器
class HomeController extends GetxController {
  final currentIndex = 0.obs;
  void changePage(int index) => currentIndex.value = index;
}

/// 带底部导航栏的主页面（5 Tab）
///
/// [首页] - 仪表板概览
/// [装备] - 装备智能工具箱
/// [渔获] - 渔获日志 + 分析
/// [规划] - 出行规划器
/// [我的] - 个人中心（成就/挑战/设置）
class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.put(HomeController());

    final pages = const [
      DashboardScreen(),
      GearHubScreen(),
      CatchLogScreen(),
      PlannerScreen(),
      ProfileScreen(),
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
                icon: const Icon(Icons.home_outlined),
                selectedIcon: const Icon(Icons.home),
                label: context.tr.tabHome,
              ),
              NavigationDestination(
                icon: const Icon(Icons.build_outlined),
                selectedIcon: const Icon(Icons.build),
                label: context.tr.tabGear,
              ),
              NavigationDestination(
                icon: const Icon(Icons.phishing_outlined),
                selectedIcon: const Icon(Icons.phishing),
                label: context.tr.tabCatches,
              ),
              NavigationDestination(
                icon: const Icon(Icons.water_outlined),
                selectedIcon: const Icon(Icons.water),
                label: context.tr.tabPlanner,
              ),
              NavigationDestination(
                icon: const Icon(Icons.person_outlined),
                selectedIcon: const Icon(Icons.person),
                label: context.tr.tabMe,
              ),
            ],
          ),
        ));
  }
}
