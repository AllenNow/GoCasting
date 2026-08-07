import 'package:get/get.dart';

import '../core/database/reference_db.dart';
import '../core/database/user_db.dart';
import '../core/roles/role_controller.dart';
import '../core/settings/locale_controller.dart';
import '../core/settings/settings_controller.dart';
import '../features/maintenance/data/maintenance_repository.dart';

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

    // 维护仓库
    Get.lazyPut<MaintenanceRepository>(
      () => MaintenanceRepository(Get.find<UserDatabase>()),
    );

    // 设置控制器 — 依赖 UserDatabase
    Get.put(SettingsController(), permanent: true);
    Get.put(LocaleController(), permanent: true);

    // V5: 角色控制器
    Get.put(RoleController(), permanent: true);
  }
}
