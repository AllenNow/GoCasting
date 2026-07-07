import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:get/get.dart';

import 'app/routes.dart';
import 'app/theme.dart';
import 'app/bindings.dart';
import 'core/settings/locale_provider.dart';
import 'l10n/app_localizations.dart';
import 'l10n/l10n.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
