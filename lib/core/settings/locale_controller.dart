import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../database/user_db.dart';

/// 语言控制器 — 管理 App 语言实时切换
///
/// 使用 Get.updateLocale() 实现即时刷新，无需重建 widget 树
class LocaleController extends GetxController {
  Locale? _savedLocale; // null = 跟随系统

  Locale? get currentLocale => _savedLocale;

  UserDatabase get _db => Get.find<UserDatabase>();

  @override
  void onInit() {
    super.onInit();
    _loadAndApplyLocale();
  }

  /// 启动时加载保存的语言设置并立即应用
  Future<void> _loadAndApplyLocale() async {
    final row = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('locale')))
        .getSingleOrNull();

    if (row != null && row.value != 'system') {
      _savedLocale = Locale(row.value);
      // 应用保存的语言
      Get.updateLocale(_savedLocale!);
    }
    // 如果是 system 或没有设置，GetMaterialApp 的 locale: Get.deviceLocale 已经生效
  }

  /// 切换语言 — 立即生效
  Future<void> setLocale(Locale? locale) async {
    _savedLocale = locale;

    // 使用 Get.updateLocale() 实时刷新整个 App 的本地化
    if (locale != null) {
      Get.updateLocale(locale);
    } else {
      // 跟随系统
      Get.updateLocale(Get.deviceLocale ?? const Locale('en'));
    }

    // 持久化到数据库
    final value = locale?.languageCode ?? 'system';
    final existing = await (_db.select(_db.userSettings)
          ..where((t) => t.key.equals('locale')))
        .getSingleOrNull();

    if (existing != null) {
      await (_db.update(_db.userSettings)
            ..where((t) => t.key.equals('locale')))
          .write(UserSettingsCompanion(value: drift.Value(value)));
    } else {
      await _db.into(_db.userSettings).insert(
            UserSettingsCompanion.insert(key: 'locale', value: value),
          );
    }
  }
}
