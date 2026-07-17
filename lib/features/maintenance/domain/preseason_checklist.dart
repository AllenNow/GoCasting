// 季前检查清单生成器
//
// 根据装备类型和存储时长自动生成适当的检查项目。
// 存储时间越长，检查项越多（装备闲置会导致额外问题）。

/// 检查项
class ChecklistItem {
  const ChecklistItem({
    required this.id,
    required this.title,
    required this.description,
    this.priority = CheckPriority.normal,
  });

  final String id;
  final String title;
  final String description;
  final CheckPriority priority;
}

/// 检查优先级
enum CheckPriority {
  critical('关键', '必须完成，否则可能损坏装备'),
  normal('常规', '建议完成以确保最佳性能'),
  optional('可选', '如有时间建议检查');

  const CheckPriority(this.label, this.description);
  final String label;
  final String description;
}

/// 季前检查清单生成器
class PreseasonChecklistGenerator {
  const PreseasonChecklistGenerator();

  /// 根据装备类型和存储天数生成检查清单
  List<ChecklistItem> generate({
    required String gearType,
    required int storageDays,
  }) {
    final items = <ChecklistItem>[];

    // 所有装备通用检查
    items.addAll(_commonChecks(storageDays));

    // 按装备类型添加特定检查
    switch (gearType.toLowerCase()) {
      case 'reel':
        items.addAll(_reelChecks(storageDays));
      case 'rod':
        items.addAll(_rodChecks(storageDays));
      case 'line':
        items.addAll(_lineChecks(storageDays));
      default:
        items.addAll(_genericChecks(storageDays));
    }

    // 长期存储（>90天）额外检查
    if (storageDays > 90) {
      items.addAll(_longStorageChecks(gearType));
    }

    return items;
  }

  /// 通用检查项
  List<ChecklistItem> _commonChecks(int storageDays) {
    return [
      const ChecklistItem(
        id: 'visual_inspect',
        title: '外观检查',
        description: '检查整体外观，寻找裂纹、腐蚀、变色或损坏迹象',
      ),
      const ChecklistItem(
        id: 'clean_surface',
        title: '表面清洁',
        description: '用淡水和软布擦拭所有表面，去除灰尘和残留盐分',
      ),
      if (storageDays > 30)
        const ChecklistItem(
          id: 'check_storage_damage',
          title: '检查存储损伤',
          description: '检查是否有虫蛀、霉变、或因存储环境导致的损坏',
        ),
    ];
  }

  /// 渔轮检查项
  List<ChecklistItem> _reelChecks(int storageDays) {
    return [
      const ChecklistItem(
        id: 'reel_handle_rotation',
        title: '手柄旋转测试',
        description: '缓慢转动手柄，感受是否顺滑。如有粗糙感或卡顿，需要上油或检查轴承',
        priority: CheckPriority.critical,
      ),
      const ChecklistItem(
        id: 'reel_drag_test',
        title: '拖力系统测试',
        description: '拧紧拖力并拉线，确认拖力均匀释放。松开拖力确认可自由出线',
        priority: CheckPriority.critical,
      ),
      const ChecklistItem(
        id: 'reel_bail_spring',
        title: '线架弹簧检查',
        description: '打开和关闭线架多次，确认弹簧动作利落、线架完全到位',
      ),
      const ChecklistItem(
        id: 'reel_line_roller',
        title: '导线轮检查',
        description: '用手指转动导线轮，确认自由转动无卡滞。如不转需要上油',
      ),
      const ChecklistItem(
        id: 'reel_anti_reverse',
        title: '逆止器检查',
        description: '开启逆止开关，确认手柄不能反转。关闭后确认可正常反转',
      ),
      const ChecklistItem(
        id: 'reel_lubricate',
        title: '润滑关键部位',
        description: '在线架枢轴、手柄旋钮和导线轮滴 1-2 滴轮油',
      ),
      if (storageDays > 60)
        const ChecklistItem(
          id: 'reel_grease_gears',
          title: '齿轮上脂',
          description: '存储超过 2 个月建议打开侧盖检查齿轮脂是否干燥，必要时补充',
          priority: CheckPriority.normal,
        ),
    ];
  }

  /// 鱼竿检查项
  List<ChecklistItem> _rodChecks(int storageDays) {
    return [
      const ChecklistItem(
        id: 'rod_guide_check',
        title: '导环完整性检查',
        description: '用棉签穿过每个导环，检查是否有裂纹或毛刺（会切线）',
        priority: CheckPriority.critical,
      ),
      const ChecklistItem(
        id: 'rod_tip_check',
        title: '竿尖检查',
        description: '确认竿尖导环固定牢靠，无松动或歪斜',
        priority: CheckPriority.critical,
      ),
      const ChecklistItem(
        id: 'rod_blank_inspect',
        title: '竿身检查',
        description: '沿竿身目视检查是否有裂纹、划痕或分层。重点检查导环脚附近',
      ),
      const ChecklistItem(
        id: 'rod_reel_seat',
        title: '轮座检查',
        description: '确认轮座锁紧机构正常，能牢固夹持渔轮',
      ),
      const ChecklistItem(
        id: 'rod_cork_grip',
        title: '握把状态检查',
        description: '检查软木握把是否有剥落或裂纹。EVA 握把检查是否有压痕变形',
      ),
      const ChecklistItem(
        id: 'rod_ferrule_check',
        title: '节口检查（多节竿）',
        description: '检查插接口是否磨损、松动。用蜡或专用胶处理松动的节口',
      ),
    ];
  }

  /// 钓线检查项
  List<ChecklistItem> _lineChecks(int storageDays) {
    return [
      const ChecklistItem(
        id: 'line_memory_check',
        title: '线记忆检查',
        description: '放出一段线检查卷曲程度。严重卷曲的尼龙线需要更换',
        priority: CheckPriority.critical,
      ),
      const ChecklistItem(
        id: 'line_abrasion_check',
        title: '磨损检查',
        description: '用手指沿前几米线滑动，感受是否有毛刺或粗糙点',
        priority: CheckPriority.critical,
      ),
      const ChecklistItem(
        id: 'line_color_check',
        title: '褪色检查',
        description: '对比前端和轮中部的线色。严重褪色表明 UV 退化需要更换',
      ),
      if (storageDays > 120)
        const ChecklistItem(
          id: 'line_replace_recommend',
          title: '建议换线',
          description: '存储超过 4 个月的尼龙线可能已显著退化，建议更换新线',
          priority: CheckPriority.normal,
        ),
    ];
  }

  /// 通用装备检查项
  List<ChecklistItem> _genericChecks(int storageDays) {
    return [
      const ChecklistItem(
        id: 'generic_function_test',
        title: '功能测试',
        description: '测试所有活动部件确认正常工作',
      ),
      const ChecklistItem(
        id: 'generic_corrosion_check',
        title: '腐蚀检查',
        description: '检查金属部件是否有锈蚀或盐渍累积',
      ),
    ];
  }

  /// 长期存储额外检查
  List<ChecklistItem> _longStorageChecks(String gearType) {
    final items = <ChecklistItem>[
      const ChecklistItem(
        id: 'long_storage_deep_clean',
        title: '深度清洁',
        description: '长期存储后建议进行完整清洁，去除可能的霉菌和累积污垢',
        priority: CheckPriority.normal,
      ),
    ];

    if (gearType.toLowerCase() == 'reel') {
      items.add(const ChecklistItem(
        id: 'long_storage_bearing_flush',
        title: '轴承冲洗',
        description: '存储超过 3 个月的渔轮建议冲洗轴承并重新上油，旧润滑脂可能已固化',
        priority: CheckPriority.critical,
      ));
    }

    return items;
  }
}
