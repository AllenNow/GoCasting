import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../l10n/l10n.dart';
import 'locale_controller.dart';
import 'settings_controller.dart';
import 'units.dart';

/// 设置页面
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.settings)),
      body: const _SettingsBody(),
    );
  }
}

class _SettingsBody extends StatelessWidget {
  const _SettingsBody();

  @override
  Widget build(BuildContext context) {
    final settings = Get.find<SettingsController>();
    final localeCtrl = Get.find<LocaleController>();

    return ListView(
      children: [
        const _SectionHeader(title: 'Units'),
        Obx(() => ListTile(
              leading: const Icon(Icons.straighten),
              title: const Text('Unit System'),
              subtitle: Text(settings.unitSystem.value.label),
              trailing: SegmentedButton<UnitSystem>(
                segments: const [
                  ButtonSegment(value: UnitSystem.imperial, label: Text('Imperial')),
                  ButtonSegment(value: UnitSystem.metric, label: Text('Metric')),
                ],
                selected: {settings.unitSystem.value},
                onSelectionChanged: (s) => settings.setUnitSystem(s.first),
              ),
            )),
        const Divider(),
        const _SectionHeader(title: 'Language'),
        ListTile(
          leading: const Icon(Icons.language),
          title: const Text('Language'),
          subtitle: Text(_localeLabel(localeCtrl.currentLocale)),
          onTap: () => _showLanguagePicker(context, localeCtrl),
        ),
        const Divider(),
        const _SectionHeader(title: 'About'),
        const ListTile(
          leading: Icon(Icons.info_outline),
          title: Text('GoCasting'),
          subtitle: Text('v1.0.0 — Surf casting equipment & tide tool'),
        ),
        const ListTile(
          leading: Icon(Icons.wifi_off),
          title: Text('Fully Offline'),
          subtitle: Text('No internet connection required.'),
        ),
      ],
    );
  }

  String _localeLabel(Locale? locale) {
    if (locale == null) return 'Follow System';
    return switch (locale.languageCode) {
      'en' => 'English',
      'zh' => '中文',
      _ => locale.languageCode,
    };
  }

  void _showLanguagePicker(BuildContext context, LocaleController ctrl) {
    Get.bottomSheet(
      SafeArea(
        child: Container(
          color: Theme.of(context).scaffoldBackgroundColor,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Select Language',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
              ),
              ListTile(
                leading: const Icon(Icons.phone_android),
                title: const Text('Follow System'),
                subtitle: const Text('自动跟随系统语言'),
                trailing: ctrl.currentLocale == null
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  ctrl.setLocale(null);
                  Get.back();
                },
              ),
              ListTile(
                leading: const Text('🇺🇸', style: TextStyle(fontSize: 24)),
                title: const Text('English'),
                trailing: ctrl.currentLocale?.languageCode == 'en'
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  ctrl.setLocale(const Locale('en'));
                  Get.back();
                },
              ),
              ListTile(
                leading: const Text('🇨🇳', style: TextStyle(fontSize: 24)),
                title: const Text('中文'),
                trailing: ctrl.currentLocale?.languageCode == 'zh'
                    ? const Icon(Icons.check, color: Colors.green)
                    : null,
                onTap: () {
                  ctrl.setLocale(const Locale('zh'));
                  Get.back();
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
            ),
      ),
    );
  }
}
