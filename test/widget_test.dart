import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:go_casting/app/theme.dart';

void main() {
  // 测试使用独立路由，不依赖数据库 providers
  testWidgets('App shell renders with 3 navigation tabs', (tester) async {
    final testRouter = GoRouter(
      initialLocation: '/gear',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) {
            return Scaffold(
              body: navigationShell,
              bottomNavigationBar: NavigationBar(
                selectedIndex: navigationShell.currentIndex,
                onDestinationSelected: navigationShell.goBranch,
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
          },
          branches: [
            StatefulShellBranch(routes: [
              GoRoute(
                  path: '/gear',
                  builder: (_, __) =>
                      const Center(child: Text('Gear Intelligence'))),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                  path: '/maintenance',
                  builder: (_, __) =>
                      const Center(child: Text('Maintenance Tracker'))),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                  path: '/planner',
                  builder: (_, __) =>
                      const Center(child: Text('Session Planner'))),
            ]),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: testRouter,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationDestination), findsNWidgets(3));
  });

  testWidgets('Navigation between tabs works', (tester) async {
    final testRouter = GoRouter(
      initialLocation: '/gear',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) {
            return Scaffold(
              body: navigationShell,
              bottomNavigationBar: NavigationBar(
                selectedIndex: navigationShell.currentIndex,
                onDestinationSelected: navigationShell.goBranch,
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.build_outlined),
                    label: 'Gear',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.handyman_outlined),
                    label: 'Maintenance',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.water_outlined),
                    label: 'Planner',
                  ),
                ],
              ),
            );
          },
          branches: [
            StatefulShellBranch(routes: [
              GoRoute(
                  path: '/gear',
                  builder: (_, __) =>
                      const Center(child: Text('Gear Intelligence'))),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                  path: '/maintenance',
                  builder: (_, __) =>
                      const Center(child: Text('Maintenance Tracker'))),
            ]),
            StatefulShellBranch(routes: [
              GoRoute(
                  path: '/planner',
                  builder: (_, __) =>
                      const Center(child: Text('Session Planner'))),
            ]),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: testRouter,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // 默认在 Gear tab
    expect(find.text('Gear Intelligence'), findsOneWidget);

    // 切换到 Maintenance tab
    await tester.tap(find.text('Maintenance'));
    await tester.pumpAndSettle();
    expect(find.text('Maintenance Tracker'), findsOneWidget);

    // 切换到 Planner tab
    await tester.tap(find.text('Planner'));
    await tester.pumpAndSettle();
    expect(find.text('Session Planner'), findsOneWidget);
  });
}
