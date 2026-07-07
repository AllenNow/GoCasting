import 'package:get/get.dart';

import '../features/gear/presentation/gear_browse_screen.dart';
import '../features/gear/presentation/gear_compare_screen.dart';
import '../features/gear/presentation/gear_results_screen.dart';
import '../features/gear/presentation/gear_wizard_screen.dart';
import '../features/maintenance/presentation/add_gear_screen.dart';
import '../features/maintenance/presentation/gear_detail_screen.dart';
import '../features/onboarding/onboarding_screen.dart';
import '../core/settings/settings_screen.dart';
import 'home_page.dart';

/// 路由名称常量
abstract class AppRoutes {
  static const gear = '/';
  static const maintenance = '/maintenance';
  static const planner = '/planner';
  static const settings = '/settings';
  static const onboarding = '/onboarding';
  static const gearWizard = '/gear/wizard';
  static const gearResults = '/gear/wizard/results';
  static const gearBrowse = '/gear/browse';
  static const gearCompare = '/gear/compare';
  static const maintenanceAdd = '/maintenance/add';
  static const maintenanceDetail = '/maintenance/detail';
}

/// 路由页面配置
class AppPages {
  static final pages = [
    GetPage(name: AppRoutes.gear, page: () => const HomePage()),
    GetPage(name: AppRoutes.settings, page: () => const SettingsScreen()),
    GetPage(name: AppRoutes.onboarding, page: () => const OnboardingScreen()),
    GetPage(name: AppRoutes.gearWizard, page: () => const GearWizardScreen()),
    GetPage(name: AppRoutes.gearResults, page: () => const GearResultsScreen()),
    GetPage(name: AppRoutes.gearBrowse, page: () => const GearBrowseScreen()),
    GetPage(name: AppRoutes.gearCompare, page: () => const GearCompareScreen()),
    GetPage(name: AppRoutes.maintenanceAdd, page: () => const AddGearScreen()),
    GetPage(
      name: '${AppRoutes.maintenanceDetail}/:id',
      page: () => GearDetailScreen(
        gearId: int.parse(Get.parameters['id'] ?? '0'),
      ),
    ),
  ];
}
