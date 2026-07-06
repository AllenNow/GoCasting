import '../../../core/database/reference_db.dart';
import 'gear_wizard_state.dart';

/// 推荐结果
class GearRecommendation {
  const GearRecommendation({
    required this.rods,
    required this.reels,
    required this.lineType,
    required this.lineWeightLb,
    required this.leaderMaterial,
    required this.leaderWeightLb,
    required this.rigType,
    required this.sinkerType,
    required this.sinkerWeightOz,
    required this.hookStyle,
    required this.hookSize,
    required this.baitOptions,
  });

  final List<Rod> rods; // Top 3
  final List<Reel> reels; // Top 3
  final String lineType; // mono, braid
  final String lineWeightLb; // e.g. "15-30"
  final String leaderMaterial; // fluoro, mono, wire
  final String leaderWeightLb; // e.g. "20-40"
  final String rigType; // fish-finder, hi-lo, carolina
  final String sinkerType; // pyramid, egg, sputnik
  final String sinkerWeightOz; // e.g. "2-4"
  final String hookStyle; // circle, J-hook, kahle
  final String hookSize; // e.g. "2/0 - 5/0"
  final List<String> baitOptions;
}

/// 装备推荐引擎 — 基于规则匹配
class RecommendationEngine {
  const RecommendationEngine();

  /// 根据向导输入生成完整装备推荐
  GearRecommendation recommend({
    required GearWizardState input,
    required List<Rod> allRods,
    required List<Reel> allReels,
  }) {
    // 1. 确定目标参数
    final params = _deriveParams(input);

    // 2. 筛选和排序 Rod
    final filteredRods = _filterRods(allRods, params, input.budgetRange!);
    final topRods = _scoreAndSort(filteredRods, params).take(3).toList();

    // 3. 筛选和排序 Reel（匹配 rod power）
    final filteredReels = _filterReels(allReels, params, input.budgetRange!);
    final topReels = _scoreAndSortReels(filteredReels, params).take(3).toList();

    // 4. 确定终端配件
    final terminal = _deriveTerminal(input, params);

    return GearRecommendation(
      rods: topRods,
      reels: topReels,
      lineType: terminal.lineType,
      lineWeightLb: terminal.lineWeight,
      leaderMaterial: terminal.leaderMaterial,
      leaderWeightLb: terminal.leaderWeight,
      rigType: terminal.rigType,
      sinkerType: terminal.sinkerType,
      sinkerWeightOz: terminal.sinkerWeight,
      hookStyle: terminal.hookStyle,
      hookSize: terminal.hookSize,
      baitOptions: terminal.baitOptions,
    );
  }

  /// 从用户输入推导目标参数
  _TargetParams _deriveParams(GearWizardState input) {
    // 基于鱼种确定 rod power 和 line weight
    final speciesPower = _speciesMaxPower(input.selectedSpecies);
    final speciesLine = _speciesLineRange(input.selectedSpecies);

    // 基于距离确定 rod 长度
    final lengthRange = switch (input.castingDistance!) {
      CastingDistance.short => (min: 8.0, max: 10.0),
      CastingDistance.medium => (min: 9.0, max: 11.0),
      CastingDistance.long => (min: 10.0, max: 14.0),
    };

    // 基于条件确定铅重
    final sinkerWeightRange = switch (input.beachCondition!) {
      BeachCondition.openBeach => (min: 2.0, max: 4.0),
      BeachCondition.jetty => (min: 2.0, max: 5.0),
      BeachCondition.inlet => (min: 3.0, max: 6.0),
      BeachCondition.rockyShore => (min: 2.0, max: 4.0),
    };

    // Reel size 基于 rod power
    final reelSize = switch (speciesPower) {
      'heavy' => (min: 6000, max: 8000),
      'medium-heavy' => (min: 5000, max: 6000),
      'medium' => (min: 4000, max: 5000),
      _ => (min: 4000, max: 6000),
    };

    return _TargetParams(
      rodPower: speciesPower,
      rodLengthMin: lengthRange.min,
      rodLengthMax: lengthRange.max,
      reelSizeMin: reelSize.min,
      reelSizeMax: reelSize.max,
      lineWeightMin: speciesLine.min,
      lineWeightMax: speciesLine.max,
      sinkerWeightMin: sinkerWeightRange.min,
      sinkerWeightMax: sinkerWeightRange.max,
    );
  }

  /// 从鱼种列表推导最大所需 rod power
  String _speciesMaxPower(List<String> species) {
    const heavySpecies = {'Sharks', 'Tarpon', 'Cobia'};
    const medHeavySpecies = {
      'Striped Bass',
      'Redfish (Red Drum)',
      'Black Drum',
      'Snook',
    };

    if (species.any(heavySpecies.contains)) return 'heavy';
    if (species.any(medHeavySpecies.contains)) return 'medium-heavy';
    return 'medium';
  }

  /// 从鱼种推导 line weight 范围
  ({int min, int max}) _speciesLineRange(List<String> species) {
    const heavySpecies = {'Sharks', 'Tarpon', 'Cobia'};
    const medHeavySpecies = {
      'Striped Bass',
      'Redfish (Red Drum)',
      'Black Drum',
      'Snook',
    };

    if (species.any(heavySpecies.contains)) return (min: 30, max: 50);
    if (species.any(medHeavySpecies.contains)) return (min: 15, max: 30);
    return (min: 10, max: 20);
  }

  /// 筛选 rod 候选
  List<Rod> _filterRods(
      List<Rod> rods, _TargetParams params, BudgetRange budget) {
    final priceTier = switch (budget) {
      BudgetRange.entry => 1,
      BudgetRange.mid => 2,
      BudgetRange.premium => 3,
    };

    return rods.where((rod) {
      // 匹配 power
      if (!_powerMatches(rod.power, params.rodPower)) {
        return false;
      }
      // 匹配长度范围
      if (rod.lengthFt < params.rodLengthMin ||
          rod.lengthFt > params.rodLengthMax) {
        return false;
      }
      // 匹配预算
      if (rod.priceTier > priceTier) {
        return false;
      }
      return true;
    }).toList();
  }

  bool _powerMatches(String rodPower, String targetPower) {
    const powerOrder = ['light', 'medium', 'medium-heavy', 'heavy'];
    final rodIdx = powerOrder.indexOf(rodPower);
    final targetIdx = powerOrder.indexOf(targetPower);
    if (rodIdx < 0 || targetIdx < 0) return false;
    // 允许匹配目标 power 或上一级
    return (rodIdx - targetIdx).abs() <= 1 && rodIdx >= targetIdx - 1;
  }

  /// 对 rod 评分排序（corrosion rating 优先）
  List<Rod> _scoreAndSort(List<Rod> rods, _TargetParams params) {
    final scored = rods.map((rod) {
      var score = 0.0;
      score += rod.corrosionRating * 2.0; // 耐腐蚀最重要
      // 长度越接近范围中间越好
      final midLength = (params.rodLengthMin + params.rodLengthMax) / 2;
      score += (5.0 - (rod.lengthFt - midLength).abs());
      return (rod: rod, score: score);
    }).toList();
    scored.sort((a, b) => b.score.compareTo(a.score));
    return scored.map((e) => e.rod).toList();
  }

  /// 筛选 reel 候选
  List<Reel> _filterReels(
      List<Reel> reels, _TargetParams params, BudgetRange budget) {
    final priceTier = switch (budget) {
      BudgetRange.entry => 1,
      BudgetRange.mid => 2,
      BudgetRange.premium => 3,
    };

    return reels.where((reel) {
      if (reel.size < params.reelSizeMin || reel.size > params.reelSizeMax) {
        return false;
      }
      if (reel.priceTier > priceTier) {
        return false;
      }
      return true;
    }).toList();
  }

  /// 对 reel 评分排序
  List<Reel> _scoreAndSortReels(List<Reel> reels, _TargetParams params) {
    final scored = reels.map((reel) {
      var score = 0.0;
      // Sealed > shielded > open
      score += switch (reel.sealType) {
        'sealed' => 10.0,
        'shielded' => 6.0,
        _ => 2.0,
      };
      // 更高 max drag 更好
      score += reel.maxDragLb / 5.0;
      // 更高 line capacity 更好
      score += reel.lineCapacityYds / 100.0;
      return (reel: reel, score: score);
    }).toList();
    scored.sort((a, b) => b.score.compareTo(a.score));
    return scored.map((e) => e.reel).toList();
  }

  /// 推导终端配件推荐
  _TerminalRecommendation _deriveTerminal(
      GearWizardState input, _TargetParams params) {
    // Line type: 远距离用 braid，近距离可 mono
    final lineType = input.castingDistance == CastingDistance.short
        ? 'mono'
        : 'braid';

    // Leader: shark 用 wire，其他用 fluoro
    final hasShark = input.selectedSpecies.contains('Sharks');
    final leaderMaterial = hasShark ? 'wire' : 'fluorocarbon';
    final leaderWeight = hasShark
        ? '60-80'
        : '${params.lineWeightMin + 5}-${params.lineWeightMax + 10}';

    // Rig type 基于条件和鱼种
    final rigType = switch (input.beachCondition!) {
      BeachCondition.inlet => 'fish-finder',
      BeachCondition.jetty => 'carolina',
      _ => input.selectedSpecies.contains('Flounder')
          ? 'fish-finder'
          : 'hi-lo',
    };

    // Sinker type
    final sinkerType = switch (input.beachCondition!) {
      BeachCondition.inlet => 'sputnik',
      BeachCondition.openBeach => 'pyramid',
      BeachCondition.jetty => 'bank',
      BeachCondition.rockyShore => 'egg',
    };

    // Hook
    final hookStyle = hasShark ? 'circle' : 'circle';
    final hookSize = switch (params.rodPower) {
      'heavy' => '5/0 - 8/0',
      'medium-heavy' => '2/0 - 5/0',
      _ => '1/0 - 3/0',
    };

    // Bait — 基于鱼种
    final baitOptions = _deriveBait(input.selectedSpecies);

    return _TerminalRecommendation(
      lineType: lineType,
      lineWeight: '${params.lineWeightMin}-${params.lineWeightMax}',
      leaderMaterial: leaderMaterial,
      leaderWeight: leaderWeight,
      rigType: rigType,
      sinkerType: sinkerType,
      sinkerWeight:
          '${params.sinkerWeightMin.toInt()}-${params.sinkerWeightMax.toInt()}',
      hookStyle: hookStyle,
      hookSize: hookSize,
      baitOptions: baitOptions,
    );
  }

  List<String> _deriveBait(List<String> species) {
    final baits = <String>{};
    for (final s in species) {
      switch (s) {
        case 'Striped Bass':
          baits.addAll(['Clam', 'Bunker chunks', 'Eels', 'Bucktail jigs']);
        case 'Redfish (Red Drum)':
          baits.addAll(['Shrimp', 'Cut mullet', 'Crab', 'Gulp! baits']);
        case 'Bluefish':
          baits.addAll(['Bunker chunks', 'Cut bait', 'Metal lures']);
        case 'Flounder':
          baits.addAll(['Minnows', 'Squid strips', 'Gulp! baits']);
        case 'Sharks':
          baits.addAll(
              ['Fresh bunker', 'Bluefish chunks', 'Stingray', 'Bonito']);
        case 'Pompano':
          baits.addAll(['Sand fleas', 'Shrimp', 'Fishbites']);
        case 'Snook':
          baits.addAll(['Live shrimp', 'Pilchards', 'Swimbaits']);
        case 'Spanish Mackerel':
          baits.addAll(['Gotcha plugs', 'Spoons', 'Live shrimp']);
        default:
          baits.addAll(['Shrimp', 'Cut bait', 'Bloodworms']);
      }
    }
    return baits.toList();
  }
}

class _TargetParams {
  const _TargetParams({
    required this.rodPower,
    required this.rodLengthMin,
    required this.rodLengthMax,
    required this.reelSizeMin,
    required this.reelSizeMax,
    required this.lineWeightMin,
    required this.lineWeightMax,
    required this.sinkerWeightMin,
    required this.sinkerWeightMax,
  });

  final String rodPower;
  final double rodLengthMin;
  final double rodLengthMax;
  final int reelSizeMin;
  final int reelSizeMax;
  final int lineWeightMin;
  final int lineWeightMax;
  final double sinkerWeightMin;
  final double sinkerWeightMax;
}

class _TerminalRecommendation {
  const _TerminalRecommendation({
    required this.lineType,
    required this.lineWeight,
    required this.leaderMaterial,
    required this.leaderWeight,
    required this.rigType,
    required this.sinkerType,
    required this.sinkerWeight,
    required this.hookStyle,
    required this.hookSize,
    required this.baitOptions,
  });

  final String lineType;
  final String lineWeight;
  final String leaderMaterial;
  final String leaderWeight;
  final String rigType;
  final String sinkerType;
  final String sinkerWeight;
  final String hookStyle;
  final String hookSize;
  final List<String> baitOptions;
}
