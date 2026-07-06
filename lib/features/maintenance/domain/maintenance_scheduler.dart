/// 维护调度规则引擎
class MaintenanceScheduler {
  const MaintenanceScheduler();

  /// 获取某装备类型的默认维护规则
  List<MaintenanceRule> getRulesForGearType(String gearType) {
    return switch (gearType.toLowerCase()) {
      'reel' => [
          const MaintenanceRule(
            type: 'full_service',
            label: 'Full Service',
            description: 'Complete disassembly, clean, and re-grease',
            triggerSessions: 15,
            triggerDays: 90,
          ),
          const MaintenanceRule(
            type: 'drag_grease',
            label: 'Drag Grease',
            description: 'Grease drag washers for smooth operation',
            triggerSessions: 10,
            triggerDays: 60,
          ),
        ],
      'rod' => [
          const MaintenanceRule(
            type: 'guide_inspect',
            label: 'Guide Inspection',
            description: 'Check guides for cracks, grooves, and corrosion',
            triggerSessions: 30,
            triggerDays: 180,
          ),
        ],
      'line' => [
          const MaintenanceRule(
            type: 'line_replace',
            label: 'Line Replacement',
            description: 'Replace line due to UV degradation and salt wear',
            triggerSessions: 50,
            triggerDays: 180,
          ),
        ],
      _ => [],
    };
  }

  /// 检查维护状态
  MaintenanceStatus checkStatus({
    required MaintenanceRule rule,
    required int sessionsSinceLast,
    required int daysSinceLast,
  }) {
    final sessionRatio = sessionsSinceLast / rule.triggerSessions;
    final daysRatio = daysSinceLast / rule.triggerDays;
    final maxRatio = sessionRatio > daysRatio ? sessionRatio : daysRatio;

    if (maxRatio >= 1.0) {
      return MaintenanceStatus.overdue;
    } else if (maxRatio >= 0.8) {
      return MaintenanceStatus.dueSoon;
    }
    return MaintenanceStatus.ok;
  }

  /// 生成通知消息
  String generateNotificationMessage({
    required String gearName,
    required MaintenanceRule rule,
    required int sessionsSinceLast,
  }) {
    return 'Your $gearName has $sessionsSinceLast saltwater sessions since last '
        '${rule.label.toLowerCase()} — time to service!';
  }

  /// 默认装备寿命（总 session 数）
  int getDefaultLifespan(String gearType) {
    return switch (gearType.toLowerCase()) {
      'reel' => 300,
      'rod' => 500,
      'line' => 50,
      _ => 200,
    };
  }
}

/// 维护规则
class MaintenanceRule {
  const MaintenanceRule({
    required this.type,
    required this.label,
    required this.description,
    required this.triggerSessions,
    required this.triggerDays,
  });

  final String type;
  final String label;
  final String description;
  final int triggerSessions;
  final int triggerDays;
}

/// 维护状态
enum MaintenanceStatus {
  ok('OK', 'Good condition'),
  dueSoon('Due Soon', 'Maintenance recommended soon'),
  overdue('Overdue', 'Maintenance needed now');

  const MaintenanceStatus(this.label, this.description);
  final String label;
  final String description;
}
