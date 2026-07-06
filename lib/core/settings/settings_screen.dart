import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'settings_provider.dart';
import 'units.dart';

/// 设置页面
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: const _SettingsBody(),
    );
  }
}

class _SettingsBody extends ConsumerWidget {
  const _SettingsBody();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unitSystem = ref.watch(unitSystemProvider);

    return ListView(
      children: [
        const _SectionHeader(title: 'Units'),
        ListTile(
          leading: const Icon(Icons.straighten),
          title: const Text('Unit System'),
          subtitle: Text(unitSystem.label),
          trailing: SegmentedButton<UnitSystem>(
            segments: const [
              ButtonSegment(
                value: UnitSystem.imperial,
                label: Text('Imperial'),
              ),
              ButtonSegment(
                value: UnitSystem.metric,
                label: Text('Metric'),
              ),
            ],
            selected: {unitSystem},
            onSelectionChanged: (selected) {
              ref
                  .read(unitSystemProvider.notifier)
                  .setSystem(selected.first);
            },
          ),
        ),
        const Divider(),
        const _SectionHeader(title: 'About'),
        const ListTile(
          leading: Icon(Icons.info_outline),
          title: Text('GoCasting'),
          subtitle: Text('v1.0.0 — Surf casting equipment & tide tool'),
        ),
        const ListTile(
          leading: Icon(Icons.wifi_off),
          title: Text('Fully Offline'),
          subtitle: Text('No internet connection required. All data stored locally.'),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              color: Theme.of(context).colorScheme.primary,
            ),
      ),
    );
  }
}
