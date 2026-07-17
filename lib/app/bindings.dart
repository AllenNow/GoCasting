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
    // 数据库 — 同步注册（Drift 内部使用 LazyDatabase，实际打开是延迟的）
    Get.put<ReferenceDatabase>(ReferenceDatabase(), permanent: true);
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
