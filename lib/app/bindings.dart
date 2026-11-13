import 'package:get/get.dart';

import '../core/database/reference_db.dart';
import '../core/database/user_db.dart';
import '../core/database/competition_db.dart';
import '../core/roles/role_controller.dart';
import '../core/settings/locale_controller.dart';
import '../core/settings/settings_controller.dart';
import '../features/maintenance/data/maintenance_repository.dart';

// 比赛功能
import '../features/competition/data/competition_repository.dart';
import '../features/competition/data/competition_seeder.dart';

/// 全局初始绑定 — 注入数据库和核心服务
class InitialBinding extends Bindings {
  @override
  void dependencies() {
    // ReferenceDatabase 已在 main.dart 中预初始化并注册，这里仅在未注册时兜底
    if (!Get.isRegistered<ReferenceDatabase>()) {
      Get.put<ReferenceDatabase>(ReferenceDatabase(), permanent: true);
    }

    // 用户数据库
    Get.put<UserDatabase>(UserDatabase(), permanent: true);

    // 比赛数据库
    Get.put<CompetitionDatabase>(CompetitionDatabase(), permanent: true);

    // 维护仓库
    Get.lazyPut<MaintenanceRepository>(
      () => MaintenanceRepository(Get.find<UserDatabase>()),
    );

    // 比赛仓库 - 依赖 CompetitionDatabase
    Get.lazyPut<CompetitionRepository>(
      () => CompetitionRepository(Get.find<CompetitionDatabase>()),
    );

    // 比赛数据播种器
    Get.lazyPut<CompetitionSeeder>(
      () => CompetitionSeeder(Get.find<CompetitionRepository>()),
    );

    // 设置控制器 — 依赖 UserDatabase
    Get.put(SettingsController(), permanent: true);
    Get.put(LocaleController(), permanent: true);

    // V5: 角色控制器
    Get.put(RoleController(), permanent: true);

    // 自动运行数据播种（在后台异步执行）
    _seedInitialData();
  }

  /// 异步播种初始数据
  void _seedInitialData() {
    // 使用延迟来避免阻塞UI初始化
    Future.delayed(const Duration(seconds: 2), () async {
      try {
        final seeder = Get.find<CompetitionSeeder>();
        await seeder.seedFirstMasterCompetition();
        print('比赛数据播种完成');
      } catch (e) {
        print('比赛数据播种出错（可能已存在）: $e');
      }
    });
  }
}
