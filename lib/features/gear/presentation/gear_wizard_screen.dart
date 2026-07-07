import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../app/routes.dart';
import '../../../l10n/l10n.dart';
import '../domain/gear_wizard_state.dart';
import '../providers/gear_wizard_controller.dart';

/// 装备配置向导主页面
class GearWizardScreen extends StatelessWidget {
  const GearWizardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = Get.put(GearWizardController());

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.setupWizard),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ctrl.reset();
            Get.back();
          },
        ),
      ),
      body: Obx(() => Column(
            children: [
              _WizardProgress(currentStep: ctrl.currentStep.value),
              Expanded(
                child: switch (ctrl.currentStep.value) {
                  0 => _SpeciesStep(ctrl: ctrl),
                  1 => _BeachConditionStep(ctrl: ctrl),
                  2 => _CastingDistanceStep(ctrl: ctrl),
                  3 => _BudgetStep(ctrl: ctrl),
                  _ => _SpeciesStep(ctrl: ctrl),
                },
              ),
              _WizardNavigation(ctrl: ctrl),
            ],
          )),
    );
  }
}

class _WizardProgress extends StatelessWidget {
  const _WizardProgress({required this.currentStep});
  final int currentStep;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        children: List.generate(4, (index) {
          return Expanded(
            child: Container(
              height: 4,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: index <= currentStep
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context).colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _SpeciesStep extends StatelessWidget {
  const _SpeciesStep({required this.ctrl});
  final GearWizardController ctrl;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(context.tr.whatToCatch,
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(context.tr.selectSpecies,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: [
                Obx(() => Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: kTargetSpecies.map((species) {
                        final isSelected =
                            ctrl.selectedSpecies.contains(species);
                        return FilterChip(
                          label: Text(species),
                          selected: isSelected,
                          onSelected: (_) => ctrl.toggleSpecies(species),
                        );
                      }).toList(),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BeachConditionStep extends StatelessWidget {
  const _BeachConditionStep({required this.ctrl});
  final GearWizardController ctrl;

  @override
  Widget build(BuildContext context) {
    return _RadioStepLayout(
      title: context.tr.whereToFish,
      subtitle: context.tr.selectConditions,
      children: BeachCondition.values
          .map((c) => Obx(() => _OptionCard(
                title: c.label,
                subtitle: c.description,
                isSelected: ctrl.beachCondition.value == c,
                onTap: () => ctrl.beachCondition.value = c,
              )))
          .toList(),
    );
  }
}

class _CastingDistanceStep extends StatelessWidget {
  const _CastingDistanceStep({required this.ctrl});
  final GearWizardController ctrl;

  @override
  Widget build(BuildContext context) {
    return _RadioStepLayout(
      title: context.tr.howFarCast,
      subtitle: context.tr.selectDistance,
      children: CastingDistance.values
          .map((d) => Obx(() => _OptionCard(
                title: d.label,
                subtitle: d.description,
                isSelected: ctrl.castingDistance.value == d,
                onTap: () => ctrl.castingDistance.value = d,
              )))
          .toList(),
    );
  }
}

class _BudgetStep extends StatelessWidget {
  const _BudgetStep({required this.ctrl});
  final GearWizardController ctrl;

  @override
  Widget build(BuildContext context) {
    return _RadioStepLayout(
      title: context.tr.whatsYourBudget,
      subtitle: context.tr.selectBudget,
      children: BudgetRange.values
          .map((b) => Obx(() => _OptionCard(
                title: b.label,
                subtitle: b.description,
                isSelected: ctrl.budgetRange.value == b,
                onTap: () => ctrl.budgetRange.value = b,
              )))
          .toList(),
    );
  }
}

class _RadioStepLayout extends StatelessWidget {
  const _RadioStepLayout({
    required this.title,
    required this.subtitle,
    required this.children,
  });
  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(subtitle,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 16),
          Expanded(child: ListView(children: children)),
        ],
      ),
    );
  }
}

class _OptionCard extends StatelessWidget {
  const _OptionCard({
    required this.title,
    required this.subtitle,
    required this.isSelected,
    required this.onTap,
  });
  final String title;
  final String subtitle;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      elevation: isSelected ? 2 : 0,
      color: isSelected
          ? colorScheme.primaryContainer
          : colorScheme.surfaceContainerLow,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(title,
            style: TextStyle(
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal)),
        subtitle: Text(subtitle),
        trailing:
            isSelected ? Icon(Icons.check_circle, color: colorScheme.primary) : null,
        onTap: onTap,
      ),
    );
  }
}

class _WizardNavigation extends StatelessWidget {
  const _WizardNavigation({required this.ctrl});
  final GearWizardController ctrl;

  @override
  Widget build(BuildContext context) {
    return Obx(() => Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              if (ctrl.currentStep.value > 0)
                OutlinedButton(
                  onPressed: ctrl.prevStep,
                  child: Text(context.tr.back),
                ),
              const Spacer(),
              FilledButton(
                onPressed: ctrl.isStepValid
                    ? () {
                        if (ctrl.currentStep.value < 3) {
                          ctrl.nextStep();
                        } else {
                          Get.toNamed(AppRoutes.gearResults);
                        }
                      }
                    : null,
                child: Text(
                    ctrl.currentStep.value < 3 ? 'Next' : 'Get Recommendations'),
              ),
            ],
          ),
        ));
  }
}
