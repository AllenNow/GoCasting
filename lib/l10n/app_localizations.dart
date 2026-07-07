import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('zh'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'GoCasting'**
  String get appTitle;

  /// No description provided for @tabGear.
  ///
  /// In en, this message translates to:
  /// **'Gear'**
  String get tabGear;

  /// No description provided for @tabMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Maintenance'**
  String get tabMaintenance;

  /// No description provided for @tabPlanner.
  ///
  /// In en, this message translates to:
  /// **'Planner'**
  String get tabPlanner;

  /// No description provided for @gearIntelligence.
  ///
  /// In en, this message translates to:
  /// **'Gear Intelligence'**
  String get gearIntelligence;

  /// No description provided for @gearIntelligenceDesc.
  ///
  /// In en, this message translates to:
  /// **'Configure your perfect surf casting setup'**
  String get gearIntelligenceDesc;

  /// No description provided for @configureSetup.
  ///
  /// In en, this message translates to:
  /// **'Configure Setup'**
  String get configureSetup;

  /// No description provided for @browseGear.
  ///
  /// In en, this message translates to:
  /// **'Browse Gear'**
  String get browseGear;

  /// No description provided for @setupWizard.
  ///
  /// In en, this message translates to:
  /// **'Setup Wizard'**
  String get setupWizard;

  /// No description provided for @whatToCatch.
  ///
  /// In en, this message translates to:
  /// **'What do you want to catch?'**
  String get whatToCatch;

  /// No description provided for @selectSpecies.
  ///
  /// In en, this message translates to:
  /// **'Select one or more target species'**
  String get selectSpecies;

  /// No description provided for @whereToFish.
  ///
  /// In en, this message translates to:
  /// **'Where do you fish?'**
  String get whereToFish;

  /// No description provided for @selectConditions.
  ///
  /// In en, this message translates to:
  /// **'Select your typical beach conditions'**
  String get selectConditions;

  /// No description provided for @howFarCast.
  ///
  /// In en, this message translates to:
  /// **'How far do you cast?'**
  String get howFarCast;

  /// No description provided for @selectDistance.
  ///
  /// In en, this message translates to:
  /// **'Select your target casting distance'**
  String get selectDistance;

  /// No description provided for @whatsYourBudget.
  ///
  /// In en, this message translates to:
  /// **'What\'s your budget?'**
  String get whatsYourBudget;

  /// No description provided for @selectBudget.
  ///
  /// In en, this message translates to:
  /// **'Select your budget range for the complete setup'**
  String get selectBudget;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get next;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @getRecommendations.
  ///
  /// In en, this message translates to:
  /// **'Get Recommendations'**
  String get getRecommendations;

  /// No description provided for @recommendations.
  ///
  /// In en, this message translates to:
  /// **'Recommendations'**
  String get recommendations;

  /// No description provided for @maintenanceTracker.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Tracker'**
  String get maintenanceTracker;

  /// No description provided for @maintenanceTrackerDesc.
  ///
  /// In en, this message translates to:
  /// **'Track gear health and maintenance schedules'**
  String get maintenanceTrackerDesc;

  /// No description provided for @addGear.
  ///
  /// In en, this message translates to:
  /// **'Add Gear'**
  String get addGear;

  /// No description provided for @noGearYet.
  ///
  /// In en, this message translates to:
  /// **'No Gear Yet'**
  String get noGearYet;

  /// No description provided for @noGearDesc.
  ///
  /// In en, this message translates to:
  /// **'Add your first piece of gear to start tracking'**
  String get noGearDesc;

  /// No description provided for @gearType.
  ///
  /// In en, this message translates to:
  /// **'Gear Type'**
  String get gearType;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get name;

  /// No description provided for @brand.
  ///
  /// In en, this message translates to:
  /// **'Brand'**
  String get brand;

  /// No description provided for @model.
  ///
  /// In en, this message translates to:
  /// **'Model'**
  String get model;

  /// No description provided for @pricePaid.
  ///
  /// In en, this message translates to:
  /// **'Price Paid'**
  String get pricePaid;

  /// No description provided for @purchaseDate.
  ///
  /// In en, this message translates to:
  /// **'Purchase Date (optional)'**
  String get purchaseDate;

  /// No description provided for @saveGear.
  ///
  /// In en, this message translates to:
  /// **'Save Gear'**
  String get saveGear;

  /// No description provided for @logSaltwaterSession.
  ///
  /// In en, this message translates to:
  /// **'Log Saltwater Session'**
  String get logSaltwaterSession;

  /// No description provided for @markMaintenanceDone.
  ///
  /// In en, this message translates to:
  /// **'Mark Maintenance Done'**
  String get markMaintenanceDone;

  /// No description provided for @sessionLogged.
  ///
  /// In en, this message translates to:
  /// **'Session logged!'**
  String get sessionLogged;

  /// No description provided for @maintenanceRecorded.
  ///
  /// In en, this message translates to:
  /// **'Maintenance recorded!'**
  String get maintenanceRecorded;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @lifespan.
  ///
  /// In en, this message translates to:
  /// **'Lifespan'**
  String get lifespan;

  /// No description provided for @maintenanceStatus.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Status'**
  String get maintenanceStatus;

  /// No description provided for @sessionsUsed.
  ///
  /// In en, this message translates to:
  /// **'{count} sessions used'**
  String sessionsUsed(int count);

  /// No description provided for @remaining.
  ///
  /// In en, this message translates to:
  /// **'~{count} remaining'**
  String remaining(int count);

  /// No description provided for @costPerSession.
  ///
  /// In en, this message translates to:
  /// **'Cost per session: \${cost}'**
  String costPerSession(String cost);

  /// No description provided for @sessionPlanner.
  ///
  /// In en, this message translates to:
  /// **'Session Planner'**
  String get sessionPlanner;

  /// No description provided for @sessionPlannerDesc.
  ///
  /// In en, this message translates to:
  /// **'Tides, moon phases & best fishing windows'**
  String get sessionPlannerDesc;

  /// No description provided for @selectBeach.
  ///
  /// In en, this message translates to:
  /// **'Select Beach'**
  String get selectBeach;

  /// No description provided for @selectDate.
  ///
  /// In en, this message translates to:
  /// **'Select Date'**
  String get selectDate;

  /// No description provided for @noBeachSelected.
  ///
  /// In en, this message translates to:
  /// **'Select a Beach'**
  String get noBeachSelected;

  /// No description provided for @noBeachDesc.
  ///
  /// In en, this message translates to:
  /// **'Tap the button below to choose your fishing spot'**
  String get noBeachDesc;

  /// No description provided for @tide.
  ///
  /// In en, this message translates to:
  /// **'Tide'**
  String get tide;

  /// No description provided for @sun.
  ///
  /// In en, this message translates to:
  /// **'Sun'**
  String get sun;

  /// No description provided for @sunrise.
  ///
  /// In en, this message translates to:
  /// **'Sunrise'**
  String get sunrise;

  /// No description provided for @sunset.
  ///
  /// In en, this message translates to:
  /// **'Sunset'**
  String get sunset;

  /// No description provided for @solarNoon.
  ///
  /// In en, this message translates to:
  /// **'Noon'**
  String get solarNoon;

  /// No description provided for @firstLight.
  ///
  /// In en, this message translates to:
  /// **'First Light'**
  String get firstLight;

  /// No description provided for @lastLight.
  ///
  /// In en, this message translates to:
  /// **'Last Light'**
  String get lastLight;

  /// No description provided for @solunarFeeding.
  ///
  /// In en, this message translates to:
  /// **'Solunar Feeding Periods'**
  String get solunarFeeding;

  /// No description provided for @majorPeriods.
  ///
  /// In en, this message translates to:
  /// **'Major (2h windows)'**
  String get majorPeriods;

  /// No description provided for @minorPeriods.
  ///
  /// In en, this message translates to:
  /// **'Minor (1h windows)'**
  String get minorPeriods;

  /// No description provided for @noTideData.
  ///
  /// In en, this message translates to:
  /// **'No tide data for this station'**
  String get noTideData;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @unitSystem.
  ///
  /// In en, this message translates to:
  /// **'Unit System'**
  String get unitSystem;

  /// No description provided for @imperial.
  ///
  /// In en, this message translates to:
  /// **'Imperial'**
  String get imperial;

  /// No description provided for @metric.
  ///
  /// In en, this message translates to:
  /// **'Metric'**
  String get metric;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @followSystem.
  ///
  /// In en, this message translates to:
  /// **'Follow System'**
  String get followSystem;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @fullyOffline.
  ///
  /// In en, this message translates to:
  /// **'Fully Offline'**
  String get fullyOffline;

  /// No description provided for @fullyOfflineDesc.
  ///
  /// In en, this message translates to:
  /// **'No internet connection required. All data stored locally.'**
  String get fullyOfflineDesc;

  /// No description provided for @onboarding1Title.
  ///
  /// In en, this message translates to:
  /// **'Configure Your Perfect Setup'**
  String get onboarding1Title;

  /// No description provided for @onboarding1Desc.
  ///
  /// In en, this message translates to:
  /// **'Answer a few questions about your fishing goals and get a complete equipment recommendation — rod, reel, line, and more.'**
  String get onboarding1Desc;

  /// No description provided for @onboarding2Title.
  ///
  /// In en, this message translates to:
  /// **'Track Your Gear Health'**
  String get onboarding2Title;

  /// No description provided for @onboarding2Desc.
  ///
  /// In en, this message translates to:
  /// **'Log usage sessions, get maintenance reminders, and extend the life of your saltwater equipment.'**
  String get onboarding2Desc;

  /// No description provided for @onboarding3Title.
  ///
  /// In en, this message translates to:
  /// **'Plan Your Next Session'**
  String get onboarding3Title;

  /// No description provided for @onboarding3Desc.
  ///
  /// In en, this message translates to:
  /// **'Check tides, moon phases, and solunar periods for your favorite beaches — all offline, no internet needed.'**
  String get onboarding3Desc;

  /// No description provided for @skip.
  ///
  /// In en, this message translates to:
  /// **'Skip'**
  String get skip;

  /// No description provided for @getStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get getStarted;

  /// No description provided for @exportData.
  ///
  /// In en, this message translates to:
  /// **'Export Data'**
  String get exportData;

  /// No description provided for @exportToCsv.
  ///
  /// In en, this message translates to:
  /// **'Export to CSV'**
  String get exportToCsv;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'zh'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
