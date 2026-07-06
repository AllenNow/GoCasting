import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/database_providers.dart';
import '../database/user_db.dart';
import 'units.dart';

/// 单位系统 Provider
final unitSystemProvider =
    StateNotifierProvider<UnitSystemNotifier, UnitSystem>((ref) {
  final db = ref.watch(userDatabaseProvider);
  return UnitSystemNotifier(db);
});

/// 单位系统状态管理
class UnitSystemNotifier extends StateNotifier<UnitSystem> {
  UnitSystemNotifier(this._db) : super(UnitSystem.imperial) {
    _load();
  }

  final UserDatabase _db;

  Future<void> _load() async {
    final row = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('unit_system')))
        .getSingleOrNull();
    if (row != null) {
      state = row.value == 'metric' ? UnitSystem.metric : UnitSystem.imperial;
    }
  }

  Future<void> toggle() async {
    final newSystem =
        state == UnitSystem.imperial ? UnitSystem.metric : UnitSystem.imperial;
    state = newSystem;

    await (_db.update(_db.userSettings)
          ..where((t) => t.key.equals('unit_system')))
        .write(UserSettingsCompanion(value: Value(newSystem.name)));
  }

  Future<void> setSystem(UnitSystem system) async {
    state = system;
    await (_db.update(_db.userSettings)
          ..where((t) => t.key.equals('unit_system')))
        .write(UserSettingsCompanion(value: Value(system.name)));
  }
}

/// 引导页完成状态 Provider
final onboardingCompleteProvider =
    StateNotifierProvider<OnboardingNotifier, bool>((ref) {
  final db = ref.watch(userDatabaseProvider);
  return OnboardingNotifier(db);
});

/// 引导页完成状态管理
class OnboardingNotifier extends StateNotifier<bool> {
  OnboardingNotifier(this._db) : super(false) {
    _load();
  }

  final UserDatabase _db;

  Future<void> _load() async {
    final row = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('onboarding_complete')))
        .getSingleOrNull();
    if (row != null) {
      state = row.value == 'true';
    }
  }

  Future<void> markComplete() async {
    state = true;
    await (_db.update(_db.userSettings)
          ..where((t) => t.key.equals('onboarding_complete')))
        .write(UserSettingsCompanion(value: Value('true')));
  }
}
