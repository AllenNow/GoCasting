import 'package:flutter/material.dart';

// 出行装载清单生成器
//
// 根据出行场景自动生成打包清单，确保不遗漏关键物品。

/// 清单类别
class ChecklistCategory {
  const ChecklistCategory({required this.name, required this.icon, required this.items});
  final String name;
  final IconData icon;
  final List<ChecklistEntry> items;
}

/// 清单条目
class ChecklistEntry {
  const ChecklistEntry({required this.id, required this.name, this.note});
  final String id;
  final String name;
  final String? note;
}

/// 出行场景
enum TripScenario {
  general('General', '通用远投出行'),
  nightFishing('Night', '夜钓'),
  longDistance('Long Cast', '远距离竞技'),
  sharkFishing('Sharks', '鲨鱼/大鱼'),
  lightTackle('Light Tackle', '轻装/近距离');

  const TripScenario(this.label, this.description);
  final String label;
  final String description;
}

/// 清单生成器
class TripChecklistGenerator {
  const TripChecklistGenerator();

  /// 根据场景生成完整清单
  List<ChecklistCategory> generate({required TripScenario scenario}) {
    final categories = <ChecklistCategory>[
      _rodAndReel(scenario),
      _terminalTackle(scenario),
      _baitAndChum(scenario),
      _accessories(scenario),
      _safety(scenario),
      _personal(scenario),
    ];

    // 场景特定类别
    if (scenario == TripScenario.nightFishing) {
      categories.add(_nightGear());
    }
    if (scenario == TripScenario.sharkFishing) {
      categories.add(_sharkGear());
    }

    return categories;
  }

  ChecklistCategory _rodAndReel(TripScenario scenario) {
    final items = <ChecklistEntry>[
      const ChecklistEntry(id: 'rod_main', name: 'Main rod', note: 'Check guides for cracks before packing'),
      const ChecklistEntry(id: 'reel_main', name: 'Main reel', note: 'Verify drag is loosened for travel'),
      const ChecklistEntry(id: 'rod_spare', name: 'Spare rod (optional)'),
    ];
    if (scenario == TripScenario.longDistance || scenario == TripScenario.sharkFishing) {
      items.add(const ChecklistEntry(id: 'rod_heavy', name: 'Heavy rod (shark/long cast)'));
    }
    items.addAll(const [
      ChecklistEntry(id: 'rod_holder', name: 'Sand spike / rod holder'),
      ChecklistEntry(id: 'rod_tube', name: 'Rod tube / travel case'),
    ]);
    return ChecklistCategory(name: 'Rods & Reels', icon: Icons.straighten, items: items);
  }

  ChecklistCategory _terminalTackle(TripScenario scenario) {
    final items = <ChecklistEntry>[
      const ChecklistEntry(id: 'hooks', name: 'Hooks (circle + bait holder)', note: 'Multiple sizes: 1/0 - 6/0'),
      const ChecklistEntry(id: 'sinkers', name: 'Sinkers (pyramid + backup)', note: '3-6 oz range'),
      const ChecklistEntry(id: 'swivels', name: 'Barrel swivels (#3, #5)'),
      const ChecklistEntry(id: 'leader_material', name: 'Leader material', note: '40-80 lb mono or fluoro'),
      const ChecklistEntry(id: 'shock_leader', name: 'Shock leader spool', note: 'Match sinker weight × 10 rule'),
      const ChecklistEntry(id: 'rigs_premade', name: 'Pre-made rigs (2-3)', note: 'Saves time on the beach'),
      const ChecklistEntry(id: 'snaps_clips', name: 'Snaps and clips'),
      const ChecklistEntry(id: 'beads', name: 'Beads and sleeves'),
    ];
    if (scenario == TripScenario.sharkFishing) {
      items.add(const ChecklistEntry(id: 'wire_leader', name: 'Wire leader (sharks)', note: 'Steel or titanium, 100+ lb'));
    }
    return ChecklistCategory(name: 'Terminal Tackle', icon: Icons.phishing, items: items);
  }

  ChecklistCategory _baitAndChum(TripScenario scenario) {
    return ChecklistCategory(name: 'Bait', icon: Icons.set_meal, items: [
      const ChecklistEntry(id: 'bait_main', name: 'Main bait', note: 'Fresh > frozen when possible'),
      const ChecklistEntry(id: 'bait_backup', name: 'Backup bait (different type)'),
      const ChecklistEntry(id: 'bait_knife', name: 'Bait knife / scissors'),
      const ChecklistEntry(id: 'bait_board', name: 'Cutting board (small)'),
      const ChecklistEntry(id: 'cooler_bait', name: 'Cooler / ice for bait', note: 'Keep bait cold = stays on hook better'),
    ]);
  }

  ChecklistCategory _accessories(TripScenario scenario) {
    return ChecklistCategory(name: 'Accessories', icon: Icons.handyman, items: [
      const ChecklistEntry(id: 'pliers', name: 'Long-nose pliers', note: 'For hook removal'),
      const ChecklistEntry(id: 'line_cutter', name: 'Line cutter / scissors'),
      const ChecklistEntry(id: 'tackle_box', name: 'Tackle box / bag'),
      const ChecklistEntry(id: 'towel', name: 'Rag / towel', note: 'For handling fish and wiping hands'),
      const ChecklistEntry(id: 'bucket', name: 'Bucket', note: 'For bait, catch, or washing hands'),
      const ChecklistEntry(id: 'cart', name: 'Beach cart (if available)'),
      const ChecklistEntry(id: 'measure', name: 'Measuring tape / ruler', note: 'Check legal size limits'),
      const ChecklistEntry(id: 'stringer_bag', name: 'Stringer or fish bag'),
    ]);
  }

  ChecklistCategory _safety(TripScenario scenario) {
    return ChecklistCategory(name: 'Safety & Comfort', icon: Icons.health_and_safety, items: [
      const ChecklistEntry(id: 'sunscreen', name: 'Sunscreen (SPF 50+)', note: 'Reapply every 2 hours'),
      const ChecklistEntry(id: 'hat', name: 'Hat / cap'),
      const ChecklistEntry(id: 'sunglasses', name: 'Polarized sunglasses'),
      const ChecklistEntry(id: 'water', name: 'Water / hydration', note: 'Minimum 1.5L for a half-day session'),
      const ChecklistEntry(id: 'first_aid', name: 'Basic first aid kit', note: 'Band-aids, hook remover, antiseptic'),
      const ChecklistEntry(id: 'phone_bag', name: 'Waterproof phone case'),
    ]);
  }

  ChecklistCategory _personal(TripScenario scenario) {
    return ChecklistCategory(name: 'Personal', icon: Icons.person, items: [
      const ChecklistEntry(id: 'license', name: 'Fishing license', note: 'Check expiry date!'),
      const ChecklistEntry(id: 'waders', name: 'Waders or surf boots (if needed)'),
      const ChecklistEntry(id: 'snacks', name: 'Snacks / food'),
      const ChecklistEntry(id: 'chair', name: 'Beach chair (optional)'),
      const ChecklistEntry(id: 'trash_bag', name: 'Trash bag', note: 'Leave no trace'),
    ]);
  }

  ChecklistCategory _nightGear() {
    return ChecklistCategory(name: 'Night Fishing Gear', icon: Icons.nightlight, items: [
      const ChecklistEntry(id: 'headlamp', name: 'Headlamp (red light mode)', note: 'Red preserves night vision'),
      const ChecklistEntry(id: 'glow_sticks', name: 'Glow sticks / rod tip lights'),
      const ChecklistEntry(id: 'backup_batteries', name: 'Backup batteries'),
      const ChecklistEntry(id: 'reflective', name: 'Reflective gear / visibility'),
      const ChecklistEntry(id: 'warm_layer', name: 'Extra warm layer', note: 'Temperature drops quickly after sunset'),
      const ChecklistEntry(id: 'bell_alarm', name: 'Rod bell / bite alarm'),
    ]);
  }

  ChecklistCategory _sharkGear() {
    return ChecklistCategory(name: 'Shark Specific', icon: Icons.warning_amber, items: [
      const ChecklistEntry(id: 'heavy_leader', name: 'Heavy wire/cable leader (200+ lb)'),
      const ChecklistEntry(id: 'large_hooks', name: 'Large circle hooks (10/0-16/0)'),
      const ChecklistEntry(id: 'dehooker', name: 'Long dehooker tool', note: 'Safety first — keep distance from teeth'),
      const ChecklistEntry(id: 'heavy_rod', name: 'Heavy surf rod (rated 6-12 oz)'),
      const ChecklistEntry(id: 'harness', name: 'Fighting belt / harness (optional)'),
      const ChecklistEntry(id: 'kayak_deploy', name: 'Kayak for bait deployment (if applicable)'),
    ]);
  }
}
