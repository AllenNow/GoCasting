import 'package:get/get.dart';

import '../domain/gear_wizard_state.dart';

/// 装备向导控制器
class GearWizardController extends GetxController {
  final currentStep = 0.obs;
  final selectedSpecies = <String>[].obs;
  final beachCondition = Rxn<BeachCondition>();
  final castingDistance = Rxn<CastingDistance>();
  final budgetRange = Rxn<BudgetRange>();

  bool get isStepValid => switch (currentStep.value) {
        0 => selectedSpecies.isNotEmpty,
        1 => beachCondition.value != null,
        2 => castingDistance.value != null,
        3 => budgetRange.value != null,
        _ => false,
      };

  bool get isComplete =>
      selectedSpecies.isNotEmpty &&
      beachCondition.value != null &&
      castingDistance.value != null &&
      budgetRange.value != null;

  GearWizardState get state => GearWizardState(
        selectedSpecies: selectedSpecies.toList(),
        beachCondition: beachCondition.value,
        castingDistance: castingDistance.value,
        budgetRange: budgetRange.value,
      );

  void toggleSpecies(String species) {
    if (selectedSpecies.contains(species)) {
      selectedSpecies.remove(species);
    } else {
      selectedSpecies.add(species);
    }
  }

  void nextStep() {
    if (currentStep.value < 3) {
      currentStep.value++;
    }
  }

  void prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--;
    }
  }

  void reset() {
    currentStep.value = 0;
    selectedSpecies.clear();
    beachCondition.value = null;
    castingDistance.value = null;
    budgetRange.value = null;
  }
}
