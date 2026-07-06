import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/database/database_providers.dart';
import '../domain/recommendation_engine.dart';
import '../providers/gear_wizard_provider.dart';

/// 推荐结果 Provider
final gearRecommendationProvider =
    FutureProvider.autoDispose<GearRecommendation?>((ref) async {
  final wizardState = ref.watch(gearWizardProvider);
  if (!wizardState.isComplete) return null;

  final db = ref.watch(referenceDatabaseProvider);
  final allRods = await db.select(db.rods).get();
  final allReels = await db.select(db.reels).get();

  const engine = RecommendationEngine();
  return engine.recommend(
    input: wizardState,
    allRods: allRods,
    allReels: allReels,
  );
});

/// 装备推荐结果页面
class GearResultsScreen extends ConsumerWidget {
  const GearResultsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recommendationAsync = ref.watch(gearRecommendationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recommendations'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: recommendationAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
        data: (recommendation) {
          if (recommendation == null) {
            return const Center(child: Text('Incomplete wizard data'));
          }
          return _ResultsBody(recommendation: recommendation);
        },
      ),
    );
  }
}

class _ResultsBody extends StatelessWidget {
  const _ResultsBody({required this.recommendation});
  final GearRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Rod 推荐
        _SectionCard(
          icon: Icons.straighten,
          title: 'Rod',
          children: [
            if (recommendation.rods.isEmpty)
              const Text('No matching rods found in database')
            else
              ...recommendation.rods.map((rod) => _GearItem(
                    title: '${rod.brand} ${rod.model}',
                    subtitle:
                        '${rod.lengthFt}ft | ${rod.power} | ${rod.action} | Corrosion: ${rod.corrosionRating}/5',
                  )),
          ],
        ),
        const SizedBox(height: 12),
        // Reel 推荐
        _SectionCard(
          icon: Icons.settings_backup_restore,
          title: 'Reel',
          children: [
            if (recommendation.reels.isEmpty)
              const Text('No matching reels found in database')
            else
              ...recommendation.reels.map((reel) => _GearItem(
                    title: '${reel.brand} ${reel.model}',
                    subtitle:
                        'Size ${reel.size} | ${reel.maxDragLb}lb drag | ${reel.sealType}',
                  )),
          ],
        ),
        const SizedBox(height: 12),
        // Line 推荐
        _SectionCard(
          icon: Icons.linear_scale,
          title: 'Line',
          children: [
            _InfoTile('Type', recommendation.lineType),
            _InfoTile('Weight', '${recommendation.lineWeightLb} lb'),
          ],
        ),
        const SizedBox(height: 12),
        // Leader 推荐
        _SectionCard(
          icon: Icons.link,
          title: 'Leader',
          children: [
            _InfoTile('Material', recommendation.leaderMaterial),
            _InfoTile('Weight', '${recommendation.leaderWeightLb} lb'),
          ],
        ),
        const SizedBox(height: 12),
        // Rig & Terminal
        _SectionCard(
          icon: Icons.anchor,
          title: 'Rig & Terminal',
          children: [
            _InfoTile('Rig Type', recommendation.rigType),
            _InfoTile('Sinker', '${recommendation.sinkerType} (${recommendation.sinkerWeightOz} oz)'),
            _InfoTile('Hook', '${recommendation.hookStyle} ${recommendation.hookSize}'),
          ],
        ),
        const SizedBox(height: 12),
        // Bait 推荐
        _SectionCard(
          icon: Icons.pest_control,
          title: 'Bait Options',
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: recommendation.baitOptions
                  .map((b) => Chip(label: Text(b)))
                  .toList(),
            ),
          ],
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.icon,
    required this.title,
    required this.children,
  });

  final IconData icon;
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _GearItem extends StatelessWidget {
  const _GearItem({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, size: 16, color: Colors.green),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: const TextStyle(color: Colors.grey)),
          ),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
