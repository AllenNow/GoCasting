import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:get/get.dart';

import 'app/routes.dart';
import 'app/theme.dart';
import 'app/bindings.dart';
import 'core/map/amap_service.dart';
import 'core/notifications/notification_service.dart';
import 'core/settings/locale_provider.dart';
import 'l10n/app_localizations.dart';
import 'l10n/l10n.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.instance.initialize();
  await AMapService.instance.initialize();
  runApp(const GoCastingApp());
}

class GoCastingApp extends StatelessWidget {
  const GoCastingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'GoCasting',
      navigatorKey: S.navigatorKey,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system, // 跟随系统暗色模式
      debugShowCheckedModeBanner: false,
      initialRoute: AppRoutes.gear,
      getPages: AppPages.pages,
      initialBinding: InitialBinding(),
      locale: Get.deviceLocale,
      fallbackLocale: const Locale('en'),
      supportedLocales: supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
