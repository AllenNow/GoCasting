import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../features/achievements/presentation/achievements_screen.dart';
import '../../features/dashboard/presentation/annual_report_screen.dart';
import '../../features/dashboard/presentation/challenges_screen.dart';
import '../../features/maintenance/presentation/insurance_report_screen.dart';
import '../backup/backup_restore_screen.dart';
import '../roles/role_controller.dart';
import '../roles/role_selection_screen.dart';
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
              title: Text(context.tr.unitSystem),
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
        // V5: 角色切换
        const _SectionHeader(title: 'Role'),
        Obx(() {
          final roleCtrl = Get.find<RoleController>();
          final role = roleCtrl.currentRole;
          return ListTile(
            leading: Icon(role.icon, color: role.color),
            title: Text('${role.emoji} ${role.label}'),
            subtitle: Text(role.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Get.to(() => const RoleSelectionScreen()),
          );
        }),
        const Divider(),
        const _SectionHeader(title: 'Language'),
        ListTile(
          leading: const Icon(Icons.language),
          title: Text(context.tr.language),
          subtitle: Text(_localeLabel(context, localeCtrl.currentLocale)),
          onTap: () => _showLanguagePicker(context, localeCtrl),
        ),
        const Divider(),
        const _SectionHeader(title: 'Achievements'),
        ListTile(
          leading: const Icon(Icons.emoji_events, color: Colors.amber),
          title: Text(context.tr.achievementsAndLevel),
          subtitle: Text(context.tr.achievementsDesc),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Get.to(() => const AchievementsScreen()),
        ),
        ListTile(
          leading: const Icon(Icons.flag, color: Colors.blue),
          title: Text(context.tr.challenges),
          subtitle: Text(context.tr.challengesDesc),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Get.to(() => const ChallengesScreen()),
        ),
        ListTile(
          leading: const Icon(Icons.auto_graph, color: Colors.purple),
          title: Text(context.tr.annualReport),
          subtitle: Text(context.tr.annualReportDesc),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Get.to(() => const AnnualReportScreen()),
        ),
        const Divider(),
        const _SectionHeader(title: 'Data & Reports'),
        ListTile(
          leading: const Icon(Icons.backup),
          title: Text(context.tr.backupRestore),
          subtitle: const Text('Export and import your data'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Get.to(() => const BackupRestoreScreen()),
        ),
        ListTile(
          leading: const Icon(Icons.shield_outlined),
          title: Text(context.tr.insuranceReport),
          subtitle: Text(context.tr.insuranceDesc),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Get.to(() => const InsuranceReportScreen()),
        ),
        const Divider(),
        const _SectionHeader(title: 'Fun'),
        ListTile(
          leading: const Icon(Icons.celebration, color: Colors.pink),
          title: Text(context.tr.funHub),
          subtitle: Text(context.tr.funHubDesc),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => Get.toNamed('/fun'),
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

  String _localeLabel(BuildContext context, Locale? locale) {
    if (locale == null) return context.tr.followSystem;
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
                title: Text(context.tr.followSystem),
                subtitle: Text(context.tr.autoFollowSystem),
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
