import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../core/backup/backup_restore_screen.dart';
import '../../../core/settings/settings_controller.dart';
import '../../../l10n/l10n.dart';
import '../../maintenance/presentation/insurance_report_screen.dart';

/// 装备工具箱首页（新版）
///
/// 功能入口网格，快速进入所有装备相关功能。
class GearHubScreen extends StatelessWidget {
  const GearHubScreen({super.key});

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
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 核心功能
          _SectionLabel(label: context.tr.tabGear == 'Gear' ? 'Core Tools' : '核心工具'),
          const SizedBox(height: 8),
          Row(children: [
            _Tile(emoji: '🧙', label: context.tr.tabGear == 'Gear' ? 'Wizard' : '配置向导', color: Colors.blue, onTap: () => Get.toNamed(AppRoutes.gearWizard)),
            _Tile(emoji: '📦', label: context.tr.tabGear == 'Gear' ? 'Inventory' : '装备库存', color: Colors.green, onTap: () => Get.toNamed(AppRoutes.maintenance)),
            _Tile(emoji: '📊', label: context.tr.tabGear == 'Gear' ? 'Compare' : '浏览对比', color: Colors.orange, onTap: () => Get.toNamed(AppRoutes.gearBrowse)),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _Tile(emoji: '🧮', label: context.tr.tabGear == 'Gear' ? 'Calculators' : '计算器', color: Colors.teal, onTap: () => Get.toNamed(AppRoutes.gearCalculators)),
            _Tile(emoji: '🔗', label: context.tr.tabGear == 'Gear' ? 'Knots & Rigs' : '绳结钓组', color: Colors.purple, onTap: () => Get.toNamed(AppRoutes.gearKnotsRigs)),
            _Tile(emoji: '🐟', label: context.tr.tabGear == 'Gear' ? 'Species' : '鱼种图鉴', color: Colors.indigo, onTap: () => Get.toNamed(AppRoutes.gearSpeciesGuide)),
          ]),
          const SizedBox(height: 20),

          // 管理功能
          _SectionLabel(label: context.tr.tabGear == 'Gear' ? 'Management' : '装备管理'),
          const SizedBox(height: 8),
          Row(children: [
            _Tile(emoji: '💰', label: context.tr.tabGear == 'Gear' ? 'Wishlist' : '愿望单', color: Colors.pink, onTap: () => Get.toNamed(AppRoutes.gearWishlist)),
            _Tile(emoji: '🛡️', label: context.tr.tabGear == 'Gear' ? 'Insurance' : '保险报告', color: Colors.cyan, onTap: () => Get.to(() => const InsuranceReportScreen())),
            _Tile(emoji: '💾', label: context.tr.tabGear == 'Gear' ? 'Backup' : '备份恢复', color: Colors.grey, onTap: () => Get.to(() => const BackupRestoreScreen())),
          ]),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Text(label, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Colors.grey));
}

class _Tile extends StatelessWidget {
  const _Tile({required this.emoji, required this.label, required this.color, required this.onTap});
  final String emoji; final String label; final Color color; final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Card(child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(emoji, style: const TextStyle(fontSize: 26)),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
        ]),
      ),
    )));
  }
}
