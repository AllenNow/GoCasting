import 'package:flutter/material.dart';

/// GoCasting 应用主题 — Material 3, 海洋蓝色系
class AppTheme {
  AppTheme._();

  static const _seedColor = Color(0xFF0077B6); // 海洋蓝

  static final ThemeData light = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _seedColor,
      brightness: Brightness.light,
    ),
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
    ),
    navigationBarTheme: const NavigationBarThemeData(
      elevation: 1,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
    ),
  );

  static final ThemeData dark = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: _seedColor,
      brightness: Brightness.dark,
    ),
    appBarTheme: const AppBarTheme(
      centerTitle: true,
      elevation: 0,
    ),
    navigationBarTheme: const NavigationBarThemeData(
      elevation: 1,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
    ),
  );
}
