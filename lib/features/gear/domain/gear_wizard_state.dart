/// 装备向导的用户输入状态
class GearWizardState {
  const GearWizardState({
    this.selectedSpecies = const [],
    this.beachCondition,
    this.castingDistance,
    this.budgetRange,
  });

  final List<String> selectedSpecies;
  final BeachCondition? beachCondition;
  final CastingDistance? castingDistance;
  final BudgetRange? budgetRange;

  bool get isComplete =>
      selectedSpecies.isNotEmpty &&
      beachCondition != null &&
      castingDistance != null &&
      budgetRange != null;

  GearWizardState copyWith({
    List<String>? selectedSpecies,
    BeachCondition? beachCondition,
    CastingDistance? castingDistance,
    BudgetRange? budgetRange,
  }) {
    return GearWizardState(
      selectedSpecies: selectedSpecies ?? this.selectedSpecies,
      beachCondition: beachCondition ?? this.beachCondition,
      castingDistance: castingDistance ?? this.castingDistance,
      budgetRange: budgetRange ?? this.budgetRange,
    );
  }
}

/// 海滩/岸况类型
enum BeachCondition {
  openBeach('Open Beach', 'Wide sandy beach with gentle slope'),
  jetty('Jetty', 'Fishing from rock jetties or groins'),
  inlet('Inlet', 'Tidal inlets with strong currents'),
  rockyShore('Rocky Shore', 'Rocky coastline with structure');

  const BeachCondition(this.label, this.description);
  final String label;
  final String description;
}

/// 抛投距离目标
enum CastingDistance {
  short('Short (<50m)', 'Close range fishing within the first trough'),
  medium('Medium (50-100m)', 'Past the breakers to the second bar'),
  long('Long (100m+)', 'Maximum distance power casting');

  const CastingDistance(this.label, this.description);
  final String label;
  final String description;
}

/// 预算范围
enum BudgetRange {
  entry('Entry (\$50-150)', 'Budget-friendly starter gear'),
  mid('Mid (\$150-400)', 'Solid performance, good durability'),
  premium('Premium (\$400+)', 'High-end, maximum performance');

  const BudgetRange(this.label, this.description);
  final String label;
  final String description;
}

/// 预置目标鱼种列表
const kTargetSpecies = [
  'Striped Bass',
  'Redfish (Red Drum)',
  'Bluefish',
  'Flounder',
  'Black Drum',
  'Pompano',
  'Snook',
  'Tarpon',
  'Sharks',
  'Cobia',
  'Spotted Seatrout',
  'Croaker',
  'Whiting',
  'Mullet',
  'Spanish Mackerel',
];
