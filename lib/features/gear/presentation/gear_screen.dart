import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../core/settings/settings_controller.dart';
import '../../../l10n/l10n.dart';

/// 装备智能引擎主页面
class GearScreen extends StatelessWidget {
  const GearScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = Get.find<SettingsController>();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!settings.onboardingComplete.value) {
        Get.toNamed(AppRoutes.onboarding);
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.tabGear),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Get.toNamed(AppRoutes.settings),
            tooltip: context.tr.settings,
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.build, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(context.tr.gearIntelligence,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Text(context.tr.gearIntelligenceDesc,
                style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => Get.toNamed(AppRoutes.gearWizard),
              icon: const Icon(Icons.auto_fix_high),
              label: Text(context.tr.configureSetup),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () => Get.toNamed(AppRoutes.gearBrowse),
              icon: const Icon(Icons.list),
              label: Text(context.tr.browseGear),
            ),
          ],
        ),
      ),
    );
  }
}
