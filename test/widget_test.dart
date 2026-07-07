import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';

import 'package:go_casting/app/home_page.dart';
import 'package:go_casting/app/theme.dart';
import 'package:go_casting/core/database/reference_db.dart';
import 'package:go_casting/core/database/user_db.dart';
import 'package:go_casting/core/settings/settings_controller.dart';
import 'package:go_casting/features/maintenance/data/maintenance_repository.dart';

void main() {
  setUp(() {
    // 注入依赖（测试环境）
    Get.put(ReferenceDatabase());
    Get.put(UserDatabase());
    Get.put(SettingsController());
    Get.put(MaintenanceRepository(Get.find<UserDatabase>()));
  });

  tearDown(() {
    Get.reset();
  });

  testWidgets('Home page renders with 3 navigation tabs', (tester) async {
    await tester.pumpWidget(
      GetMaterialApp(
        theme: AppTheme.light,
        home: const HomePage(),
      ),
    );
    // 只 pump 一帧，不等 settle（数据库操作会挂起）
    await tester.pump();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationDestination), findsNWidgets(3));
  });
}
