import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/settings/settings_provider.dart';

/// 装备智能引擎 — 占位页面
class GearScreen extends ConsumerStatefulWidget {
  const GearScreen({super.key});

  @override
  ConsumerState<GearScreen> createState() => _GearScreenState();
}

class _GearScreenState extends ConsumerState<GearScreen> {
  bool _checkedOnboarding = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_checkedOnboarding) {
      _checkedOnboarding = true;
      // 首次启动时检查是否需要引导
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final complete = ref.read(onboardingCompleteProvider);
        if (!complete && mounted) {
          context.push('/onboarding');
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gear'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.build, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'Gear Intelligence',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            const Text(
              'Configure your perfect surf casting setup',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: () => context.push('/gear/wizard'),
              icon: const Icon(Icons.auto_fix_high),
              label: const Text('Configure Setup'),
            ),
          ],
        ),
      ),
    );
  }
}
