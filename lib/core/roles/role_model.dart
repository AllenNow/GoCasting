import 'package:flutter/material.dart';

// 用户角色系统
//
// 支持 5 种角色，每种角色看到不同的功能入口。
// 数据持久化在 UserSettings 表中（key='user_role'）。

/// 用户角色
enum UserRole {
  angler(
    id: 'angler',
    label: '钓手',
    labelEn: 'Angler',
    description: '个人钓鱼爱好者，使用全部基础功能',
    descriptionEn: 'Individual angler with full access to core tools',
    icon: Icons.phishing,
    color: Colors.blue,
    emoji: '🎣',
  ),
  teamLeader(
    id: 'team_leader',
    label: '队长',
    labelEn: 'Team Leader',
    description: '组织钓友出行，协调行程和位置共享',
    descriptionEn: 'Organize group trips, coordinate schedules and share locations',
    icon: Icons.groups,
    color: Colors.green,
    emoji: '👥',
  ),
  coach(
    id: 'coach',
    label: '教练',
    labelEn: 'Coach',
    description: '指导学员，布置训练任务，追踪进度',
    descriptionEn: 'Guide students, assign training tasks, track progress',
    icon: Icons.school,
    color: Colors.orange,
    emoji: '👨‍🏫',
  ),
  student(
    id: 'student',
    label: '学员',
    labelEn: 'Student',
    description: '跟教练学习，接收任务，记录进步',
    descriptionEn: 'Learn from a coach, receive tasks, track improvement',
    icon: Icons.menu_book,
    color: Colors.purple,
    emoji: '👨‍🎓',
  ),
  shopOwner(
    id: 'shop_owner',
    label: '商家',
    labelEn: 'Shop Owner',
    description: '渔具店经营者，管理客户装备和维护提醒',
    descriptionEn: 'Tackle shop owner, manage customer gear and service reminders',
    icon: Icons.store,
    color: Colors.teal,
    emoji: '🏪',
  );

  const UserRole({
    required this.id,
    required this.label,
    required this.labelEn,
    required this.description,
    required this.descriptionEn,
    required this.icon,
    required this.color,
    required this.emoji,
  });

  final String id;
  final String label; // 中文标签
  final String labelEn; // 英文标签
  final String description; // 中文描述
  final String descriptionEn; // 英文描述
  final IconData icon;
  final Color color;
  final String emoji;

  /// 从 ID 解析
  static UserRole fromId(String id) {
    return UserRole.values.firstWhere(
      (r) => r.id == id,
      orElse: () => UserRole.angler,
    );
  }
}

/// 角色功能权限定义
///
/// 定义每个角色可以看到哪些功能模块
class RolePermissions {
  const RolePermissions._();

  /// 获取角色可见的功能列表
  static Set<AppFeature> getFeatures(UserRole role) {
    return switch (role) {
      UserRole.angler => {
          // 钓手：全部基础功能
          AppFeature.gearWizard,
          AppFeature.gearBrowse,
          AppFeature.gearCompare,
          AppFeature.gearCalculators,
          AppFeature.knotsRigs,
          AppFeature.speciesGuide,
          AppFeature.maintenance,
          AppFeature.catchLog,
          AppFeature.planner,
          AppFeature.goScore,
          AppFeature.weather,
          AppFeature.spotMap,
          AppFeature.nearby,
          AppFeature.tripChecklist,
          AppFeature.castTracker,
          AppFeature.wishlist,
          AppFeature.backup,
          AppFeature.insurance,
        },
      UserRole.teamLeader => {
          // 队长：基础功能 + 队伍管理
          AppFeature.gearWizard,
          AppFeature.gearBrowse,
          AppFeature.gearCalculators,
          AppFeature.knotsRigs,
          AppFeature.speciesGuide,
          AppFeature.maintenance,
          AppFeature.catchLog,
          AppFeature.planner,
          AppFeature.goScore,
          AppFeature.weather,
          AppFeature.spotMap,
          AppFeature.nearby,
          AppFeature.tripChecklist,
          AppFeature.castTracker,
          AppFeature.wishlist,
          AppFeature.backup,
          AppFeature.teamManagement, // 队伍管理（V6）
          AppFeature.locationSharing, // 位置共享（V6）
        },
      UserRole.coach => {
          // 教练：基础功能 + 教学管理
          AppFeature.gearWizard,
          AppFeature.gearBrowse,
          AppFeature.gearCalculators,
          AppFeature.knotsRigs,
          AppFeature.speciesGuide,
          AppFeature.maintenance,
          AppFeature.catchLog,
          AppFeature.planner,
          AppFeature.goScore,
          AppFeature.weather,
          AppFeature.spotMap,
          AppFeature.castTracker,
          AppFeature.backup,
          AppFeature.studentManagement, // 学员管理（V6）
          AppFeature.trainingPlans, // 训练计划（V6）
        },
      UserRole.student => {
          // 学员：精简基础功能 + 学习功能
          AppFeature.gearWizard,
          AppFeature.knotsRigs,
          AppFeature.speciesGuide,
          AppFeature.maintenance,
          AppFeature.catchLog,
          AppFeature.planner,
          AppFeature.goScore,
          AppFeature.weather,
          AppFeature.castTracker,
          AppFeature.backup,
          AppFeature.trainingTasks, // 训练任务（V6）
          AppFeature.progressReport, // 进度报告（V6）
        },
      UserRole.shopOwner => {
          // 商家：装备管理为核心 + 客户管理
          AppFeature.gearBrowse,
          AppFeature.gearCompare,
          AppFeature.maintenance,
          AppFeature.spotMap,
          AppFeature.nearby,
          AppFeature.backup,
          AppFeature.insurance,
          AppFeature.customerManagement, // 客户管理（V6）
          AppFeature.shopPage, // 店铺页面（V6）
        },
    };
  }

  /// 检查角色是否有某个功能的权限
  static bool hasFeature(UserRole role, AppFeature feature) {
    return getFeatures(role).contains(feature);
  }
}

/// 应用功能枚举
enum AppFeature {
  // V1-V4 基础功能
  gearWizard,
  gearBrowse,
  gearCompare,
  gearCalculators,
  knotsRigs,
  speciesGuide,
  maintenance,
  catchLog,
  planner,
  goScore,
  weather,
  spotMap,
  nearby,
  tripChecklist,
  castTracker,
  wishlist,
  backup,
  insurance,

  // V6 角色专属功能（预留）
  teamManagement, // 队长：队伍管理
  locationSharing, // 队长：位置共享
  studentManagement, // 教练：学员管理
  trainingPlans, // 教练：训练计划
  trainingTasks, // 学员：训练任务
  progressReport, // 学员：进度报告
  customerManagement, // 商家：客户管理
  shopPage, // 商家：店铺页面
}
