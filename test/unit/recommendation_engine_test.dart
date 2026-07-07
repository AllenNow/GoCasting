import 'package:flutter_test/flutter_test.dart';
import 'package:go_casting/core/database/reference_db.dart';
import 'package:go_casting/features/gear/domain/gear_wizard_state.dart';
import 'package:go_casting/features/gear/domain/recommendation_engine.dart';

void main() {
  const engine = RecommendationEngine();

  // 测试数据
  final testRods = [
    Rod(
      id: 1, brand: 'Penn', model: 'Prevail II', lengthFt: 10.0,
      power: 'medium-heavy', action: 'fast', material: 'graphite',
      castWeightMinOz: 1.0, castWeightMaxOz: 4.0, lineRating: '15-30 lb',
      priceTier: 2, corrosionRating: 4,
    ),
    Rod(
      id: 2, brand: 'Shimano', model: 'Tiralejo', lengthFt: 11.0,
      power: 'heavy', action: 'moderate-fast', material: 'graphite',
      castWeightMinOz: 2.0, castWeightMaxOz: 6.0, lineRating: '20-40 lb',
      priceTier: 3, corrosionRating: 5,
    ),
    Rod(
      id: 3, brand: 'Daiwa', model: 'BG Surf', lengthFt: 9.0,
      power: 'medium', action: 'fast', material: 'composite',
      castWeightMinOz: 0.5, castWeightMaxOz: 3.0, lineRating: '10-20 lb',
      priceTier: 1, corrosionRating: 3,
    ),
  ];

  final testReels = [
    Reel(
      id: 1, brand: 'Penn', model: 'Battle III 5000', size: 5000,
      gearRatio: 6.2, maxDragLb: 25.0, lineCapacityYds: 340,
      weightOz: 12.5, sealType: 'sealed', priceTier: 2,
    ),
    Reel(
      id: 2, brand: 'Shimano', model: 'Saragosa 6000', size: 6000,
      gearRatio: 5.7, maxDragLb: 44.0, lineCapacityYds: 440,
      weightOz: 21.0, sealType: 'sealed', priceTier: 3,
    ),
    Reel(
      id: 3, brand: 'Daiwa', model: 'BG 4000', size: 4000,
      gearRatio: 5.7, maxDragLb: 17.6, lineCapacityYds: 240,
      weightOz: 11.4, sealType: 'shielded', priceTier: 1,
    ),
  ];

  group('RecommendationEngine', () {
    test('recommends gear matching species and budget', () {
      final input = GearWizardState(
        selectedSpecies: ['Striped Bass'],
        beachCondition: BeachCondition.openBeach,
        castingDistance: CastingDistance.medium,
        budgetRange: BudgetRange.mid,
      );

      final result = engine.recommend(
        input: input,
        allRods: testRods,
        allReels: testReels,
      );

      // Striped bass = medium-heavy, so should find rod id 1
      expect(result.rods, isNotEmpty);
      // Budget mid = priceTier <= 2
      for (final rod in result.rods) {
        expect(rod.priceTier, lessThanOrEqualTo(2));
      }
    });

    test('recommends braid for medium/long distance', () {
      final input = GearWizardState(
        selectedSpecies: ['Bluefish'],
        beachCondition: BeachCondition.openBeach,
        castingDistance: CastingDistance.long,
        budgetRange: BudgetRange.mid,
      );

      final result = engine.recommend(
        input: input,
        allRods: testRods,
        allReels: testReels,
      );

      expect(result.lineType, 'braid');
    });

    test('recommends mono for short distance', () {
      final input = GearWizardState(
        selectedSpecies: ['Flounder'],
        beachCondition: BeachCondition.openBeach,
        castingDistance: CastingDistance.short,
        budgetRange: BudgetRange.entry,
      );

      final result = engine.recommend(
        input: input,
        allRods: testRods,
        allReels: testReels,
      );

      expect(result.lineType, 'mono');
    });

    test('recommends wire leader for sharks', () {
      final input = GearWizardState(
        selectedSpecies: ['Sharks'],
        beachCondition: BeachCondition.openBeach,
        castingDistance: CastingDistance.long,
        budgetRange: BudgetRange.premium,
      );

      final result = engine.recommend(
        input: input,
        allRods: testRods,
        allReels: testReels,
      );

      expect(result.leaderMaterial, 'wire');
    });

    test('recommends sputnik sinker for inlet conditions', () {
      final input = GearWizardState(
        selectedSpecies: ['Redfish (Red Drum)'],
        beachCondition: BeachCondition.inlet,
        castingDistance: CastingDistance.medium,
        budgetRange: BudgetRange.mid,
      );

      final result = engine.recommend(
        input: input,
        allRods: testRods,
        allReels: testReels,
      );

      expect(result.sinkerType, 'sputnik');
      expect(result.rigType, 'fish-finder');
    });

    test('returns bait options matching species', () {
      final input = GearWizardState(
        selectedSpecies: ['Pompano', 'Whiting'],
        beachCondition: BeachCondition.openBeach,
        castingDistance: CastingDistance.medium,
        budgetRange: BudgetRange.entry,
      );

      final result = engine.recommend(
        input: input,
        allRods: testRods,
        allReels: testReels,
      );

      expect(result.baitOptions, isNotEmpty);
      expect(result.baitOptions, contains('Sand fleas'));
    });

    test('handles empty rod/reel lists gracefully', () {
      final input = GearWizardState(
        selectedSpecies: ['Striped Bass'],
        beachCondition: BeachCondition.openBeach,
        castingDistance: CastingDistance.medium,
        budgetRange: BudgetRange.entry,
      );

      final result = engine.recommend(
        input: input,
        allRods: [],
        allReels: [],
      );

      expect(result.rods, isEmpty);
      expect(result.reels, isEmpty);
      // Terminal tackle still recommended
      expect(result.lineType, isNotEmpty);
      expect(result.rigType, isNotEmpty);
    });
  });
}
