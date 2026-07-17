// 成就/勋章系统
//
// 定义所有成就条件，基于本地数据检查解锁状态。
// 无需后端，全部本地计算。

/// 成就定义
class Achievement {
  const Achievement({
    required this.id,
    required this.title,
    required this.titleZh,
    required this.description,
    required this.descriptionZh,
    required this.emoji,
    required this.category,
    required this.tier,
  });

  final String id;
  final String title;
  final String titleZh;
  final String description;
  final String descriptionZh;
  final String emoji;
  final AchievementCategory category;
  final AchievementTier tier;
}

enum AchievementCategory {
  catch_('渔获', 'Catches'),
  gear('装备', 'Gear'),
  skill('技能', 'Skills'),
  dedication('坚持', 'Dedication'),
  exploration('探索', 'Exploration');

  const AchievementCategory(this.labelZh, this.label);
  final String labelZh;
  final String label;
}

enum AchievementTier {
  bronze('铜', '🥉', 1),
  silver('银', '🥈', 2),
  gold('金', '🥇', 3),
  diamond('钻石', '💎', 4);

  const AchievementTier(this.labelZh, this.emoji, this.value);
  final String labelZh;
  final String emoji;
  final int value;
}

/// 成就解锁状态
class AchievementStatus {
  const AchievementStatus({
    required this.achievement,
    required this.unlocked,
    this.unlockedDate,
    this.progress,
    this.target,
  });

  final Achievement achievement;
  final bool unlocked;
  final String? unlockedDate;
  final int? progress; // 当前进度
  final int? target; // 目标值
  
  double get progressPercent => (target != null && target! > 0) ? (progress ?? 0) / target! : 0;
}

/// 用户统计数据（用于计算成就）
class UserStats {
  const UserStats({
    this.totalCatches = 0,
    this.totalSessions = 0,
    this.totalGear = 0,
    this.totalMaintenanceDone = 0,
    this.heaviestFishLb = 0,
    this.speciesCount = 0,
    this.castBestM = 0,
    this.totalCasts = 0,
    this.daysActive = 0,
    this.consecutiveMaintenance = 0,
    this.locationsVisited = 0,
    this.tutorialsViewed = 0,
  });

  final int totalCatches;
  final int totalSessions;
  final int totalGear;
  final int totalMaintenanceDone;
  final double heaviestFishLb;
  final int speciesCount;
  final double castBestM;
  final int totalCasts;
  final int daysActive;
  final int consecutiveMaintenance;
  final int locationsVisited;
  final int tutorialsViewed;
}

/// 成就引擎
class AchievementEngine {
  const AchievementEngine();

  /// 所有成就定义
  static const achievements = [
    // === 渔获成就 ===
    Achievement(id: 'first_catch', title: 'First Blood', titleZh: '开张大吉', description: 'Log your first catch', descriptionZh: '记录第一条渔获', emoji: '🐟', category: AchievementCategory.catch_, tier: AchievementTier.bronze),
    Achievement(id: 'catch_10', title: 'Getting Started', titleZh: '渐入佳境', description: 'Log 10 catches', descriptionZh: '记录 10 条渔获', emoji: '🎣', category: AchievementCategory.catch_, tier: AchievementTier.bronze),
    Achievement(id: 'catch_50', title: 'Seasoned Angler', titleZh: '经验丰富', description: 'Log 50 catches', descriptionZh: '记录 50 条渔获', emoji: '🏅', category: AchievementCategory.catch_, tier: AchievementTier.silver),
    Achievement(id: 'catch_100', title: 'Century Club', titleZh: '百鱼俱乐部', description: 'Log 100 catches', descriptionZh: '记录 100 条渔获', emoji: '💯', category: AchievementCategory.catch_, tier: AchievementTier.gold),
    Achievement(id: 'big_fish_5', title: 'Big One', titleZh: '大物猎手', description: 'Catch a fish over 5 lb', descriptionZh: '钓到 5 磅以上的鱼', emoji: '🐋', category: AchievementCategory.catch_, tier: AchievementTier.silver),
    Achievement(id: 'big_fish_20', title: 'Monster Hunter', titleZh: '怪物猎人', description: 'Catch a fish over 20 lb', descriptionZh: '钓到 20 磅以上的鱼', emoji: '🦈', category: AchievementCategory.catch_, tier: AchievementTier.gold),
    Achievement(id: 'species_5', title: 'Diverse Portfolio', titleZh: '鱼种多样', description: 'Catch 5 different species', descriptionZh: '钓到 5 种不同的鱼', emoji: '🌈', category: AchievementCategory.catch_, tier: AchievementTier.silver),
    Achievement(id: 'species_10', title: 'Species Collector', titleZh: '物种收集家', description: 'Catch 10 different species', descriptionZh: '钓到 10 种不同的鱼', emoji: '📚', category: AchievementCategory.catch_, tier: AchievementTier.gold),

    // === 装备成就 ===
    Achievement(id: 'first_gear', title: 'Geared Up', titleZh: '装备就绪', description: 'Add your first gear to inventory', descriptionZh: '添加第一件装备', emoji: '🎒', category: AchievementCategory.gear, tier: AchievementTier.bronze),
    Achievement(id: 'gear_10', title: 'Arsenal', titleZh: '军火库', description: 'Own 10+ pieces of gear', descriptionZh: '拥有 10 件以上装备', emoji: '🏭', category: AchievementCategory.gear, tier: AchievementTier.silver),
    Achievement(id: 'maintenance_5', title: 'Care Taker', titleZh: '爱护装备', description: 'Complete 5 maintenance tasks', descriptionZh: '完成 5 次维护', emoji: '🔧', category: AchievementCategory.gear, tier: AchievementTier.bronze),
    Achievement(id: 'maintenance_20', title: 'Maintenance Pro', titleZh: '维护达人', description: 'Complete 20 maintenance tasks', descriptionZh: '完成 20 次维护', emoji: '⚙️', category: AchievementCategory.gear, tier: AchievementTier.silver),
    Achievement(id: 'maintenance_streak', title: 'Never Miss', titleZh: '从不遗漏', description: 'Complete 5 maintenances on time in a row', descriptionZh: '连续 5 次按时完成维护', emoji: '✅', category: AchievementCategory.gear, tier: AchievementTier.gold),

    // === 技能成就 ===
    Achievement(id: 'cast_50m', title: 'Arm Warmed Up', titleZh: '热身完毕', description: 'Cast beyond 50 meters', descriptionZh: '抛投超过 50 米', emoji: '💪', category: AchievementCategory.skill, tier: AchievementTier.bronze),
    Achievement(id: 'cast_100m', title: 'Power Caster', titleZh: '远投高手', description: 'Cast beyond 100 meters', descriptionZh: '抛投超过 100 米', emoji: '🚀', category: AchievementCategory.skill, tier: AchievementTier.silver),
    Achievement(id: 'cast_150m', title: 'Long Bomb', titleZh: '远程打击', description: 'Cast beyond 150 meters', descriptionZh: '抛投超过 150 米', emoji: '🎯', category: AchievementCategory.skill, tier: AchievementTier.gold),
    Achievement(id: 'cast_200', title: 'Cast Master', titleZh: '抛投大师', description: 'Record 200 total casts', descriptionZh: '累计抛投 200 次', emoji: '🏋️', category: AchievementCategory.skill, tier: AchievementTier.silver),
    Achievement(id: 'tutorials_all', title: 'Scholar', titleZh: '学无止境', description: 'View all maintenance tutorials', descriptionZh: '查看所有维护教程', emoji: '🎓', category: AchievementCategory.skill, tier: AchievementTier.silver),

    // === 坚持成就 ===
    Achievement(id: 'sessions_10', title: 'Regular', titleZh: '常客', description: 'Log 10 fishing sessions', descriptionZh: '记录 10 次出行', emoji: '📅', category: AchievementCategory.dedication, tier: AchievementTier.bronze),
    Achievement(id: 'sessions_50', title: 'Dedicated', titleZh: '专注钓手', description: 'Log 50 fishing sessions', descriptionZh: '记录 50 次出行', emoji: '🔥', category: AchievementCategory.dedication, tier: AchievementTier.silver),
    Achievement(id: 'sessions_100', title: 'Obsessed', titleZh: '狂热爱好者', description: 'Log 100 fishing sessions', descriptionZh: '记录 100 次出行', emoji: '⭐', category: AchievementCategory.dedication, tier: AchievementTier.gold),
    Achievement(id: 'days_30', title: 'Month Warrior', titleZh: '月度战士', description: 'Fish on 30 different days', descriptionZh: '在 30 个不同日子出钓', emoji: '🗓️', category: AchievementCategory.dedication, tier: AchievementTier.silver),

    // === 探索成就 ===
    Achievement(id: 'locations_3', title: 'Explorer', titleZh: '探索者', description: 'Fish at 3 different locations', descriptionZh: '在 3 个不同地点钓鱼', emoji: '🗺️', category: AchievementCategory.exploration, tier: AchievementTier.bronze),
    Achievement(id: 'locations_10', title: 'Wanderer', titleZh: '流浪钓手', description: 'Fish at 10 different locations', descriptionZh: '在 10 个不同地点钓鱼', emoji: '🌍', category: AchievementCategory.exploration, tier: AchievementTier.silver),
  ];

  /// 计算所有成就的解锁状态
  List<AchievementStatus> evaluate(UserStats stats) {
    return achievements.map((a) => _check(a, stats)).toList();
  }

  AchievementStatus _check(Achievement a, UserStats stats) {
    final (unlocked, progress, target) = switch (a.id) {
      'first_catch' => (stats.totalCatches >= 1, stats.totalCatches, 1),
      'catch_10' => (stats.totalCatches >= 10, stats.totalCatches, 10),
      'catch_50' => (stats.totalCatches >= 50, stats.totalCatches, 50),
      'catch_100' => (stats.totalCatches >= 100, stats.totalCatches, 100),
      'big_fish_5' => (stats.heaviestFishLb >= 5, stats.heaviestFishLb.toInt(), 5),
      'big_fish_20' => (stats.heaviestFishLb >= 20, stats.heaviestFishLb.toInt(), 20),
      'species_5' => (stats.speciesCount >= 5, stats.speciesCount, 5),
      'species_10' => (stats.speciesCount >= 10, stats.speciesCount, 10),
      'first_gear' => (stats.totalGear >= 1, stats.totalGear, 1),
      'gear_10' => (stats.totalGear >= 10, stats.totalGear, 10),
      'maintenance_5' => (stats.totalMaintenanceDone >= 5, stats.totalMaintenanceDone, 5),
      'maintenance_20' => (stats.totalMaintenanceDone >= 20, stats.totalMaintenanceDone, 20),
      'maintenance_streak' => (stats.consecutiveMaintenance >= 5, stats.consecutiveMaintenance, 5),
      'cast_50m' => (stats.castBestM >= 50, stats.castBestM.toInt(), 50),
      'cast_100m' => (stats.castBestM >= 100, stats.castBestM.toInt(), 100),
      'cast_150m' => (stats.castBestM >= 150, stats.castBestM.toInt(), 150),
      'cast_200' => (stats.totalCasts >= 200, stats.totalCasts, 200),
      'tutorials_all' => (stats.tutorialsViewed >= 6, stats.tutorialsViewed, 6),
      'sessions_10' => (stats.totalSessions >= 10, stats.totalSessions, 10),
      'sessions_50' => (stats.totalSessions >= 50, stats.totalSessions, 50),
      'sessions_100' => (stats.totalSessions >= 100, stats.totalSessions, 100),
      'days_30' => (stats.daysActive >= 30, stats.daysActive, 30),
      'locations_3' => (stats.locationsVisited >= 3, stats.locationsVisited, 3),
      'locations_10' => (stats.locationsVisited >= 10, stats.locationsVisited, 10),
      _ => (false, 0, 1),
    };

    return AchievementStatus(
      achievement: a,
      unlocked: unlocked,
      progress: progress,
      target: target,
    );
  }

  /// 计算总等级分
  int calculateLevel(List<AchievementStatus> statuses) {
    int xp = 0;
    for (final s in statuses) {
      if (s.unlocked) {
        xp += s.achievement.tier.value * 10;
      }
    }
    return xp;
  }

  /// 根据经验值获取等级名称
  String getLevelTitle(int xp) {
    if (xp >= 200) return '传奇钓手';
    if (xp >= 150) return '大师钓手';
    if (xp >= 100) return '专家钓手';
    if (xp >= 60) return '进阶钓手';
    if (xp >= 30) return '业余钓手';
    if (xp >= 10) return '新手钓手';
    return '初出茅庐';
  }
}
