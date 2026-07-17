// 维护教程数据模型和内置教程库
// 所有教程内容随 App 打包，完全离线可用。
// 后续通过 App Store 更新增加新教程。

/// 维护教程
class MaintenanceTutorial {
  const MaintenanceTutorial({
    required this.id,
    required this.title,
    required this.gearType,
    required this.category,
    required this.difficulty,
    required this.estimatedMinutes,
    required this.tools,
    required this.steps,
    this.intervalRecommendation,
  });

  final String id;
  final String title;
  final String gearType; // reel, rod, line, general
  final String category; // cleaning, lubrication, inspection, replacement
  final TutorialDifficulty difficulty;
  final int estimatedMinutes;
  final List<String> tools;
  final List<TutorialStep> steps;
  final String? intervalRecommendation;
}

/// 教程步骤
class TutorialStep {
  const TutorialStep({
    required this.stepNumber,
    required this.title,
    required this.description,
    this.tip,
    this.warning,
  });

  final int stepNumber;
  final String title;
  final String description;
  final String? tip;
  final String? warning;
}

/// 难度级别
enum TutorialDifficulty {
  beginner('Beginner', Icons_star_1),
  intermediate('Intermediate', Icons_star_2),
  advanced('Advanced', Icons_star_3);

  const TutorialDifficulty(this.label, this.stars);
  final String label;
  final int stars;
}

// ignore_for_file: constant_identifier_names
const Icons_star_1 = 1;
const Icons_star_2 = 2;
const Icons_star_3 = 3;

/// 内置教程库
class TutorialLibrary {
  const TutorialLibrary();

  /// 获取所有教程
  List<MaintenanceTutorial> getAll() => _tutorials;

  /// 按装备类型筛选
  List<MaintenanceTutorial> getByGearType(String gearType) =>
      _tutorials.where((t) => t.gearType == gearType.toLowerCase()).toList();

  /// 按类别筛选
  List<MaintenanceTutorial> getByCategory(String category) =>
      _tutorials.where((t) => t.category == category).toList();

  /// 按 ID 获取
  MaintenanceTutorial? getById(String id) =>
      _tutorials.where((t) => t.id == id).firstOrNull;

  static const _tutorials = [
    // === 卷线器维护 ===
    MaintenanceTutorial(
      id: 'reel_basic_rinse',
      title: 'Post-Session Saltwater Rinse',
      gearType: 'reel',
      category: 'cleaning',
      difficulty: TutorialDifficulty.beginner,
      estimatedMinutes: 5,
      intervalRecommendation: 'After every saltwater session',
      tools: ['Fresh water hose (mist setting)', 'Soft cloth', 'Reel cover'],
      steps: [
        TutorialStep(
          stepNumber: 1,
          title: 'Loosen drag',
          description: 'Back off the drag knob completely to prevent saltwater from being trapped against the drag washers.',
        ),
        TutorialStep(
          stepNumber: 2,
          title: 'Gentle rinse',
          description: 'Using a gentle mist setting (NEVER high pressure), rinse the entire reel body for 30 seconds. Focus on the bail area, handle knob, and drag knob.',
          warning: 'High pressure water forces salt and debris into bearings and seals.',
        ),
        TutorialStep(
          stepNumber: 3,
          title: 'Air dry',
          description: 'Pat dry with soft cloth and let air dry completely with drag loosened. Store in a ventilated area, not in a sealed bag.',
          tip: 'Standing the rod upright allows water to drain away from the reel body.',
        ),
      ],
    ),
    MaintenanceTutorial(
      id: 'reel_full_service',
      title: 'Full Reel Service (Disassembly)',
      gearType: 'reel',
      category: 'lubrication',
      difficulty: TutorialDifficulty.advanced,
      estimatedMinutes: 45,
      intervalRecommendation: 'Every 15 saltwater sessions or 90 days',
      tools: [
        'Screwdriver set (Phillips + flathead)',
        'Reel grease (Cal\'s or similar)',
        'Reel oil (light viscosity)',
        'Cotton swabs',
        'Clean cloth',
        'Parts tray or egg carton',
        'Tweezers',
      ],
      steps: [
        TutorialStep(
          stepNumber: 1,
          title: 'Remove spool and handle',
          description: 'Remove the drag knob, spool, and handle. Note the order of washers and shims — photograph if needed.',
          tip: 'Use an egg carton to keep parts in removal order.',
        ),
        TutorialStep(
          stepNumber: 2,
          title: 'Remove side plate',
          description: 'Unscrew the body screws and carefully remove the side plate. Do NOT force anything.',
          warning: 'Keep track of every screw — they may be different lengths.',
        ),
        TutorialStep(
          stepNumber: 3,
          title: 'Clean internals',
          description: 'Use cotton swabs with a small amount of reel cleaner to remove old grease from the main gear, pinion gear, and body cavity.',
        ),
        TutorialStep(
          stepNumber: 4,
          title: 'Clean bearings',
          description: 'Remove bearings and soak in bearing cleaner for 5 minutes. Spin to dry. If bearing feels rough, replace it.',
          tip: 'A smooth bearing spins freely for 5+ seconds. Replace anything that feels gritty.',
        ),
        TutorialStep(
          stepNumber: 5,
          title: 'Re-grease gears',
          description: 'Apply a thin coat of reel grease to gear teeth. Use grease (not oil) for gears — it stays put under load.',
        ),
        TutorialStep(
          stepNumber: 6,
          title: 'Oil bearings and shafts',
          description: 'Apply 1-2 drops of reel oil to each bearing and the main shaft. Oil reduces friction on fast-spinning parts.',
        ),
        TutorialStep(
          stepNumber: 7,
          title: 'Reassemble',
          description: 'Reverse the disassembly order. Ensure side plate sits flush before tightening screws. Test handle rotation — should be smooth.',
        ),
      ],
    ),
    MaintenanceTutorial(
      id: 'reel_drag_grease',
      title: 'Drag Washer Greasing',
      gearType: 'reel',
      category: 'lubrication',
      difficulty: TutorialDifficulty.intermediate,
      estimatedMinutes: 15,
      intervalRecommendation: 'Every 10 saltwater sessions or 60 days',
      tools: ['Drag grease (Cal\'s Drag Grease or similar)', 'Cotton swab', 'Clean cloth'],
      steps: [
        TutorialStep(
          stepNumber: 1,
          title: 'Remove spool',
          description: 'Remove drag knob and lift spool off the shaft. Note the washer order.',
        ),
        TutorialStep(
          stepNumber: 2,
          title: 'Inspect washers',
          description: 'Check drag washers for wear, glazing, or damage. Carbon fiber washers should feel smooth; felt washers should be springy.',
          tip: 'Glazed or compressed washers should be replaced, not just re-greased.',
        ),
        TutorialStep(
          stepNumber: 3,
          title: 'Apply grease',
          description: 'Apply a thin, even coat of drag grease to both sides of each washer. Less is more — excess grease causes drag inconsistency.',
          warning: 'NEVER use regular reel grease on drag washers. Use drag-specific grease only.',
        ),
        TutorialStep(
          stepNumber: 4,
          title: 'Reassemble and test',
          description: 'Replace washers in original order, reinstall spool and drag knob. Test drag smoothness by pulling line under tension.',
        ),
      ],
    ),
    // === 鱼竿维护 ===
    MaintenanceTutorial(
      id: 'rod_guide_inspection',
      title: 'Guide Ring Inspection',
      gearType: 'rod',
      category: 'inspection',
      difficulty: TutorialDifficulty.beginner,
      estimatedMinutes: 10,
      intervalRecommendation: 'Every 30 sessions or 6 months',
      tools: ['Cotton ball or Q-tip', 'Flashlight', 'Magnifying glass (optional)'],
      steps: [
        TutorialStep(
          stepNumber: 1,
          title: 'Cotton test',
          description: 'Pull a cotton ball or Q-tip through each guide ring. If cotton snags or tears, the guide has a crack or groove.',
          tip: 'Start from the tip and work down. The tip-top is most vulnerable.',
        ),
        TutorialStep(
          stepNumber: 2,
          title: 'Visual inspection',
          description: 'Use a flashlight to illuminate each guide ring from behind. Look for cracks, chips, or corrosion on the ceramic insert.',
        ),
        TutorialStep(
          stepNumber: 3,
          title: 'Frame check',
          description: 'Check that all guide frames are securely wrapped and the thread wraps show no signs of unwinding or discoloration.',
          warning: 'A cracked guide will shred your line under load. Replace immediately if found.',
        ),
        TutorialStep(
          stepNumber: 4,
          title: 'Alignment',
          description: 'Sight down the rod from butt to tip. All guides should align perfectly. A misaligned guide reduces casting distance.',
        ),
      ],
    ),
    // === 通用 ===
    MaintenanceTutorial(
      id: 'line_replacement',
      title: 'Line Replacement',
      gearType: 'line',
      category: 'replacement',
      difficulty: TutorialDifficulty.beginner,
      estimatedMinutes: 15,
      intervalRecommendation: 'Every 50 sessions or 6 months',
      tools: ['New line (matched to reel capacity)', 'Line clipper', 'Pencil or dowel (for spool tension)'],
      steps: [
        TutorialStep(
          stepNumber: 1,
          title: 'Remove old line',
          description: 'Strip all old line from the reel. Inspect the arbor (spool core) for corrosion while empty.',
          tip: 'Recycle old monofilament at tackle shops that accept it.',
        ),
        TutorialStep(
          stepNumber: 2,
          title: 'Attach new line',
          description: 'Tie new line to the spool arbor using an arbor knot. Ensure the line comes off the supply spool in the same direction the reel winds.',
          warning: 'Winding in the wrong direction causes severe line twist.',
        ),
        TutorialStep(
          stepNumber: 3,
          title: 'Fill under tension',
          description: 'Have someone hold the supply spool on a pencil with light finger tension. Reel on new line until the spool is filled to within 2mm of the lip.',
          tip: 'Under-filling reduces casting distance. Over-filling causes loops and tangles.',
        ),
      ],
    ),
    MaintenanceTutorial(
      id: 'reel_bearing_clean',
      title: 'Bearing Cleaning & Lubrication',
      gearType: 'reel',
      category: 'cleaning',
      difficulty: TutorialDifficulty.intermediate,
      estimatedMinutes: 20,
      intervalRecommendation: 'Every 20 sessions or when roughness is felt',
      tools: ['Bearing cleaner or isopropyl alcohol', 'Small container', 'Reel oil', 'Tweezers', 'Paper towel'],
      steps: [
        TutorialStep(
          stepNumber: 1,
          title: 'Remove bearings',
          description: 'Identify and carefully remove bearings from the reel. Most spinning reels have 4-7 bearings in the handle knob, line roller, and body.',
        ),
        TutorialStep(
          stepNumber: 2,
          title: 'Remove shields (if applicable)',
          description: 'If bearings have removable rubber shields, carefully pop them off with a pin. Metal shields are typically pressed and should not be removed.',
        ),
        TutorialStep(
          stepNumber: 3,
          title: 'Soak and clean',
          description: 'Place bearings in cleaner for 5 minutes. Spin them in the solution to flush out old lubricant and debris.',
        ),
        TutorialStep(
          stepNumber: 4,
          title: 'Dry and oil',
          description: 'Spin bearings dry on paper towel. Apply 1-2 drops of reel oil. Spin to distribute. Replace shields if removed.',
          tip: 'One drop too many is better than one too few for saltwater use.',
        ),
      ],
    ),
  ];
}
