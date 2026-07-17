// 钓组/打结指南数据模型 + 内置内容
//
// 包含远投钓鱼常用绳结和钓组的完整教学内容。
// 全部离线打包，随 App 发布更新。

/// 绳结数据
class FishingKnot {
  const FishingKnot({
    required this.id,
    required this.name,
    required this.category,
    required this.strength,
    required this.difficulty,
    required this.bestFor,
    required this.lineTypes,
    required this.steps,
    this.tips,
  });

  final String id;
  final String name;
  final KnotCategory category;
  final int strength; // 打结强度百分比 (0-100)
  final KnotDifficulty difficulty;
  final String bestFor; // 最佳用途描述
  final List<String> lineTypes; // 适用线类型: mono, braid, fluoro
  final List<KnotStep> steps;
  final String? tips;
}

/// 绳结步骤
class KnotStep {
  const KnotStep({
    required this.stepNumber,
    required this.instruction,
    this.tip,
  });

  final int stepNumber;
  final String instruction;
  final String? tip;
}

/// 绳结类别
enum KnotCategory {
  terminal('Terminal', '连接钩/转环', Icons_hook),
  lineToLine('Line-to-Line', '连接两段线', Icons_link),
  loop('Loop', '打环', Icons_loop),
  shockLeader('Shock Leader', '冲击前导线连接', Icons_shock);

  const KnotCategory(this.label, this.description, this.iconCode);
  final String label;
  final String description;
  final int iconCode;
}

// 图标代码占位
// ignore_for_file: constant_identifier_names
const Icons_hook = 1;
const Icons_link = 2;
const Icons_loop = 3;
const Icons_shock = 4;

/// 绳结难度
enum KnotDifficulty {
  easy('Easy', 1),
  moderate('Moderate', 2),
  advanced('Advanced', 3);

  const KnotDifficulty(this.label, this.stars);
  final String label;
  final int stars;
}

/// 钓组数据
class FishingRig {
  const FishingRig({
    required this.id,
    required this.name,
    required this.description,
    required this.bestFor,
    required this.components,
    required this.assemblySteps,
    required this.targetSpecies,
    this.tips,
  });

  final String id;
  final String name;
  final String description;
  final String bestFor;
  final List<RigComponent> components;
  final List<KnotStep> assemblySteps;
  final List<String> targetSpecies;
  final String? tips;
}

/// 钓组组件
class RigComponent {
  const RigComponent({
    required this.name,
    required this.spec,
    this.quantity = 1,
  });

  final String name;
  final String spec; // 规格说明
  final int quantity;
}

/// 内置绳结库
class KnotLibrary {
  const KnotLibrary();

  List<FishingKnot> getAll() => _knots;
  List<FishingKnot> getByCategory(KnotCategory cat) => _knots.where((k) => k.category == cat).toList();

  static const _knots = [
    // === Terminal Knots（连接钩/转环）===
    FishingKnot(
      id: 'palomar',
      name: 'Palomar Knot',
      category: KnotCategory.terminal,
      strength: 95,
      difficulty: KnotDifficulty.easy,
      bestFor: 'Connecting hooks, swivels, and snaps. The go-to knot for braid.',
      lineTypes: ['braid', 'mono', 'fluoro'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Double about 15cm (6") of line and pass the loop through the hook eye.'),
        KnotStep(stepNumber: 2, instruction: 'Tie a simple overhand knot with the doubled line, leaving the hook hanging below.'),
        KnotStep(stepNumber: 3, instruction: 'Pass the hook through the loop at the end of the doubled line.'),
        KnotStep(stepNumber: 4, instruction: 'Wet the knot and pull both the standing line and tag end to tighten. Trim tag.', tip: 'Ensure the loop passes over the hook eye, not the bend.'),
      ],
      tips: 'Best knot for braid-to-swivel. Nearly full line strength. Requires enough eye size for doubled line.',
    ),
    FishingKnot(
      id: 'snell',
      name: 'Snell Knot',
      category: KnotCategory.terminal,
      strength: 98,
      difficulty: KnotDifficulty.moderate,
      bestFor: 'Strongest hook connection. Forces hook to pull in line with leader for better hooksets.',
      lineTypes: ['mono', 'fluoro'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Thread line through hook eye from the front (point side). Leave 15cm (6") tag.'),
        KnotStep(stepNumber: 2, instruction: 'Form a small loop along the shank. Hold loop against shank with thumb/finger.'),
        KnotStep(stepNumber: 3, instruction: 'Wrap the tag end around the shank AND the standing line 6-8 times, working toward the bend.'),
        KnotStep(stepNumber: 4, instruction: 'Hold wraps in place. Pull the standing line (through the eye) to close the loop tight against the shank.'),
        KnotStep(stepNumber: 5, instruction: 'Wet and pull standing line firmly. Wraps should be neat and tight along shank. Trim tag.', tip: 'More wraps = more strength. 7 wraps is ideal for surf hooks.'),
      ],
      tips: 'The strongest terminal knot. Essential for circle hooks in surf fishing — forces the hook to rotate into the corner of the mouth.',
    ),
    FishingKnot(
      id: 'uni',
      name: 'Uni Knot (Duncan Loop)',
      category: KnotCategory.terminal,
      strength: 90,
      difficulty: KnotDifficulty.easy,
      bestFor: 'Versatile all-purpose knot. Works for hooks, swivels, and can be used for line-to-line.',
      lineTypes: ['mono', 'fluoro', 'braid'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Pass line through eye. Bring tag end back parallel to standing line (15cm / 6" overlap).'),
        KnotStep(stepNumber: 2, instruction: 'Form a loop by bringing tag end back over both lines (makes a "U" shape).'),
        KnotStep(stepNumber: 3, instruction: 'Wrap tag end through the loop and around both lines 5-6 times (4 for braid).'),
        KnotStep(stepNumber: 4, instruction: 'Wet and pull tag end to snug wraps. Then pull standing line to slide knot to eye. Trim.', tip: 'Leave a small gap before the eye for a loop knot version (better lure action).'),
      ],
      tips: 'Easy to tie in wind and dark conditions — great beach knot. Use 6 wraps for mono, 8 for braid.',
    ),

    // === Line-to-Line Knots（连接两段线）===
    FishingKnot(
      id: 'double_uni',
      name: 'Double Uni Knot',
      category: KnotCategory.lineToLine,
      strength: 85,
      difficulty: KnotDifficulty.easy,
      bestFor: 'Connecting main line to leader. Quick and reliable for similar diameter lines.',
      lineTypes: ['mono', 'fluoro', 'braid'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Overlap the two line ends by 20cm (8"). Hold them parallel.'),
        KnotStep(stepNumber: 2, instruction: 'Form a Uni knot with Line A around Line B: loop + 5 wraps through loop. Snug gently.'),
        KnotStep(stepNumber: 3, instruction: 'Repeat: form a Uni knot with Line B around Line A: loop + 5 wraps. Snug gently.'),
        KnotStep(stepNumber: 4, instruction: 'Wet both knots. Pull standing lines in opposite directions to slide knots together. Trim tags.', tip: 'Use 8 wraps when connecting braid to mono/fluoro leader.'),
      ],
      tips: 'The easiest leader knot to tie on the beach. Use more wraps (8) on the braid side, fewer (5) on mono/fluoro side.',
    ),
    FishingKnot(
      id: 'fg_knot',
      name: 'FG Knot',
      category: KnotCategory.shockLeader,
      strength: 98,
      difficulty: KnotDifficulty.advanced,
      bestFor: 'The strongest braid-to-leader connection. Ultra slim profile passes through guides smoothly.',
      lineTypes: ['braid'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Tension the braid (between teeth or on rod tip). Lay leader across braid at 90 degrees.'),
        KnotStep(stepNumber: 2, instruction: 'Alternately wrap braid over and under the leader (like weaving). Do 15-20 wraps each side.'),
        KnotStep(stepNumber: 3, instruction: 'Half-hitch the braid 3 times over the leader to lock the weave. Pull tight after each.'),
        KnotStep(stepNumber: 4, instruction: 'Continue with 5-6 half-hitches over both braid and leader, working away from the connection.'),
        KnotStep(stepNumber: 5, instruction: 'Finish with 2-3 half-hitches over braid only. Trim tag ends close. Burn braid tag carefully.', tip: 'Practice at home first — this knot takes time to learn but is unbeatable once mastered.'),
      ],
      tips: 'The ultimate shock leader knot for surf casting. Near 100% strength and casts through guides like butter. Worth the practice.',
    ),
    FishingKnot(
      id: 'albright',
      name: 'Albright Knot',
      category: KnotCategory.shockLeader,
      strength: 88,
      difficulty: KnotDifficulty.moderate,
      bestFor: 'Connecting lines of very different diameters. Good for heavy mono shock leader to braid.',
      lineTypes: ['mono', 'braid', 'fluoro'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Double the heavier line (shock leader) into a loop about 8cm (3") long.'),
        KnotStep(stepNumber: 2, instruction: 'Thread the lighter line (braid/main) through the loop from the bottom.'),
        KnotStep(stepNumber: 3, instruction: 'Wrap the lighter line around the loop and itself 10-12 times, working toward the loop end.'),
        KnotStep(stepNumber: 4, instruction: 'Pass the lighter line back through the loop (same side it entered).'),
        KnotStep(stepNumber: 5, instruction: 'Wet. Pull the lighter line and the loop simultaneously to tighten. Trim tags.', tip: 'Keep wraps neat and tight against each other for maximum strength.'),
      ],
      tips: 'Easier than FG knot but slightly bulkier. Good choice when you need to tie a shock leader quickly on the beach.',
    ),

    // === Loop Knots ===
    FishingKnot(
      id: 'dropper_loop',
      name: 'Dropper Loop',
      category: KnotCategory.loop,
      strength: 90,
      difficulty: KnotDifficulty.moderate,
      bestFor: 'Creating a loop in the middle of a line for attaching a hook/snood. Essential for hi-lo rigs.',
      lineTypes: ['mono', 'fluoro'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Form a loop of desired size (8-12cm) in the middle of the line.'),
        KnotStep(stepNumber: 2, instruction: 'Twist one side of the loop around the standing line 6-8 times.'),
        KnotStep(stepNumber: 3, instruction: 'Push the center of the original loop through the middle of the twists.'),
        KnotStep(stepNumber: 4, instruction: 'Wet and pull both standing line ends to tighten. The loop pops out perpendicular to the line.', tip: 'Bigger loop = easier to attach clips. 8 twists is ideal for 40-60lb mono.'),
      ],
      tips: 'The building block of the hi-lo rig. Make loops perpendicular to reduce tangles during the cast.',
    ),
    FishingKnot(
      id: 'spider_hitch',
      name: 'Spider Hitch',
      category: KnotCategory.loop,
      strength: 92,
      difficulty: KnotDifficulty.easy,
      bestFor: 'Quick double-line loop. Faster alternative to Bimini Twist for creating a doubled section.',
      lineTypes: ['mono', 'braid'],
      steps: [
        KnotStep(stepNumber: 1, instruction: 'Double the line to desired length (60-90cm for surf casting). Form a small reverse loop near the tag.'),
        KnotStep(stepNumber: 2, instruction: 'Hold the small loop between thumb and forefinger. Wrap the doubled line around your thumb 5 times.'),
        KnotStep(stepNumber: 3, instruction: 'Pass the large loop through the small loop (between thumb and wraps).'),
        KnotStep(stepNumber: 4, instruction: 'Slowly slide wraps off thumb while pulling the large loop and standing line. Wet and tighten.'),
      ],
      tips: 'A 30-second replacement for the Bimini Twist. Creates a doubled section for attaching shock leaders.',
    ),
  ];
}

/// 内置钓组库
class RigLibrary {
  const RigLibrary();

  List<FishingRig> getAll() => _rigs;

  static const _rigs = [
    FishingRig(
      id: 'fish_finder',
      name: 'Fish Finder Rig',
      description: 'The most popular surf rig. Sinker slides freely on main line, allowing fish to take bait without feeling weight.',
      bestFor: 'General purpose surf fishing. Big baits, big fish. Works in all conditions.',
      targetSpecies: ['Striped Bass', 'Red Drum', 'Sharks', 'Black Drum', 'Cobia'],
      components: [
        RigComponent(name: 'Pyramid Sinker', spec: '3-6 oz (match conditions)'),
        RigComponent(name: 'Sinker Slide', spec: 'Plastic or metal slide clip'),
        RigComponent(name: 'Bead', spec: 'Plastic buffer bead'),
        RigComponent(name: 'Barrel Swivel', spec: '#3 or #5 (130-200 lb)'),
        RigComponent(name: 'Leader', spec: '60-80 lb mono/fluoro, 60-120 cm'),
        RigComponent(name: 'Circle Hook', spec: '5/0-8/0 (match bait size)'),
      ],
      assemblySteps: [
        KnotStep(stepNumber: 1, instruction: 'Slide the sinker slide onto main line. Add a plastic bead below it.'),
        KnotStep(stepNumber: 2, instruction: 'Tie a barrel swivel to the end of main line using a Palomar knot. The bead protects the knot from the sinker.'),
        KnotStep(stepNumber: 3, instruction: 'Cut 60-120cm of leader material (60-80 lb mono or fluoro).'),
        KnotStep(stepNumber: 4, instruction: 'Tie one end of leader to the other eye of the swivel (Palomar or Uni knot).'),
        KnotStep(stepNumber: 5, instruction: 'Tie a circle hook to the leader end using a Snell knot for best hookset.'),
        KnotStep(stepNumber: 6, instruction: 'Clip sinker to the slide. Rig complete — sinker slides freely above swivel.'),
      ],
      tips: 'Use longer leader (90-120cm) in clear water. Shorter (45-60cm) in murky water or strong current. The free-sliding sinker means fish feel no resistance when picking up bait.',
    ),
    FishingRig(
      id: 'hi_lo',
      name: 'Hi-Lo Rig (Double Drop)',
      description: 'Two hooks at different heights above the sinker. Doubles your chances and lets you test two baits.',
      bestFor: 'Smaller fish, high-activity conditions, or when testing different baits simultaneously.',
      targetSpecies: ['Whiting', 'Croaker', 'Pompano', 'Flounder', 'Spotted Seatrout'],
      components: [
        RigComponent(name: 'Heavy Mono', spec: '50-80 lb, ~90 cm length'),
        RigComponent(name: 'Hooks', spec: '#1 - #2/0 circle or bait holder', quantity: 2),
        RigComponent(name: 'Snood Line', spec: '30-40 lb mono, 15-20 cm each', quantity: 2),
        RigComponent(name: 'Barrel Swivel', spec: '#5 (top connection)'),
        RigComponent(name: 'Snap Swivel', spec: 'Bottom (for sinker)'),
        RigComponent(name: 'Pyramid Sinker', spec: '2-4 oz'),
      ],
      assemblySteps: [
        KnotStep(stepNumber: 1, instruction: 'Cut 90cm of 50-80lb mono for the main rig body.'),
        KnotStep(stepNumber: 2, instruction: 'Tie a barrel swivel at the top using a Palomar knot (connects to main line).'),
        KnotStep(stepNumber: 3, instruction: 'Tie a dropper loop 20cm above the bottom. Make the loop 8-10cm long.'),
        KnotStep(stepNumber: 4, instruction: 'Tie another dropper loop 25cm above the first one.'),
        KnotStep(stepNumber: 5, instruction: 'Attach a snelled hook to each dropper loop (loop through eye, pass hook through loop, pull tight).'),
        KnotStep(stepNumber: 6, instruction: 'Tie a snap swivel at the bottom end. Clip on a pyramid sinker.'),
      ],
      tips: 'Keep snoods short (15cm) to reduce tangles during casting. Use different baits on each hook to find what fish prefer.',
    ),
    FishingRig(
      id: 'carolina',
      name: 'Carolina Rig (Surf Version)',
      description: 'Egg sinker slides above a swivel-leader-hook setup. Good for dragging bait slowly across the bottom.',
      bestFor: 'Working bait over sandy bottom. Detecting subtle bites from bottom feeders.',
      targetSpecies: ['Flounder', 'Red Drum', 'Black Drum', 'Pompano'],
      components: [
        RigComponent(name: 'Egg Sinker', spec: '1-3 oz (slides on line)'),
        RigComponent(name: 'Bead', spec: 'Glass or plastic clacker bead'),
        RigComponent(name: 'Barrel Swivel', spec: '#5'),
        RigComponent(name: 'Leader', spec: '20-30 lb fluoro, 45-90 cm'),
        RigComponent(name: 'Hook', spec: '#1/0-3/0 circle or kahle'),
      ],
      assemblySteps: [
        KnotStep(stepNumber: 1, instruction: 'Slide egg sinker onto main line, followed by a clacker bead.'),
        KnotStep(stepNumber: 2, instruction: 'Tie main line to barrel swivel (Palomar knot). Bead stops sinker from hitting knot.'),
        KnotStep(stepNumber: 3, instruction: 'Cut 45-90cm of fluorocarbon leader.'),
        KnotStep(stepNumber: 4, instruction: 'Tie leader to other swivel eye. Tie hook to leader end (Snell or Uni knot).'),
        KnotStep(stepNumber: 5, instruction: 'Done! Sinker slides freely, bead makes noise to attract fish, leader floats bait off bottom.'),
      ],
      tips: 'Glass beads click against the swivel and attract curious fish. Use fluoro leader — it sinks and is nearly invisible. Great rig to slowly retrieve when looking for flounder.',
    ),
    FishingRig(
      id: 'pulley',
      name: 'Pulley Rig',
      description: 'Advanced rig where the fish pulls the sinker up during the fight, preventing snags on rocky bottom.',
      bestFor: 'Rocky bottoms, reef edges, and structure. Prevents losing rigs to snags during retrieval.',
      targetSpecies: ['Striped Bass', 'Bluefish', 'Black Drum', 'Sharks'],
      components: [
        RigComponent(name: 'Barrel Swivel', spec: '#3 (main pivot point)'),
        RigComponent(name: 'Leader to Hook', spec: '80-100 lb, ~150 cm'),
        RigComponent(name: 'Leader to Sinker', spec: '60 lb breakaway (lighter than hook leader)'),
        RigComponent(name: 'Bead', spec: 'Impact buffer bead'),
        RigComponent(name: 'Circle Hook', spec: '6/0-10/0'),
        RigComponent(name: 'Breakaway Sinker', spec: '4-6 oz with grip wires'),
      ],
      assemblySteps: [
        KnotStep(stepNumber: 1, instruction: 'Tie main line to one eye of the barrel swivel.'),
        KnotStep(stepNumber: 2, instruction: 'Tie a long hook leader (150cm, 80-100 lb) to the same swivel eye as main line.'),
        KnotStep(stepNumber: 3, instruction: 'Tie a shorter sinker leader (60cm, 60 lb — deliberately weaker) to the other swivel eye.'),
        KnotStep(stepNumber: 4, instruction: 'Attach circle hook to hook leader end. Attach sinker to sinker leader end.'),
        KnotStep(stepNumber: 5, instruction: 'When cast: sinker at bottom, bait above. When fish runs: pulls hook leader through swivel, lifting sinker off bottom.', tip: 'The "pulley" action means the sinker lifts clear of rocks during retrieval.'),
      ],
      tips: 'The sinker leader should be WEAKER than the hook leader. If sinker snags, you lose only the sinker — not the fish or the whole rig. Genius for rocky ground.',
    ),
    FishingRig(
      id: 'fireball',
      name: 'Fireball Rig (Float Rig)',
      description: 'A buoyant float lifts the bait off the bottom. Presents bait at a specific height above the seabed.',
      bestFor: 'Lifting bait above weed, crabs, or presenting in the water column for mid-water feeders.',
      targetSpecies: ['Flounder', 'Bluefish', 'Spotted Seatrout', 'Snook'],
      components: [
        RigComponent(name: 'Rig Body', spec: '60 lb mono, ~90 cm'),
        RigComponent(name: 'Barrel Swivel', spec: '#5 (top)'),
        RigComponent(name: 'Snap Swivel', spec: 'Bottom (sinker)'),
        RigComponent(name: 'Float/Fireball', spec: '15-25mm buoyant bead or cork'),
        RigComponent(name: 'Hook', spec: '#1/0-3/0'),
        RigComponent(name: 'Pyramid Sinker', spec: '2-4 oz'),
      ],
      assemblySteps: [
        KnotStep(stepNumber: 1, instruction: 'Tie barrel swivel to one end of 90cm rig body.'),
        KnotStep(stepNumber: 2, instruction: 'Slide a buoyant float bead onto the rig body.'),
        KnotStep(stepNumber: 3, instruction: 'Tie a dropper loop below the float OR tie the hook directly below the float with a short snood.'),
        KnotStep(stepNumber: 4, instruction: 'Tie snap swivel at the bottom end. Attach sinker.'),
        KnotStep(stepNumber: 5, instruction: 'Adjust float position to set bait height above bottom (15-45cm typical).'),
      ],
      tips: 'Float color matters: yellow/orange in clear water attracts curiosity, white/pearl for dirty water. Keeps bait out of reach of crabs.',
    ),
  ];
}
