import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/settings/settings_screen.dart';
import '../features/gear/presentation/gear_screen.dart';
import '../features/gear/presentation/gear_wizard_screen.dart';
import '../features/gear/presentation/gear_results_screen.dart';
import '../features/gear/presentation/gear_compare_screen.dart';
import '../features/maintenance/presentation/maintenance_screen.dart';
import '../features/maintenance/presentation/add_gear_screen.dart';
import '../features/maintenance/presentation/gear_detail_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../features/planner/presentation/planner_screen.dart';

final goRouter = GoRouter(
  initialLocation: '/gear',
  routes: [
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return ScaffoldWithNavBar(navigationShell: navigationShell);
      },
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/gear',
              builder: (context, state) => const GearScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/maintenance',
              builder: (context, state) => const MaintenanceScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/planner',
              builder: (context, state) => const PlannerScreen(),
            ),
          ],
        ),
      ],
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: '/gear/wizard',
      builder: (context, state) => const GearWizardScreen(),
    ),
    GoRoute(
      path: '/gear/wizard/results',
      builder: (context, state) => const GearResultsScreen(),
    ),
    GoRoute(
      path: '/gear/compare/:category',
      builder: (context, state) => GearCompareScreen(
        category: state.pathParameters['category'] ?? 'rod',
      ),
    ),
    GoRoute(
      path: '/maintenance/add',
      builder: (context, state) => const AddGearScreen(),
    ),
    GoRoute(
      path: '/maintenance/detail/:id',
      builder: (context, state) => GearDetailScreen(
        gearId: int.parse(state.pathParameters['id'] ?? '0'),
      ),
    ),
  ],
);

/// 带底部导航栏的主布局
class ScaffoldWithNavBar extends StatelessWidget {
  const ScaffoldWithNavBar({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.build_outlined),
            selectedIcon: Icon(Icons.build),
            label: 'Gear',
          ),
          NavigationDestination(
            icon: Icon(Icons.handyman_outlined),
            selectedIcon: Icon(Icons.handyman),
            label: 'Maintenance',
          ),
          NavigationDestination(
            icon: Icon(Icons.water_outlined),
            selectedIcon: Icon(Icons.water),
            label: 'Planner',
          ),
        ],
      ),
    );
  }
}
