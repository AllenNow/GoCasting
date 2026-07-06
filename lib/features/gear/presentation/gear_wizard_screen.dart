import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../domain/gear_wizard_state.dart';
import '../providers/gear_wizard_provider.dart';

/// 装备配置向导主页面
class GearWizardScreen extends ConsumerWidget {
  const GearWizardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final step = ref.watch(wizardStepProvider);
    final wizardState = ref.watch(gearWizardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Setup Wizard'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            ref.read(gearWizardProvider.notifier).reset();
            ref.read(wizardStepProvider.notifier).state = 0;
            context.pop();
          },
        ),
      ),
      body: Column(
        children: [
          // 进度指示器
          _WizardProgress(currentStep: step),
          // 步骤内容
          Expanded(
            child: switch (step) {
              0 => const _SpeciesStep(),
              1 => const _BeachConditionStep(),
              2 => const _CastingDistanceStep(),
              3 => const _BudgetStep(),
              _ => const _SpeciesStep(),
            },
          ),
          // 底部按钮
          _WizardNavigation(step: step, state: wizardState),
        ],
      ),
    );
  }
}

/// 进度条
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

/// Step 1: 选择目标鱼种
class _SpeciesStep extends ConsumerWidget {
  const _SpeciesStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(gearWizardProvider).selectedSpecies;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What do you want to catch?',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Select one or more target species',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: kTargetSpecies.map((species) {
                    final isSelected = selected.contains(species);
                    return FilterChip(
                      label: Text(species),
                      selected: isSelected,
                      onSelected: (_) {
                        ref
                            .read(gearWizardProvider.notifier)
                            .toggleSpecies(species);
                      },
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Step 2: 选择海滩条件
class _BeachConditionStep extends ConsumerWidget {
  const _BeachConditionStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(gearWizardProvider).beachCondition;

    return _RadioStepLayout(
      title: 'Where do you fish?',
      subtitle: 'Select your typical beach conditions',
      children: BeachCondition.values.map((condition) {
        return _OptionCard(
          title: condition.label,
          subtitle: condition.description,
          isSelected: selected == condition,
          onTap: () {
            ref
                .read(gearWizardProvider.notifier)
                .setBeachCondition(condition);
          },
        );
      }).toList(),
    );
  }
}

/// Step 3: 选择抛投距离
class _CastingDistanceStep extends ConsumerWidget {
  const _CastingDistanceStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(gearWizardProvider).castingDistance;

    return _RadioStepLayout(
      title: 'How far do you cast?',
      subtitle: 'Select your target casting distance',
      children: CastingDistance.values.map((distance) {
        return _OptionCard(
          title: distance.label,
          subtitle: distance.description,
          isSelected: selected == distance,
          onTap: () {
            ref
                .read(gearWizardProvider.notifier)
                .setCastingDistance(distance);
          },
        );
      }).toList(),
    );
  }
}

/// Step 4: 选择预算
class _BudgetStep extends ConsumerWidget {
  const _BudgetStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(gearWizardProvider).budgetRange;

    return _RadioStepLayout(
      title: 'What\'s your budget?',
      subtitle: 'Select your budget range for the complete setup',
      children: BudgetRange.values.map((budget) {
        return _OptionCard(
          title: budget.label,
          subtitle: budget.description,
          isSelected: selected == budget,
          onTap: () {
            ref.read(gearWizardProvider.notifier).setBudgetRange(budget);
          },
        );
      }).toList(),
    );
  }
}

/// 通用单选步骤布局
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
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView(children: children),
          ),
        ],
      ),
    );
  }
}

/// 选项卡片
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
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        subtitle: Text(subtitle),
        trailing: isSelected
            ? Icon(Icons.check_circle, color: colorScheme.primary)
            : null,
        onTap: onTap,
      ),
    );
  }
}

/// 底部导航按钮
class _WizardNavigation extends ConsumerWidget {
  const _WizardNavigation({required this.step, required this.state});

  final int step;
  final GearWizardState state;

  bool get _canProceed => switch (step) {
        0 => state.selectedSpecies.isNotEmpty,
        1 => state.beachCondition != null,
        2 => state.castingDistance != null,
        3 => state.budgetRange != null,
        _ => false,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          if (step > 0)
            OutlinedButton(
              onPressed: () {
                ref.read(wizardStepProvider.notifier).state = step - 1;
              },
              child: const Text('Back'),
            ),
          const Spacer(),
          FilledButton(
            onPressed: _canProceed
                ? () {
                    if (step < 3) {
                      ref.read(wizardStepProvider.notifier).state = step + 1;
                    } else {
                      // 最后一步 → 跳转到结果页
                      context.push('/gear/wizard/results');
                    }
                  }
                : null,
            child: Text(step < 3 ? 'Next' : 'Get Recommendations'),
          ),
        ],
      ),
    );
  }
}
