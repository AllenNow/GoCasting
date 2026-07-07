import 'package:drift/drift.dart' as drift;
import 'package:get/get.dart';

import '../database/user_db.dart';
import 'units.dart';

/// 设置控制器 — 管理单位系统和引导状态
class SettingsController extends GetxController {
  final unitSystem = UnitSystem.imperial.obs;
  final onboardingComplete = false.obs;

  UserDatabase get _db => Get.find<UserDatabase>();

  @override
  void onInit() {
    super.onInit();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    // 加载单位系统
    final unitRow = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('unit_system')))
        .getSingleOrNull();
    if (unitRow != null) {
      unitSystem.value =
          unitRow.value == 'metric' ? UnitSystem.metric : UnitSystem.imperial;
    }

    // 加载引导状态
    final onboardRow = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('onboarding_complete')))
        .getSingleOrNull();
    if (onboardRow != null) {
      onboardingComplete.value = onboardRow.value == 'true';
    }
  }

  Future<void> setUnitSystem(UnitSystem system) async {
    unitSystem.value = system;
    await (_db.update(_db.userSettings)
          ..where((t) => t.key.equals('unit_system')))
        .write(UserSettingsCompanion(value: drift.Value(system.name)));
  }

  Future<void> toggleUnit() async {
    final newSystem = unitSystem.value == UnitSystem.imperial
        ? UnitSystem.metric
        : UnitSystem.imperial;
    await setUnitSystem(newSystem);
  }

  Future<void> markOnboardingComplete() async {
    onboardingComplete.value = true;
    await (_db.update(_db.userSettings)
          ..where((t) => t.key.equals('onboarding_complete')))
        .write(UserSettingsCompanion(value: drift.Value('true')));
  }
}
