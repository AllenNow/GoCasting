import 'package:flutter/material.dart';

import 'app_localizations.dart';

/// 简化本地化访问 — 全局使用 S.current.xxx
///
/// 用法:
///   S.current.tabGear          // 在任何地方（需确保 context 可用之后）
///   context.tr.tabGear         // 在 Widget build 方法中
///   S.of(context).tabGear      // 标准写法
class S {
  S._();

  /// 当前活跃的本地化实例（无需 context）
  /// 注意：仅在 MaterialApp 构建后可用
  static AppLocalizations get current {
    // GetX 的 Get.context 在 App 运行后始终可用
    final ctx = _navigatorKey.currentContext;
    assert(ctx != null, 'S.current called before MaterialApp is built');
    return AppLocalizations.of(ctx!);
  }

  /// 通过 context 获取（标准方式）
  static AppLocalizations of(BuildContext context) {
    return AppLocalizations.of(context);
  }

  /// Navigator key — 用于无 context 访问
  static final _navigatorKey = GlobalKey<NavigatorState>();

  static GlobalKey<NavigatorState> get navigatorKey => _navigatorKey;
}

/// BuildContext 扩展 — 最简写法
extension LocalizationExt on BuildContext {
  /// context.tr.tabGear
  AppLocalizations get tr => AppLocalizations.of(this);
}
