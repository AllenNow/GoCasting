// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'GoCasting';

  @override
  String get tabGear => 'Gear';

  @override
  String get tabMaintenance => 'Maintenance';

  @override
  String get tabPlanner => 'Planner';

  @override
  String get gearIntelligence => 'Gear Intelligence';

  @override
  String get gearIntelligenceDesc =>
      'Configure your perfect surf casting setup';

  @override
  String get configureSetup => 'Configure Setup';

  @override
  String get browseGear => 'Browse Gear';

  @override
  String get setupWizard => 'Setup Wizard';

  @override
  String get whatToCatch => 'What do you want to catch?';

  @override
  String get selectSpecies => 'Select one or more target species';

  @override
  String get whereToFish => 'Where do you fish?';

  @override
  String get selectConditions => 'Select your typical beach conditions';

  @override
  String get howFarCast => 'How far do you cast?';

  @override
  String get selectDistance => 'Select your target casting distance';

  @override
  String get whatsYourBudget => 'What\'s your budget?';

  @override
  String get selectBudget => 'Select your budget range for the complete setup';

  @override
  String get next => 'Next';

  @override
  String get back => 'Back';

  @override
  String get getRecommendations => 'Get Recommendations';

  @override
  String get recommendations => 'Recommendations';

  @override
  String get maintenanceTracker => 'Maintenance Tracker';

  @override
  String get maintenanceTrackerDesc =>
      'Track gear health and maintenance schedules';

  @override
  String get addGear => 'Add Gear';

  @override
  String get noGearYet => 'No Gear Yet';

  @override
  String get noGearDesc => 'Add your first piece of gear to start tracking';

  @override
  String get gearType => 'Gear Type';

  @override
  String get name => 'Name';

  @override
  String get brand => 'Brand';

  @override
  String get model => 'Model';

  @override
  String get pricePaid => 'Price Paid';

  @override
  String get purchaseDate => 'Purchase Date (optional)';

  @override
  String get saveGear => 'Save Gear';

  @override
  String get logSaltwaterSession => 'Log Saltwater Session';

  @override
  String get markMaintenanceDone => 'Mark Maintenance Done';

  @override
  String get sessionLogged => 'Session logged!';

  @override
  String get maintenanceRecorded => 'Maintenance recorded!';

  @override
  String get details => 'Details';

  @override
  String get lifespan => 'Lifespan';

  @override
  String get maintenanceStatus => 'Maintenance Status';

  @override
  String sessionsUsed(int count) {
    return '$count sessions used';
  }

  @override
  String remaining(int count) {
    return '~$count remaining';
  }

  @override
  String costPerSession(String cost) {
    return 'Cost per session: \$$cost';
  }

  @override
  String get sessionPlanner => 'Session Planner';

  @override
  String get sessionPlannerDesc => 'Tides, moon phases & best fishing windows';

  @override
  String get selectBeach => 'Select Beach';

  @override
  String get selectDate => 'Select Date';

  @override
  String get noBeachSelected => 'Select a Beach';

  @override
  String get noBeachDesc => 'Tap the button below to choose your fishing spot';

  @override
  String get tide => 'Tide';

  @override
  String get sun => 'Sun';

  @override
  String get sunrise => 'Sunrise';

  @override
  String get sunset => 'Sunset';

  @override
  String get solarNoon => 'Noon';

  @override
  String get firstLight => 'First Light';

  @override
  String get lastLight => 'Last Light';

  @override
  String get solunarFeeding => 'Solunar Feeding Periods';

  @override
  String get majorPeriods => 'Major (2h windows)';

  @override
  String get minorPeriods => 'Minor (1h windows)';

  @override
  String get noTideData => 'No tide data for this station';

  @override
  String get settings => 'Settings';

  @override
  String get unitSystem => 'Unit System';

  @override
  String get imperial => 'Imperial';

  @override
  String get metric => 'Metric';

  @override
  String get language => 'Language';

  @override
  String get followSystem => 'Follow System';

  @override
  String get about => 'About';

  @override
  String get fullyOffline => 'Fully Offline';

  @override
  String get fullyOfflineDesc =>
      'No internet connection required. All data stored locally.';

  @override
  String get onboarding1Title => 'Configure Your Perfect Setup';

  @override
  String get onboarding1Desc =>
      'Answer a few questions about your fishing goals and get a complete equipment recommendation — rod, reel, line, and more.';

  @override
  String get onboarding2Title => 'Track Your Gear Health';

  @override
  String get onboarding2Desc =>
      'Log usage sessions, get maintenance reminders, and extend the life of your saltwater equipment.';

  @override
  String get onboarding3Title => 'Plan Your Next Session';

  @override
  String get onboarding3Desc =>
      'Check tides, moon phases, and solunar periods for your favorite beaches — all offline, no internet needed.';

  @override
  String get skip => 'Skip';

  @override
  String get getStarted => 'Get Started';

  @override
  String get exportData => 'Export Data';

  @override
  String get exportToCsv => 'Export to CSV';
}
