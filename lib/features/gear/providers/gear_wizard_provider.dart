import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/gear_wizard_state.dart';

/// 装备向导状态 Provider
final gearWizardProvider =
    StateNotifierProvider<GearWizardNotifier, GearWizardState>((ref) {
  return GearWizardNotifier();
});

/// 当前向导步骤 Provider
final wizardStepProvider = StateProvider<int>((ref) => 0);

class GearWizardNotifier extends StateNotifier<GearWizardState> {
  GearWizardNotifier() : super(const GearWizardState());

  void setSpecies(List<String> species) {
    state = state.copyWith(selectedSpecies: species);
  }

  void toggleSpecies(String species) {
    final current = List<String>.from(state.selectedSpecies);
    if (current.contains(species)) {
      current.remove(species);
    } else {
      current.add(species);
    }
    state = state.copyWith(selectedSpecies: current);
  }

  void setBeachCondition(BeachCondition condition) {
    state = state.copyWith(beachCondition: condition);
  }

  void setCastingDistance(CastingDistance distance) {
    state = state.copyWith(castingDistance: distance);
  }

  void setBudgetRange(BudgetRange budget) {
    state = state.copyWith(budgetRange: budget);
  }

  void reset() {
    state = const GearWizardState();
  }
}
