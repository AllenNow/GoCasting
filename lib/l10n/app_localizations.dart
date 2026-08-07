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

  /// No description provided for @tabHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get tabHome;

  /// No description provided for @tabGear.
  ///
  /// In en, this message translates to:
  /// **'Gear'**
  String get tabGear;

  /// No description provided for @tabCatches.
  ///
  /// In en, this message translates to:
  /// **'Catches'**
  String get tabCatches;

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

  /// No description provided for @tabMe.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get tabMe;

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

  /// No description provided for @gearDetail.
  ///
  /// In en, this message translates to:
  /// **'Gear Detail'**
  String get gearDetail;

  /// No description provided for @notFound.
  ///
  /// In en, this message translates to:
  /// **'Not found'**
  String get notFound;

  /// No description provided for @status.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get status;

  /// No description provided for @purchased.
  ///
  /// In en, this message translates to:
  /// **'Purchased'**
  String get purchased;

  /// No description provided for @price.
  ///
  /// In en, this message translates to:
  /// **'Price'**
  String get price;

  /// No description provided for @warranty.
  ///
  /// In en, this message translates to:
  /// **'Warranty'**
  String get warranty;

  /// No description provided for @photos.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get photos;

  /// No description provided for @parts.
  ///
  /// In en, this message translates to:
  /// **'Parts'**
  String get parts;

  /// No description provided for @service.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get service;

  /// No description provided for @maintenanceGuides.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Guides'**
  String get maintenanceGuides;

  /// No description provided for @seasonCheck.
  ///
  /// In en, this message translates to:
  /// **'Season Check'**
  String get seasonCheck;

  /// No description provided for @insurance.
  ///
  /// In en, this message translates to:
  /// **'Insurance'**
  String get insurance;

  /// No description provided for @logMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Log Maintenance'**
  String get logMaintenance;

  /// No description provided for @totalCostOwnership.
  ///
  /// In en, this message translates to:
  /// **'Total Cost of Ownership'**
  String get totalCostOwnership;

  /// No description provided for @purchasePrice.
  ///
  /// In en, this message translates to:
  /// **'Purchase Price'**
  String get purchasePrice;

  /// No description provided for @maintenanceCost.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Cost'**
  String get maintenanceCost;

  /// No description provided for @totalTco.
  ///
  /// In en, this message translates to:
  /// **'Total (TCO)'**
  String get totalTco;

  /// No description provided for @estimatedValue.
  ///
  /// In en, this message translates to:
  /// **'Estimated Value'**
  String get estimatedValue;

  /// No description provided for @valueRetained.
  ///
  /// In en, this message translates to:
  /// **'Value retained'**
  String get valueRetained;

  /// No description provided for @original.
  ///
  /// In en, this message translates to:
  /// **'Original'**
  String get original;

  /// No description provided for @depreciation.
  ///
  /// In en, this message translates to:
  /// **'Depreciation'**
  String get depreciation;

  /// No description provided for @lifeLeft.
  ///
  /// In en, this message translates to:
  /// **'Life Left'**
  String get lifeLeft;

  /// No description provided for @noWarrantyRecorded.
  ///
  /// In en, this message translates to:
  /// **'No warranty recorded'**
  String get noWarrantyRecorded;

  /// No description provided for @tapToAddWarranty.
  ///
  /// In en, this message translates to:
  /// **'Tap to add warranty info'**
  String get tapToAddWarranty;

  /// No description provided for @warrantyActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get warrantyActive;

  /// No description provided for @warrantyExpiringSoon.
  ///
  /// In en, this message translates to:
  /// **'Expiring Soon'**
  String get warrantyExpiringSoon;

  /// No description provided for @warrantyExpired.
  ///
  /// In en, this message translates to:
  /// **'Expired'**
  String get warrantyExpired;

  /// No description provided for @daysRemaining.
  ///
  /// In en, this message translates to:
  /// **'{count} days remaining'**
  String daysRemaining(int count);

  /// No description provided for @expiredOn.
  ///
  /// In en, this message translates to:
  /// **'Expired on {date}'**
  String expiredOn(String date);

  /// No description provided for @warrantyScreen.
  ///
  /// In en, this message translates to:
  /// **'Warranty'**
  String get warrantyScreen;

  /// No description provided for @warrantyStartDate.
  ///
  /// In en, this message translates to:
  /// **'Warranty Start Date'**
  String get warrantyStartDate;

  /// No description provided for @warrantyDuration.
  ///
  /// In en, this message translates to:
  /// **'Warranty Duration (months)'**
  String get warrantyDuration;

  /// No description provided for @providerRetailer.
  ///
  /// In en, this message translates to:
  /// **'Provider / Retailer'**
  String get providerRetailer;

  /// No description provided for @warrantyTerms.
  ///
  /// In en, this message translates to:
  /// **'Warranty Terms (optional)'**
  String get warrantyTerms;

  /// No description provided for @calculatedExpiry.
  ///
  /// In en, this message translates to:
  /// **'Calculated Expiry'**
  String get calculatedExpiry;

  /// No description provided for @saveWarranty.
  ///
  /// In en, this message translates to:
  /// **'Save Warranty'**
  String get saveWarranty;

  /// No description provided for @updateWarranty.
  ///
  /// In en, this message translates to:
  /// **'Update Warranty'**
  String get updateWarranty;

  /// No description provided for @deleteWarranty.
  ///
  /// In en, this message translates to:
  /// **'Delete Warranty'**
  String get deleteWarranty;

  /// No description provided for @deleteWarrantyConfirm.
  ///
  /// In en, this message translates to:
  /// **'This will remove all warranty information for this item.'**
  String get deleteWarrantyConfirm;

  /// No description provided for @photosScreen.
  ///
  /// In en, this message translates to:
  /// **'Photos'**
  String get photosScreen;

  /// No description provided for @noPhotosYet.
  ///
  /// In en, this message translates to:
  /// **'No photos yet'**
  String get noPhotosYet;

  /// No description provided for @addPhotosDesc.
  ///
  /// In en, this message translates to:
  /// **'Add photos of your gear, receipts, or warranty cards'**
  String get addPhotosDesc;

  /// No description provided for @addFirstPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add First Photo'**
  String get addFirstPhoto;

  /// No description provided for @whatTypePhoto.
  ///
  /// In en, this message translates to:
  /// **'What type of photo?'**
  String get whatTypePhoto;

  /// No description provided for @receipt.
  ///
  /// In en, this message translates to:
  /// **'Receipt'**
  String get receipt;

  /// No description provided for @warrantyCard.
  ///
  /// In en, this message translates to:
  /// **'Warranty Card'**
  String get warrantyCard;

  /// No description provided for @invoice.
  ///
  /// In en, this message translates to:
  /// **'Invoice'**
  String get invoice;

  /// No description provided for @gearPhoto.
  ///
  /// In en, this message translates to:
  /// **'Gear Photo'**
  String get gearPhoto;

  /// No description provided for @takePhoto.
  ///
  /// In en, this message translates to:
  /// **'Take Photo'**
  String get takePhoto;

  /// No description provided for @chooseGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose from Gallery'**
  String get chooseGallery;

  /// No description provided for @photoSaved.
  ///
  /// In en, this message translates to:
  /// **'Photo saved'**
  String get photoSaved;

  /// No description provided for @deletePhoto.
  ///
  /// In en, this message translates to:
  /// **'Delete Photo?'**
  String get deletePhoto;

  /// No description provided for @deletePhotoConfirm.
  ///
  /// In en, this message translates to:
  /// **'This will permanently remove this photo.'**
  String get deletePhotoConfirm;

  /// No description provided for @receiptsDocuments.
  ///
  /// In en, this message translates to:
  /// **'Receipts & Documents'**
  String get receiptsDocuments;

  /// No description provided for @gearPhotos.
  ///
  /// In en, this message translates to:
  /// **'Gear Photos'**
  String get gearPhotos;

  /// No description provided for @logMaintenanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Log Maintenance'**
  String get logMaintenanceTitle;

  /// No description provided for @maintenanceType.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Type'**
  String get maintenanceType;

  /// No description provided for @date.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get date;

  /// No description provided for @costCategory.
  ///
  /// In en, this message translates to:
  /// **'Cost Category'**
  String get costCategory;

  /// No description provided for @selfService.
  ///
  /// In en, this message translates to:
  /// **'Self'**
  String get selfService;

  /// No description provided for @professional.
  ///
  /// In en, this message translates to:
  /// **'Pro'**
  String get professional;

  /// No description provided for @partsReplacement.
  ///
  /// In en, this message translates to:
  /// **'Parts'**
  String get partsReplacement;

  /// No description provided for @cost.
  ///
  /// In en, this message translates to:
  /// **'Cost'**
  String get cost;

  /// No description provided for @serviceProvider.
  ///
  /// In en, this message translates to:
  /// **'Service Provider'**
  String get serviceProvider;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @recordMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Record Maintenance'**
  String get recordMaintenance;

  /// No description provided for @tcoAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Cost Analysis'**
  String get tcoAnalysis;

  /// No description provided for @costSummary.
  ///
  /// In en, this message translates to:
  /// **'Cost Summary'**
  String get costSummary;

  /// No description provided for @maintenanceRatio.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Ratio'**
  String get maintenanceRatio;

  /// No description provided for @totalSessions.
  ///
  /// In en, this message translates to:
  /// **'Total Sessions'**
  String get totalSessions;

  /// No description provided for @maintenancePerSession.
  ///
  /// In en, this message translates to:
  /// **'Maintenance / Session'**
  String get maintenancePerSession;

  /// No description provided for @costBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Cost Breakdown'**
  String get costBreakdown;

  /// No description provided for @byCategory.
  ///
  /// In en, this message translates to:
  /// **'By Category'**
  String get byCategory;

  /// No description provided for @maintenanceCostHistory.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Cost History'**
  String get maintenanceCostHistory;

  /// No description provided for @noMaintenanceCosts.
  ///
  /// In en, this message translates to:
  /// **'No maintenance costs recorded yet'**
  String get noMaintenanceCosts;

  /// No description provided for @costsWillAppear.
  ///
  /// In en, this message translates to:
  /// **'Costs will appear here when you log maintenance with a cost.'**
  String get costsWillAppear;

  /// No description provided for @componentsScreen.
  ///
  /// In en, this message translates to:
  /// **'Components'**
  String get componentsScreen;

  /// No description provided for @noComponentsTracked.
  ///
  /// In en, this message translates to:
  /// **'No components tracked'**
  String get noComponentsTracked;

  /// No description provided for @addDefaultComponents.
  ///
  /// In en, this message translates to:
  /// **'Add Default Components'**
  String get addDefaultComponents;

  /// No description provided for @addComponent.
  ///
  /// In en, this message translates to:
  /// **'Add Component'**
  String get addComponent;

  /// No description provided for @componentName.
  ///
  /// In en, this message translates to:
  /// **'Component Name'**
  String get componentName;

  /// No description provided for @maintenanceEveryNSessions.
  ///
  /// In en, this message translates to:
  /// **'Maintenance every N sessions'**
  String get maintenanceEveryNSessions;

  /// No description provided for @maintenanceEveryNDays.
  ///
  /// In en, this message translates to:
  /// **'Maintenance every N days'**
  String get maintenanceEveryNDays;

  /// No description provided for @markMaintained.
  ///
  /// In en, this message translates to:
  /// **'Mark Maintained'**
  String get markMaintained;

  /// No description provided for @replaceComponent.
  ///
  /// In en, this message translates to:
  /// **'Replace'**
  String get replaceComponent;

  /// No description provided for @deleteComponent.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get deleteComponent;

  /// No description provided for @replaceComponentTitle.
  ///
  /// In en, this message translates to:
  /// **'Replace {name}?'**
  String replaceComponentTitle(String name);

  /// No description provided for @replaceComponentDesc.
  ///
  /// In en, this message translates to:
  /// **'This will mark the current component as replaced and create a new one.'**
  String get replaceComponentDesc;

  /// No description provided for @replacementCost.
  ///
  /// In en, this message translates to:
  /// **'Replacement Cost'**
  String get replacementCost;

  /// No description provided for @neverMaintained.
  ///
  /// In en, this message translates to:
  /// **'Never maintained'**
  String get neverMaintained;

  /// No description provided for @lastMaintenance.
  ///
  /// In en, this message translates to:
  /// **'Last: {date}'**
  String lastMaintenance(String date);

  /// No description provided for @everyNDays.
  ///
  /// In en, this message translates to:
  /// **'Every {count} days'**
  String everyNDays(int count);

  /// No description provided for @tutorialsScreen.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Guides'**
  String get tutorialsScreen;

  /// No description provided for @allTypes.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allTypes;

  /// No description provided for @cleaning.
  ///
  /// In en, this message translates to:
  /// **'Cleaning'**
  String get cleaning;

  /// No description provided for @lubrication.
  ///
  /// In en, this message translates to:
  /// **'Lubrication'**
  String get lubrication;

  /// No description provided for @inspection.
  ///
  /// In en, this message translates to:
  /// **'Inspection'**
  String get inspection;

  /// No description provided for @replacement.
  ///
  /// In en, this message translates to:
  /// **'Replacement'**
  String get replacement;

  /// No description provided for @toolsNeeded.
  ///
  /// In en, this message translates to:
  /// **'Tools Needed'**
  String get toolsNeeded;

  /// No description provided for @steps.
  ///
  /// In en, this message translates to:
  /// **'Steps'**
  String get steps;

  /// No description provided for @difficulty.
  ///
  /// In en, this message translates to:
  /// **'Difficulty'**
  String get difficulty;

  /// No description provided for @beginner.
  ///
  /// In en, this message translates to:
  /// **'Beginner'**
  String get beginner;

  /// No description provided for @intermediate.
  ///
  /// In en, this message translates to:
  /// **'Intermediate'**
  String get intermediate;

  /// No description provided for @advanced.
  ///
  /// In en, this message translates to:
  /// **'Advanced'**
  String get advanced;

  /// No description provided for @minutes.
  ///
  /// In en, this message translates to:
  /// **'{count} min'**
  String minutes(int count);

  /// No description provided for @nSteps.
  ///
  /// In en, this message translates to:
  /// **'{count} steps'**
  String nSteps(int count);

  /// No description provided for @serviceRecordsScreen.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get serviceRecordsScreen;

  /// No description provided for @noServiceRecords.
  ///
  /// In en, this message translates to:
  /// **'No service records'**
  String get noServiceRecords;

  /// No description provided for @trackProfessionalRepairs.
  ///
  /// In en, this message translates to:
  /// **'Track professional repairs and servicing here.'**
  String get trackProfessionalRepairs;

  /// No description provided for @sendForService.
  ///
  /// In en, this message translates to:
  /// **'Send for Service'**
  String get sendForService;

  /// No description provided for @serviceProviderLabel.
  ///
  /// In en, this message translates to:
  /// **'Service Provider *'**
  String get serviceProviderLabel;

  /// No description provided for @dateSent.
  ///
  /// In en, this message translates to:
  /// **'Date Sent'**
  String get dateSent;

  /// No description provided for @estimatedReturn.
  ///
  /// In en, this message translates to:
  /// **'Estimated Return (optional)'**
  String get estimatedReturn;

  /// No description provided for @notSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get notSet;

  /// No description provided for @statusSent.
  ///
  /// In en, this message translates to:
  /// **'Sent'**
  String get statusSent;

  /// No description provided for @statusInRepair.
  ///
  /// In en, this message translates to:
  /// **'In Repair'**
  String get statusInRepair;

  /// No description provided for @statusReturned.
  ///
  /// In en, this message translates to:
  /// **'Returned'**
  String get statusReturned;

  /// No description provided for @markInRepair.
  ///
  /// In en, this message translates to:
  /// **'Mark In Repair'**
  String get markInRepair;

  /// No description provided for @markReturned.
  ///
  /// In en, this message translates to:
  /// **'Mark Returned'**
  String get markReturned;

  /// No description provided for @serviceCost.
  ///
  /// In en, this message translates to:
  /// **'Service Cost'**
  String get serviceCost;

  /// No description provided for @gearReturned.
  ///
  /// In en, this message translates to:
  /// **'Gear returned! Welcome back.'**
  String get gearReturned;

  /// No description provided for @statusUpdated.
  ///
  /// In en, this message translates to:
  /// **'Status updated'**
  String get statusUpdated;

  /// No description provided for @preseasonChecklist.
  ///
  /// In en, this message translates to:
  /// **'Season Check'**
  String get preseasonChecklist;

  /// No description provided for @itemsCompleted.
  ///
  /// In en, this message translates to:
  /// **'{done} / {total} items completed'**
  String itemsCompleted(int done, int total);

  /// No description provided for @criticalChecks.
  ///
  /// In en, this message translates to:
  /// **'Critical Checks'**
  String get criticalChecks;

  /// No description provided for @normalChecks.
  ///
  /// In en, this message translates to:
  /// **'Normal Checks'**
  String get normalChecks;

  /// No description provided for @optionalChecks.
  ///
  /// In en, this message translates to:
  /// **'Optional Checks'**
  String get optionalChecks;

  /// No description provided for @allChecksComplete.
  ///
  /// In en, this message translates to:
  /// **'All Checks Complete! Ready for Season'**
  String get allChecksComplete;

  /// No description provided for @seasonReady.
  ///
  /// In en, this message translates to:
  /// **'Season Ready!'**
  String get seasonReady;

  /// No description provided for @passedAllChecks.
  ///
  /// In en, this message translates to:
  /// **'{name} has passed all pre-season checks.'**
  String passedAllChecks(String name);

  /// No description provided for @insuranceReport.
  ///
  /// In en, this message translates to:
  /// **'Insurance Report'**
  String get insuranceReport;

  /// No description provided for @exportCsv.
  ///
  /// In en, this message translates to:
  /// **'Export CSV'**
  String get exportCsv;

  /// No description provided for @noActiveGear.
  ///
  /// In en, this message translates to:
  /// **'No active gear'**
  String get noActiveGear;

  /// No description provided for @addGearForReport.
  ///
  /// In en, this message translates to:
  /// **'Add gear to your inventory to generate an insurance report.'**
  String get addGearForReport;

  /// No description provided for @exportAsCsv.
  ///
  /// In en, this message translates to:
  /// **'Export as CSV'**
  String get exportAsCsv;

  /// No description provided for @copyToClipboard.
  ///
  /// In en, this message translates to:
  /// **'Copy to Clipboard'**
  String get copyToClipboard;

  /// No description provided for @insuranceSummary.
  ///
  /// In en, this message translates to:
  /// **'Insurance Summary'**
  String get insuranceSummary;

  /// No description provided for @totalItems.
  ///
  /// In en, this message translates to:
  /// **'Total Items'**
  String get totalItems;

  /// No description provided for @originalValue.
  ///
  /// In en, this message translates to:
  /// **'Original Value'**
  String get originalValue;

  /// No description provided for @currentValue.
  ///
  /// In en, this message translates to:
  /// **'Current Value'**
  String get currentValue;

  /// No description provided for @reportDate.
  ///
  /// In en, this message translates to:
  /// **'Report Date'**
  String get reportDate;

  /// No description provided for @reportExported.
  ///
  /// In en, this message translates to:
  /// **'Report Exported'**
  String get reportExported;

  /// No description provided for @copied.
  ///
  /// In en, this message translates to:
  /// **'Copied'**
  String get copied;

  /// No description provided for @reportCopied.
  ///
  /// In en, this message translates to:
  /// **'Report copied to clipboard'**
  String get reportCopied;

  /// No description provided for @calculatorsScreen.
  ///
  /// In en, this message translates to:
  /// **'Gear Calculators'**
  String get calculatorsScreen;

  /// No description provided for @dragSetting.
  ///
  /// In en, this message translates to:
  /// **'Drag Setting'**
  String get dragSetting;

  /// No description provided for @dragSettingDesc.
  ///
  /// In en, this message translates to:
  /// **'Calculate optimal drag based on line strength and knot type'**
  String get dragSettingDesc;

  /// No description provided for @lineCapacity.
  ///
  /// In en, this message translates to:
  /// **'Line Capacity'**
  String get lineCapacity;

  /// No description provided for @lineCapacityDesc.
  ///
  /// In en, this message translates to:
  /// **'How much line fits on your reel + backing calculation'**
  String get lineCapacityDesc;

  /// No description provided for @shockLeader.
  ///
  /// In en, this message translates to:
  /// **'Shock Leader'**
  String get shockLeader;

  /// No description provided for @shockLeaderDesc.
  ///
  /// In en, this message translates to:
  /// **'Required lb test and length for casting heavy sinkers'**
  String get shockLeaderDesc;

  /// No description provided for @sinkerWeight.
  ///
  /// In en, this message translates to:
  /// **'Sinker Weight'**
  String get sinkerWeight;

  /// No description provided for @sinkerWeightDesc.
  ///
  /// In en, this message translates to:
  /// **'Recommended weight based on current, waves, and distance'**
  String get sinkerWeightDesc;

  /// No description provided for @lineTest.
  ///
  /// In en, this message translates to:
  /// **'Line Test (lb)'**
  String get lineTest;

  /// No description provided for @knotRetention.
  ///
  /// In en, this message translates to:
  /// **'Knot Retention'**
  String get knotRetention;

  /// No description provided for @fishingStyle.
  ///
  /// In en, this message translates to:
  /// **'Fishing Style'**
  String get fishingStyle;

  /// No description provided for @result.
  ///
  /// In en, this message translates to:
  /// **'Result'**
  String get result;

  /// No description provided for @effectiveLineStrength.
  ///
  /// In en, this message translates to:
  /// **'Effective line strength'**
  String get effectiveLineStrength;

  /// No description provided for @dragPercentage.
  ///
  /// In en, this message translates to:
  /// **'Drag percentage'**
  String get dragPercentage;

  /// No description provided for @safeRange.
  ///
  /// In en, this message translates to:
  /// **'Safe range'**
  String get safeRange;

  /// No description provided for @reelSpecs.
  ///
  /// In en, this message translates to:
  /// **'Reel Specs'**
  String get reelSpecs;

  /// No description provided for @ratedCapacity.
  ///
  /// In en, this message translates to:
  /// **'Rated Capacity (yds)'**
  String get ratedCapacity;

  /// No description provided for @atDiameter.
  ///
  /// In en, this message translates to:
  /// **'At Diameter (mm)'**
  String get atDiameter;

  /// No description provided for @targetLine.
  ///
  /// In en, this message translates to:
  /// **'Target Line'**
  String get targetLine;

  /// No description provided for @targetLineDiameter.
  ///
  /// In en, this message translates to:
  /// **'Target Line Diameter (mm)'**
  String get targetLineDiameter;

  /// No description provided for @backingOptional.
  ///
  /// In en, this message translates to:
  /// **'Backing (optional)'**
  String get backingOptional;

  /// No description provided for @mainLine.
  ///
  /// In en, this message translates to:
  /// **'Main Line (yds)'**
  String get mainLine;

  /// No description provided for @backingDia.
  ///
  /// In en, this message translates to:
  /// **'Backing Dia (mm)'**
  String get backingDia;

  /// No description provided for @capacityWithTargetLine.
  ///
  /// In en, this message translates to:
  /// **'Capacity with target line'**
  String get capacityWithTargetLine;

  /// No description provided for @backingCalculation.
  ///
  /// In en, this message translates to:
  /// **'Backing Calculation'**
  String get backingCalculation;

  /// No description provided for @backingNeeded.
  ///
  /// In en, this message translates to:
  /// **'Backing needed'**
  String get backingNeeded;

  /// No description provided for @sinkerWeightOz.
  ///
  /// In en, this message translates to:
  /// **'Sinker Weight (oz)'**
  String get sinkerWeightOz;

  /// No description provided for @rodLength.
  ///
  /// In en, this message translates to:
  /// **'Rod Length (ft)'**
  String get rodLength;

  /// No description provided for @extraWraps.
  ///
  /// In en, this message translates to:
  /// **'Extra wraps on spool'**
  String get extraWraps;

  /// No description provided for @shockLeaderSpecs.
  ///
  /// In en, this message translates to:
  /// **'Shock Leader Specs'**
  String get shockLeaderSpecs;

  /// No description provided for @range.
  ///
  /// In en, this message translates to:
  /// **'Range'**
  String get range;

  /// No description provided for @length.
  ///
  /// In en, this message translates to:
  /// **'Length'**
  String get length;

  /// No description provided for @approxDiameter.
  ///
  /// In en, this message translates to:
  /// **'Approx. diameter'**
  String get approxDiameter;

  /// No description provided for @current.
  ///
  /// In en, this message translates to:
  /// **'Current'**
  String get current;

  /// No description provided for @waves.
  ///
  /// In en, this message translates to:
  /// **'Waves'**
  String get waves;

  /// No description provided for @targetDistance.
  ///
  /// In en, this message translates to:
  /// **'Target Distance'**
  String get targetDistance;

  /// No description provided for @bottomType.
  ///
  /// In en, this message translates to:
  /// **'Bottom Type'**
  String get bottomType;

  /// No description provided for @recommendedSinker.
  ///
  /// In en, this message translates to:
  /// **'Recommended Sinker'**
  String get recommendedSinker;

  /// No description provided for @type.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get type;

  /// No description provided for @knotsRigsScreen.
  ///
  /// In en, this message translates to:
  /// **'Knots & Rigs Guide'**
  String get knotsRigsScreen;

  /// No description provided for @knots.
  ///
  /// In en, this message translates to:
  /// **'Knots'**
  String get knots;

  /// No description provided for @rigs.
  ///
  /// In en, this message translates to:
  /// **'Rigs'**
  String get rigs;

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @terminal.
  ///
  /// In en, this message translates to:
  /// **'Terminal'**
  String get terminal;

  /// No description provided for @lineToLine.
  ///
  /// In en, this message translates to:
  /// **'Line-to-Line'**
  String get lineToLine;

  /// No description provided for @loop.
  ///
  /// In en, this message translates to:
  /// **'Loop'**
  String get loop;

  /// No description provided for @strength.
  ///
  /// In en, this message translates to:
  /// **'strength'**
  String get strength;

  /// No description provided for @bestFor.
  ///
  /// In en, this message translates to:
  /// **'Best for'**
  String get bestFor;

  /// No description provided for @assembly.
  ///
  /// In en, this message translates to:
  /// **'Assembly'**
  String get assembly;

  /// No description provided for @components.
  ///
  /// In en, this message translates to:
  /// **'Components'**
  String get components;

  /// No description provided for @targetSpecies.
  ///
  /// In en, this message translates to:
  /// **'Target Species'**
  String get targetSpecies;

  /// No description provided for @speciesGuide.
  ///
  /// In en, this message translates to:
  /// **'Species Guide'**
  String get speciesGuide;

  /// No description provided for @searchSpecies.
  ///
  /// In en, this message translates to:
  /// **'Search species...'**
  String get searchSpecies;

  /// No description provided for @gamefish.
  ///
  /// In en, this message translates to:
  /// **'Gamefish'**
  String get gamefish;

  /// No description provided for @panfish.
  ///
  /// In en, this message translates to:
  /// **'Panfish'**
  String get panfish;

  /// No description provided for @shark.
  ///
  /// In en, this message translates to:
  /// **'Shark'**
  String get shark;

  /// No description provided for @identification.
  ///
  /// In en, this message translates to:
  /// **'Identification'**
  String get identification;

  /// No description provided for @habitatBehavior.
  ///
  /// In en, this message translates to:
  /// **'Habitat & Behavior'**
  String get habitatBehavior;

  /// No description provided for @gearRecommendation.
  ///
  /// In en, this message translates to:
  /// **'Gear Recommendation'**
  String get gearRecommendation;

  /// No description provided for @bestBait.
  ///
  /// In en, this message translates to:
  /// **'Best Bait'**
  String get bestBait;

  /// No description provided for @seasonalPattern.
  ///
  /// In en, this message translates to:
  /// **'Seasonal Pattern'**
  String get seasonalPattern;

  /// No description provided for @size.
  ///
  /// In en, this message translates to:
  /// **'Size'**
  String get size;

  /// No description provided for @common.
  ///
  /// In en, this message translates to:
  /// **'Common'**
  String get common;

  /// No description provided for @trophy.
  ///
  /// In en, this message translates to:
  /// **'Trophy'**
  String get trophy;

  /// No description provided for @regulations.
  ///
  /// In en, this message translates to:
  /// **'Regulations'**
  String get regulations;

  /// No description provided for @configureGearFor.
  ///
  /// In en, this message translates to:
  /// **'Configure Gear for {species}'**
  String configureGearFor(String species);

  /// No description provided for @wishlistScreen.
  ///
  /// In en, this message translates to:
  /// **'Gear Wishlist'**
  String get wishlistScreen;

  /// No description provided for @wishlistEmpty.
  ///
  /// In en, this message translates to:
  /// **'Your wishlist is empty'**
  String get wishlistEmpty;

  /// No description provided for @planUpgrades.
  ///
  /// In en, this message translates to:
  /// **'Plan your next gear upgrades here'**
  String get planUpgrades;

  /// No description provided for @addFirstItem.
  ///
  /// In en, this message translates to:
  /// **'Add First Item'**
  String get addFirstItem;

  /// No description provided for @addToWishlist.
  ///
  /// In en, this message translates to:
  /// **'Add to Wishlist'**
  String get addToWishlist;

  /// No description provided for @itemName.
  ///
  /// In en, this message translates to:
  /// **'Item Name'**
  String get itemName;

  /// No description provided for @estimatedPrice.
  ///
  /// In en, this message translates to:
  /// **'Est. Price'**
  String get estimatedPrice;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @priority.
  ///
  /// In en, this message translates to:
  /// **'Priority'**
  String get priority;

  /// No description provided for @high.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get high;

  /// No description provided for @medium.
  ///
  /// In en, this message translates to:
  /// **'Medium'**
  String get medium;

  /// No description provided for @low.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get low;

  /// No description provided for @totalPlanned.
  ///
  /// In en, this message translates to:
  /// **'Total Planned'**
  String get totalPlanned;

  /// No description provided for @itemsOnWishlist.
  ///
  /// In en, this message translates to:
  /// **'{count} items on wishlist'**
  String itemsOnWishlist(int count);

  /// No description provided for @highPriority.
  ///
  /// In en, this message translates to:
  /// **'High Priority'**
  String get highPriority;

  /// No description provided for @mediumPriority.
  ///
  /// In en, this message translates to:
  /// **'Medium Priority'**
  String get mediumPriority;

  /// No description provided for @lowPriority.
  ///
  /// In en, this message translates to:
  /// **'Low Priority'**
  String get lowPriority;

  /// No description provided for @goScore.
  ///
  /// In en, this message translates to:
  /// **'Go-Score'**
  String get goScore;

  /// No description provided for @bestWindow.
  ///
  /// In en, this message translates to:
  /// **'Best Window'**
  String get bestWindow;

  /// No description provided for @hourlyScore.
  ///
  /// In en, this message translates to:
  /// **'Hourly Score'**
  String get hourlyScore;

  /// No description provided for @scoreFactors.
  ///
  /// In en, this message translates to:
  /// **'Score Factors'**
  String get scoreFactors;

  /// No description provided for @excellent.
  ///
  /// In en, this message translates to:
  /// **'Excellent'**
  String get excellent;

  /// No description provided for @good.
  ///
  /// In en, this message translates to:
  /// **'Good'**
  String get good;

  /// No description provided for @fair.
  ///
  /// In en, this message translates to:
  /// **'Fair'**
  String get fair;

  /// No description provided for @poor.
  ///
  /// In en, this message translates to:
  /// **'Poor'**
  String get poor;

  /// No description provided for @veryPoor.
  ///
  /// In en, this message translates to:
  /// **'Very Poor'**
  String get veryPoor;

  /// No description provided for @solunar.
  ///
  /// In en, this message translates to:
  /// **'Solunar'**
  String get solunar;

  /// No description provided for @moonPhase.
  ///
  /// In en, this message translates to:
  /// **'Moon Phase'**
  String get moonPhase;

  /// No description provided for @light.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get light;

  /// No description provided for @tripChecklist.
  ///
  /// In en, this message translates to:
  /// **'Trip Checklist'**
  String get tripChecklist;

  /// No description provided for @packed.
  ///
  /// In en, this message translates to:
  /// **'{done} / {total} packed'**
  String packed(int done, int total);

  /// No description provided for @allPackedGoFish.
  ///
  /// In en, this message translates to:
  /// **'All Packed — Go Fish!'**
  String get allPackedGoFish;

  /// No description provided for @general.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get general;

  /// No description provided for @nightFishing.
  ///
  /// In en, this message translates to:
  /// **'Night'**
  String get nightFishing;

  /// No description provided for @longCast.
  ///
  /// In en, this message translates to:
  /// **'Long Cast'**
  String get longCast;

  /// No description provided for @sharks.
  ///
  /// In en, this message translates to:
  /// **'Sharks'**
  String get sharks;

  /// No description provided for @lightTackle.
  ///
  /// In en, this message translates to:
  /// **'Light Tackle'**
  String get lightTackle;

  /// No description provided for @castTracker.
  ///
  /// In en, this message translates to:
  /// **'Cast Tracker'**
  String get castTracker;

  /// No description provided for @trackCastingDistance.
  ///
  /// In en, this message translates to:
  /// **'Track Your Casting Distance'**
  String get trackCastingDistance;

  /// No description provided for @recordDistanceProgress.
  ///
  /// In en, this message translates to:
  /// **'Record distances to measure your progress over time'**
  String get recordDistanceProgress;

  /// No description provided for @startFirstSession.
  ///
  /// In en, this message translates to:
  /// **'Start First Session'**
  String get startFirstSession;

  /// No description provided for @newSession.
  ///
  /// In en, this message translates to:
  /// **'New Session'**
  String get newSession;

  /// No description provided for @yourStats.
  ///
  /// In en, this message translates to:
  /// **'Your Stats'**
  String get yourStats;

  /// No description provided for @personalBest.
  ///
  /// In en, this message translates to:
  /// **'Personal Best'**
  String get personalBest;

  /// No description provided for @average.
  ///
  /// In en, this message translates to:
  /// **'Average'**
  String get average;

  /// No description provided for @recentAvg.
  ///
  /// In en, this message translates to:
  /// **'Recent Avg'**
  String get recentAvg;

  /// No description provided for @sessions.
  ///
  /// In en, this message translates to:
  /// **'Sessions'**
  String get sessions;

  /// No description provided for @totalCasts.
  ///
  /// In en, this message translates to:
  /// **'Total Casts'**
  String get totalCasts;

  /// No description provided for @improvement.
  ///
  /// In en, this message translates to:
  /// **'Improvement'**
  String get improvement;

  /// No description provided for @bestSetup.
  ///
  /// In en, this message translates to:
  /// **'Best setup'**
  String get bestSetup;

  /// No description provided for @bestDistanceTrend.
  ///
  /// In en, this message translates to:
  /// **'Best Distance Trend'**
  String get bestDistanceTrend;

  /// No description provided for @newCastingSession.
  ///
  /// In en, this message translates to:
  /// **'New Casting Session'**
  String get newCastingSession;

  /// No description provided for @location.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get location;

  /// No description provided for @gearSetup.
  ///
  /// In en, this message translates to:
  /// **'Gear Setup'**
  String get gearSetup;

  /// No description provided for @casts.
  ///
  /// In en, this message translates to:
  /// **'Casts'**
  String get casts;

  /// No description provided for @best.
  ///
  /// In en, this message translates to:
  /// **'Best'**
  String get best;

  /// No description provided for @recordCast.
  ///
  /// In en, this message translates to:
  /// **'Record Cast'**
  String get recordCast;

  /// No description provided for @distance.
  ///
  /// In en, this message translates to:
  /// **'Distance (meters)'**
  String get distance;

  /// No description provided for @wind.
  ///
  /// In en, this message translates to:
  /// **'Wind'**
  String get wind;

  /// No description provided for @record.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get record;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @sessionSummary.
  ///
  /// In en, this message translates to:
  /// **'Session Summary'**
  String get sessionSummary;

  /// No description provided for @allCasts.
  ///
  /// In en, this message translates to:
  /// **'All Casts'**
  String get allCasts;

  /// No description provided for @catchLog.
  ///
  /// In en, this message translates to:
  /// **'Catch Log'**
  String get catchLog;

  /// No description provided for @log.
  ///
  /// In en, this message translates to:
  /// **'Log'**
  String get log;

  /// No description provided for @stats.
  ///
  /// In en, this message translates to:
  /// **'Stats'**
  String get stats;

  /// No description provided for @noCatchesYet.
  ///
  /// In en, this message translates to:
  /// **'No catches yet'**
  String get noCatchesYet;

  /// No description provided for @recordFirstCatch.
  ///
  /// In en, this message translates to:
  /// **'Record your first catch with the + button'**
  String get recordFirstCatch;

  /// No description provided for @logCatch.
  ///
  /// In en, this message translates to:
  /// **'Log Catch'**
  String get logCatch;

  /// No description provided for @species.
  ///
  /// In en, this message translates to:
  /// **'Species'**
  String get species;

  /// No description provided for @weight.
  ///
  /// In en, this message translates to:
  /// **'Weight'**
  String get weight;

  /// No description provided for @lengthLabel.
  ///
  /// In en, this message translates to:
  /// **'Length'**
  String get lengthLabel;

  /// No description provided for @bait.
  ///
  /// In en, this message translates to:
  /// **'Bait'**
  String get bait;

  /// No description provided for @rigType.
  ///
  /// In en, this message translates to:
  /// **'Rig Type'**
  String get rigType;

  /// No description provided for @tideState.
  ///
  /// In en, this message translates to:
  /// **'Tide State'**
  String get tideState;

  /// No description provided for @rising.
  ///
  /// In en, this message translates to:
  /// **'Rising'**
  String get rising;

  /// No description provided for @falling.
  ///
  /// In en, this message translates to:
  /// **'Falling'**
  String get falling;

  /// No description provided for @highTide.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get highTide;

  /// No description provided for @lowTide.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get lowTide;

  /// No description provided for @slack.
  ///
  /// In en, this message translates to:
  /// **'Slack'**
  String get slack;

  /// No description provided for @released.
  ///
  /// In en, this message translates to:
  /// **'Released'**
  String get released;

  /// No description provided for @kept.
  ///
  /// In en, this message translates to:
  /// **'Kept'**
  String get kept;

  /// No description provided for @releasedSafely.
  ///
  /// In en, this message translates to:
  /// **'Fish was released safely'**
  String get releasedSafely;

  /// No description provided for @fishKept.
  ///
  /// In en, this message translates to:
  /// **'Fish was kept'**
  String get fishKept;

  /// No description provided for @saveCatch.
  ///
  /// In en, this message translates to:
  /// **'Save Catch'**
  String get saveCatch;

  /// No description provided for @totalCatches.
  ///
  /// In en, this message translates to:
  /// **'Total Catches'**
  String get totalCatches;

  /// No description provided for @biggest.
  ///
  /// In en, this message translates to:
  /// **'Biggest'**
  String get biggest;

  /// No description provided for @speciesCaught.
  ///
  /// In en, this message translates to:
  /// **'Species Caught'**
  String get speciesCaught;

  /// No description provided for @bestBaitStats.
  ///
  /// In en, this message translates to:
  /// **'Best Bait'**
  String get bestBaitStats;

  /// No description provided for @deleteCatch.
  ///
  /// In en, this message translates to:
  /// **'Delete Catch?'**
  String get deleteCatch;

  /// No description provided for @removeCatchConfirm.
  ///
  /// In en, this message translates to:
  /// **'Remove {species} caught on {date}?'**
  String removeCatchConfirm(String species, String date);

  /// No description provided for @recordCatchesToSeeStats.
  ///
  /// In en, this message translates to:
  /// **'Record catches to see statistics'**
  String get recordCatchesToSeeStats;

  /// No description provided for @backupRestore.
  ///
  /// In en, this message translates to:
  /// **'Backup & Restore'**
  String get backupRestore;

  /// No description provided for @dataOverview.
  ///
  /// In en, this message translates to:
  /// **'Data Overview'**
  String get dataOverview;

  /// No description provided for @createBackup.
  ///
  /// In en, this message translates to:
  /// **'Create Backup'**
  String get createBackup;

  /// No description provided for @selectDataToBackup.
  ///
  /// In en, this message translates to:
  /// **'Select which data to include in the backup:'**
  String get selectDataToBackup;

  /// No description provided for @selectAll.
  ///
  /// In en, this message translates to:
  /// **'Select All'**
  String get selectAll;

  /// No description provided for @clearAll.
  ///
  /// In en, this message translates to:
  /// **'Clear All'**
  String get clearAll;

  /// No description provided for @createShareBackup.
  ///
  /// In en, this message translates to:
  /// **'Create & Share Backup'**
  String get createShareBackup;

  /// No description provided for @restoreFromBackup.
  ///
  /// In en, this message translates to:
  /// **'Restore from Backup'**
  String get restoreFromBackup;

  /// No description provided for @selectBackupFile.
  ///
  /// In en, this message translates to:
  /// **'Select Backup File (.gcbak)'**
  String get selectBackupFile;

  /// No description provided for @selectBackupFileDesc.
  ///
  /// In en, this message translates to:
  /// **'Select a .gcbak backup file to restore your data.'**
  String get selectBackupFileDesc;

  /// No description provided for @howItWorks.
  ///
  /// In en, this message translates to:
  /// **'How it works'**
  String get howItWorks;

  /// No description provided for @backupInfo1.
  ///
  /// In en, this message translates to:
  /// **'Backup creates a .gcbak file containing your selected data'**
  String get backupInfo1;

  /// No description provided for @backupInfo2.
  ///
  /// In en, this message translates to:
  /// **'Use the system share sheet to save to iCloud, Google Drive, or Files'**
  String get backupInfo2;

  /// No description provided for @backupInfo3.
  ///
  /// In en, this message translates to:
  /// **'Restore replaces current data with the backup — this cannot be undone'**
  String get backupInfo3;

  /// No description provided for @backupInfo4.
  ///
  /// In en, this message translates to:
  /// **'After restore, restart the app for changes to take effect'**
  String get backupInfo4;

  /// No description provided for @backupInfo5.
  ///
  /// In en, this message translates to:
  /// **'Backups are fully offline — no internet needed'**
  String get backupInfo5;

  /// No description provided for @backupCreated.
  ///
  /// In en, this message translates to:
  /// **'Backup Created!'**
  String get backupCreated;

  /// No description provided for @backupReady.
  ///
  /// In en, this message translates to:
  /// **'Your backup is ready to share.'**
  String get backupReady;

  /// No description provided for @modules.
  ///
  /// In en, this message translates to:
  /// **'Modules'**
  String get modules;

  /// No description provided for @share.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get share;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @backupFailed.
  ///
  /// In en, this message translates to:
  /// **'Backup Failed'**
  String get backupFailed;

  /// No description provided for @restoreBackup.
  ///
  /// In en, this message translates to:
  /// **'Restore Backup?'**
  String get restoreBackup;

  /// No description provided for @restoreWarning.
  ///
  /// In en, this message translates to:
  /// **'This will replace your current data with the backup.'**
  String get restoreWarning;

  /// No description provided for @cannotBeUndone.
  ///
  /// In en, this message translates to:
  /// **'This action cannot be undone. Restart the app after restore.'**
  String get cannotBeUndone;

  /// No description provided for @restore.
  ///
  /// In en, this message translates to:
  /// **'Restore'**
  String get restore;

  /// No description provided for @restoreComplete.
  ///
  /// In en, this message translates to:
  /// **'Restore Complete!'**
  String get restoreComplete;

  /// No description provided for @restoreSuccess.
  ///
  /// In en, this message translates to:
  /// **'Data has been restored successfully.\n\nPlease restart the app for all changes to take effect.'**
  String get restoreSuccess;

  /// No description provided for @restoreFailed.
  ///
  /// In en, this message translates to:
  /// **'Restore Failed'**
  String get restoreFailed;

  /// No description provided for @invalidBackupFile.
  ///
  /// In en, this message translates to:
  /// **'This does not appear to be a valid GoCasting backup'**
  String get invalidBackupFile;

  /// No description provided for @gearInventory.
  ///
  /// In en, this message translates to:
  /// **'Gear Inventory'**
  String get gearInventory;

  /// No description provided for @usageLogs.
  ///
  /// In en, this message translates to:
  /// **'Usage Logs'**
  String get usageLogs;

  /// No description provided for @maintenanceRecords.
  ///
  /// In en, this message translates to:
  /// **'Maintenance Records'**
  String get maintenanceRecords;

  /// No description provided for @warranties.
  ///
  /// In en, this message translates to:
  /// **'Warranties'**
  String get warranties;

  /// No description provided for @serviceRecords.
  ///
  /// In en, this message translates to:
  /// **'Service Records'**
  String get serviceRecords;

  /// No description provided for @photosReceipts.
  ///
  /// In en, this message translates to:
  /// **'Photos & Receipts'**
  String get photosReceipts;

  /// No description provided for @settingsBeaches.
  ///
  /// In en, this message translates to:
  /// **'Settings & Beaches'**
  String get settingsBeaches;

  /// No description provided for @dataReports.
  ///
  /// In en, this message translates to:
  /// **'Data & Reports'**
  String get dataReports;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @error.
  ///
  /// In en, this message translates to:
  /// **'Error'**
  String get error;

  /// No description provided for @success.
  ///
  /// In en, this message translates to:
  /// **'Success'**
  String get success;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loading;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming Soon'**
  String get comingSoon;

  /// No description provided for @funHub.
  ///
  /// In en, this message translates to:
  /// **'Fun Zone'**
  String get funHub;

  /// No description provided for @dailyFortune.
  ///
  /// In en, this message translates to:
  /// **'Daily Fishing Fortune'**
  String get dailyFortune;

  /// No description provided for @personalityTest.
  ///
  /// In en, this message translates to:
  /// **'Fishing Personality Test'**
  String get personalityTest;

  /// No description provided for @shareFortune.
  ///
  /// In en, this message translates to:
  /// **'Share Fortune'**
  String get shareFortune;

  /// No description provided for @sharePersonality.
  ///
  /// In en, this message translates to:
  /// **'Share My Fishing Personality'**
  String get sharePersonality;

  /// No description provided for @retakeTest.
  ///
  /// In en, this message translates to:
  /// **'Retake Test'**
  String get retakeTest;

  /// No description provided for @moreFun.
  ///
  /// In en, this message translates to:
  /// **'More Fun'**
  String get moreFun;

  /// No description provided for @shareHeatmap.
  ///
  /// In en, this message translates to:
  /// **'Share Heatmap'**
  String get shareHeatmap;

  /// No description provided for @shareProfileCard.
  ///
  /// In en, this message translates to:
  /// **'Share Card'**
  String get shareProfileCard;

  /// No description provided for @shareFunStats.
  ///
  /// In en, this message translates to:
  /// **'Share Fun Stats'**
  String get shareFunStats;

  /// No description provided for @shareAnnualReport.
  ///
  /// In en, this message translates to:
  /// **'Share My Annual Report'**
  String get shareAnnualReport;

  /// No description provided for @achievements.
  ///
  /// In en, this message translates to:
  /// **'Achievements'**
  String get achievements;

  /// No description provided for @catchAnalysis.
  ///
  /// In en, this message translates to:
  /// **'Catch Analysis'**
  String get catchAnalysis;

  /// No description provided for @spotMap.
  ///
  /// In en, this message translates to:
  /// **'Fishing Spots'**
  String get spotMap;

  /// No description provided for @addSpot.
  ///
  /// In en, this message translates to:
  /// **'Add Spot'**
  String get addSpot;

  /// No description provided for @addSpotBtn.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addSpotBtn;

  /// No description provided for @nearbySearch.
  ///
  /// In en, this message translates to:
  /// **'Nearby Search'**
  String get nearbySearch;

  /// No description provided for @weatherTitle.
  ///
  /// In en, this message translates to:
  /// **'Weather'**
  String get weatherTitle;

  /// No description provided for @challenges.
  ///
  /// In en, this message translates to:
  /// **'Challenges'**
  String get challenges;

  /// No description provided for @setFishingGoals.
  ///
  /// In en, this message translates to:
  /// **'Set your fishing goals'**
  String get setFishingGoals;

  /// No description provided for @create.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get create;

  /// No description provided for @nDays.
  ///
  /// In en, this message translates to:
  /// **'{count} days'**
  String nDays(int count);

  /// No description provided for @annualReport.
  ///
  /// In en, this message translates to:
  /// **'Annual Report'**
  String get annualReport;

  /// No description provided for @achievementsAndLevel.
  ///
  /// In en, this message translates to:
  /// **'Achievements & Level'**
  String get achievementsAndLevel;

  /// No description provided for @achievementsDesc.
  ///
  /// In en, this message translates to:
  /// **'View your fishing achievements and level'**
  String get achievementsDesc;

  /// No description provided for @challengesDesc.
  ///
  /// In en, this message translates to:
  /// **'Set goals, track progress'**
  String get challengesDesc;

  /// No description provided for @annualReportDesc.
  ///
  /// In en, this message translates to:
  /// **'Your annual fishing summary'**
  String get annualReportDesc;

  /// No description provided for @funHubDesc.
  ///
  /// In en, this message translates to:
  /// **'Fortune, personality test, and more fun'**
  String get funHubDesc;

  /// No description provided for @insuranceDesc.
  ///
  /// In en, this message translates to:
  /// **'Export gear valuation for insurance'**
  String get insuranceDesc;

  /// No description provided for @switchRole.
  ///
  /// In en, this message translates to:
  /// **'Switch Role'**
  String get switchRole;

  /// No description provided for @shareBtn.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get shareBtn;

  /// No description provided for @noMatchingRods.
  ///
  /// In en, this message translates to:
  /// **'No matching rods found'**
  String get noMatchingRods;

  /// No description provided for @noMatchingReels.
  ///
  /// In en, this message translates to:
  /// **'No matching reels found'**
  String get noMatchingReels;

  /// No description provided for @compare.
  ///
  /// In en, this message translates to:
  /// **'Compare'**
  String get compare;

  /// No description provided for @addPriceForValuation.
  ///
  /// In en, this message translates to:
  /// **'Add purchase price & date to see valuation'**
  String get addPriceForValuation;

  /// No description provided for @autoFollowSystem.
  ///
  /// In en, this message translates to:
  /// **'Follow system language'**
  String get autoFollowSystem;
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
