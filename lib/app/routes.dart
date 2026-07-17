import 'package:get/get.dart';

import '../features/catch_log/presentation/catch_log_screen.dart';
import '../features/dashboard/presentation/annual_report_screen.dart';
import '../features/dashboard/presentation/challenges_screen.dart';
import '../features/fun/presentation/fun_hub_screen.dart';
import '../features/gear/presentation/calculators_screen.dart';
import '../features/gear/presentation/gear_browse_screen.dart';
import '../features/gear/presentation/gear_compare_screen.dart';
import '../features/gear/presentation/gear_results_screen.dart';
import '../features/gear/presentation/gear_wizard_screen.dart';
import '../features/gear/presentation/knots_rigs_screen.dart';
import '../features/gear/presentation/species_guide_screen.dart';
import '../features/gear/presentation/wishlist_screen.dart';
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
  static const gearCalculators = '/gear/calculators';
  static const gearKnotsRigs = '/gear/knots-rigs';
  static const gearSpeciesGuide = '/gear/species';
  static const gearWishlist = '/gear/wishlist';
  static const catchLog = '/catch-log';
  static const challenges = '/challenges';
  static const annualReport = '/annual-report';
  static const funHub = '/fun';
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
    GetPage(name: AppRoutes.gearCalculators, page: () => const CalculatorsScreen()),
    GetPage(name: AppRoutes.gearKnotsRigs, page: () => const KnotsRigsScreen()),
    GetPage(name: AppRoutes.gearSpeciesGuide, page: () => const SpeciesGuideScreen()),
    GetPage(name: AppRoutes.gearWishlist, page: () => const WishlistScreen()),
    GetPage(name: AppRoutes.catchLog, page: () => const CatchLogScreen()),
    GetPage(name: AppRoutes.challenges, page: () => const ChallengesScreen()),
    GetPage(name: AppRoutes.annualReport, page: () => const AnnualReportScreen()),
    GetPage(name: AppRoutes.funHub, page: () => const FunHubScreen()),
    GetPage(name: AppRoutes.maintenanceAdd, page: () => const AddGearScreen()),
    GetPage(
      name: '${AppRoutes.maintenanceDetail}/:id',
      page: () => GearDetailScreen(
        gearId: int.parse(Get.parameters['id'] ?? '0'),
      ),
    ),
  ];
}
