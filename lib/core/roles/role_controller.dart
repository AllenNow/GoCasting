import 'package:drift/drift.dart' show Value;
import 'package:get/get.dart' hide Value;

import '../database/user_db.dart';
import 'role_model.dart';

/// 角色控制器
///
/// 管理当前用户角色，持久化到本地数据库。
/// 角色决定了用户可以看到哪些功能入口。
class RoleController extends GetxController {
  final _currentRole = UserRole.angler.obs;
  final _roleSelected = false.obs;

  UserRole get currentRole => _currentRole.value;
  bool get hasSelectedRole => _roleSelected.value;

  UserDatabase get _db => Get.find<UserDatabase>();

  @override
  void onInit() {
    super.onInit();
    _loadRole();
  }

  /// 启动时加载保存的角色
  Future<void> _loadRole() async {
    final row = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('user_role')))
        .getSingleOrNull();

    if (row != null) {
      _currentRole.value = UserRole.fromId(row.value);
      _roleSelected.value = true;
    }
  }

  /// 设置角色
  Future<void> setRole(UserRole role) async {
    _currentRole.value = role;
    _roleSelected.value = true;

    // 持久化
    final existing = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('user_role')))
        .getSingleOrNull();

    if (existing != null) {
      await (_db.update(_db.userSettings)
            ..where((t) => t.key.equals('user_role')))
          .write(UserSettingsCompanion(value: Value(role.id)));
    } else {
      await _db.into(_db.userSettings).insert(
            UserSettingsCompanion.insert(key: 'user_role', value: role.id),
          );
    }
  }

  /// 检查当前角色是否有某功能权限
  bool hasFeature(AppFeature feature) {
    return RolePermissions.hasFeature(_currentRole.value, feature);
  }

  /// 获取当前角色可见的功能列表
  Set<AppFeature> get availableFeatures {
    return RolePermissions.getFeatures(_currentRole.value);
  }
}
