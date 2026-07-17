import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../l10n/l10n.dart';
import 'role_controller.dart';
import 'role_model.dart';

/// 角色选择页面
///
/// 在首次启动（引导完成后）或从设置中切换时显示。
class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key, this.isInitialSetup = false});

  /// 是否是首次设置（首次设置不显示返回按钮）
  final bool isInitialSetup;

  @override
  Widget build(BuildContext context) {
    final roleCtrl = Get.find<RoleController>();

    return Scaffold(
      appBar: isInitialSetup
          ? null
          : AppBar(title: Text(context.tr.switchRole)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isInitialSetup) ...[
                const SizedBox(height: 40),
                Text('你是什么角色？',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('选择最适合你的角色，我们将为你定制功能界面。',
                    style: TextStyle(color: Colors.grey[600], fontSize: 15)),
                const SizedBox(height: 8),
                Text('你可以随时在设置中更改角色。',
                    style: TextStyle(color: Colors.grey[400], fontSize: 13)),
                const SizedBox(height: 32),
              ],
              // 角色列表
              Expanded(
                child: ListView.builder(
                  itemCount: UserRole.values.length,
                  itemBuilder: (ctx, i) {
                    final role = UserRole.values[i];
                    return Obx(() {
                      final isSelected = roleCtrl.currentRole == role;
                      return _RoleCard(
                        role: role,
                        isSelected: isSelected,
                        onTap: () => _selectRole(context, roleCtrl, role),
                      );
                    });
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _selectRole(BuildContext context, RoleController ctrl, UserRole role) async {
    await ctrl.setRole(role);

    if (isInitialSetup) {
      // 首次设置完成，进入主页
      Get.offAllNamed('/');
    } else {
      // 从设置切换，返回
      Get.back();
      Get.snackbar(
        '角色已切换',
        '当前角色：${role.emoji} ${role.label}',
        snackPosition: SnackPosition.BOTTOM,
      );
    }
  }
}

/// 角色卡片
class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.role, required this.isSelected, required this.onTap});
  final UserRole role;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isSelected
            ? BorderSide(color: role.color, width: 2)
            : BorderSide.none,
      ),
      elevation: isSelected ? 4 : 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // 角色图标
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: role.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(role.emoji, style: const TextStyle(fontSize: 28)),
                ),
              ),
              const SizedBox(width: 16),
              // 角色信息
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(role.label,
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: isSelected ? role.color : null)),
                    const SizedBox(height: 4),
                    Text(role.description,
                        style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                  ],
                ),
              ),
              // 选中指示
              if (isSelected)
                Icon(Icons.check_circle, color: role.color, size: 28)
              else
                Icon(Icons.circle_outlined, color: Colors.grey[300], size: 28),
            ],
          ),
        ),
      ),
    );
  }
}
