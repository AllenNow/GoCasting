import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/backup/backup_restore_screen.dart';
import '../../../core/roles/role_controller.dart';
import '../../../core/roles/role_selection_screen.dart';
import '../../../core/settings/settings_screen.dart';
import '../../achievements/presentation/achievements_screen.dart';
import '../../dashboard/presentation/annual_report_screen.dart';
import '../../dashboard/presentation/challenges_screen.dart';
import '../../fun/presentation/fun_hub_screen.dart';
import '../../maintenance/presentation/insurance_report_screen.dart';

/// 个人中心页面（"我的" Tab）
///
/// 整合了原来散落在设置页的功能入口：
/// 成就、挑战、年报、趣味工坊、备份、保险报告、角色、设置
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final roleCtrl = Get.find<RoleController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Get.to(() => const SettingsScreen()),
          ),
        ],
      ),
      body: ListView(children: [
        // 角色卡片
        Obx(() {
          final role = roleCtrl.currentRole;
          return Card(
            margin: const EdgeInsets.all(16),
            child: InkWell(
              onTap: () => Get.to(() => const RoleSelectionScreen()),
              borderRadius: BorderRadius.circular(12),
              child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
                Container(
                  width: 50, height: 50,
                  decoration: BoxDecoration(color: role.color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Center(child: Text(role.emoji, style: const TextStyle(fontSize: 26))),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(role.label, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Text(role.description, style: TextStyle(fontSize: 12, color: Colors.grey[600]), maxLines: 1, overflow: TextOverflow.ellipsis),
                ])),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ])),
            ),
          );
        }),

        // 成长与成就
        _Section(title: '成长', children: [
          _MenuItem(icon: Icons.emoji_events, color: Colors.amber, title: '成就与等级', onTap: () => Get.to(() => const AchievementsScreen())),
          _MenuItem(icon: Icons.flag, color: Colors.blue, title: '个人挑战', onTap: () => Get.to(() => const ChallengesScreen())),
          _MenuItem(icon: Icons.auto_graph, color: Colors.purple, title: '年度报告', onTap: () => Get.to(() => const AnnualReportScreen())),
        ]),

        // 趣味
        _Section(title: '趣味', children: [
          _MenuItem(icon: Icons.celebration, color: Colors.pink, title: '趣味工坊', subtitle: '运势 / 人格测试 / 热力图', onTap: () => Get.to(() => const FunHubScreen())),
        ]),

        // 数据管理
        _Section(title: '数据', children: [
          _MenuItem(icon: Icons.backup, color: Colors.teal, title: '备份与恢复', onTap: () => Get.to(() => const BackupRestoreScreen())),
          _MenuItem(icon: Icons.shield_outlined, color: Colors.green, title: '保险报告', onTap: () => Get.to(() => const InsuranceReportScreen())),
        ]),

        // 设置
        _Section(title: '系统', children: [
          _MenuItem(icon: Icons.settings, color: Colors.grey, title: '设置', subtitle: '单位 / 语言 / 关于', onTap: () => Get.to(() => const SettingsScreen())),
        ]),

        const SizedBox(height: 32),
      ]),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.children});
  final String title; final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: TextStyle(fontSize: 13, color: Colors.grey[500], fontWeight: FontWeight.w500)),
      const SizedBox(height: 6),
      Card(child: Column(children: children)),
    ]),
  );
}

class _MenuItem extends StatelessWidget {
  const _MenuItem({required this.icon, required this.color, required this.title, this.subtitle, required this.onTap});
  final IconData icon; final Color color; final String title; final String? subtitle; final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Icon(icon, color: color, size: 20),
    ),
    title: Text(title, style: const TextStyle(fontSize: 15)),
    subtitle: subtitle != null ? Text(subtitle!, style: const TextStyle(fontSize: 12)) : null,
    trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
    onTap: onTap,
  );
}
