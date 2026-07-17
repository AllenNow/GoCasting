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

  @override
  String get gearDetail => 'Gear Detail';

  @override
  String get notFound => 'Not found';

  @override
  String get status => 'Status';

  @override
  String get purchased => 'Purchased';

  @override
  String get price => 'Price';

  @override
  String get warranty => 'Warranty';

  @override
  String get photos => 'Photos';

  @override
  String get parts => 'Parts';

  @override
  String get service => 'Service';

  @override
  String get maintenanceGuides => 'Maintenance Guides';

  @override
  String get seasonCheck => 'Season Check';

  @override
  String get insurance => 'Insurance';

  @override
  String get logMaintenance => 'Log Maintenance';

  @override
  String get totalCostOwnership => 'Total Cost of Ownership';

  @override
  String get purchasePrice => 'Purchase Price';

  @override
  String get maintenanceCost => 'Maintenance Cost';

  @override
  String get totalTco => 'Total (TCO)';

  @override
  String get estimatedValue => 'Estimated Value';

  @override
  String get valueRetained => 'Value retained';

  @override
  String get original => 'Original';

  @override
  String get depreciation => 'Depreciation';

  @override
  String get lifeLeft => 'Life Left';

  @override
  String get noWarrantyRecorded => 'No warranty recorded';

  @override
  String get tapToAddWarranty => 'Tap to add warranty info';

  @override
  String get warrantyActive => 'Active';

  @override
  String get warrantyExpiringSoon => 'Expiring Soon';

  @override
  String get warrantyExpired => 'Expired';

  @override
  String daysRemaining(int count) {
    return '$count days remaining';
  }

  @override
  String expiredOn(String date) {
    return 'Expired on $date';
  }

  @override
  String get warrantyScreen => 'Warranty';

  @override
  String get warrantyStartDate => 'Warranty Start Date';

  @override
  String get warrantyDuration => 'Warranty Duration (months)';

  @override
  String get providerRetailer => 'Provider / Retailer';

  @override
  String get warrantyTerms => 'Warranty Terms (optional)';

  @override
  String get calculatedExpiry => 'Calculated Expiry';

  @override
  String get saveWarranty => 'Save Warranty';

  @override
  String get updateWarranty => 'Update Warranty';

  @override
  String get deleteWarranty => 'Delete Warranty';

  @override
  String get deleteWarrantyConfirm =>
      'This will remove all warranty information for this item.';

  @override
  String get photosScreen => 'Photos';

  @override
  String get noPhotosYet => 'No photos yet';

  @override
  String get addPhotosDesc =>
      'Add photos of your gear, receipts, or warranty cards';

  @override
  String get addFirstPhoto => 'Add First Photo';

  @override
  String get whatTypePhoto => 'What type of photo?';

  @override
  String get receipt => 'Receipt';

  @override
  String get warrantyCard => 'Warranty Card';

  @override
  String get invoice => 'Invoice';

  @override
  String get gearPhoto => 'Gear Photo';

  @override
  String get takePhoto => 'Take Photo';

  @override
  String get chooseGallery => 'Choose from Gallery';

  @override
  String get photoSaved => 'Photo saved';

  @override
  String get deletePhoto => 'Delete Photo?';

  @override
  String get deletePhotoConfirm => 'This will permanently remove this photo.';

  @override
  String get receiptsDocuments => 'Receipts & Documents';

  @override
  String get gearPhotos => 'Gear Photos';

  @override
  String get logMaintenanceTitle => 'Log Maintenance';

  @override
  String get maintenanceType => 'Maintenance Type';

  @override
  String get date => 'Date';

  @override
  String get costCategory => 'Cost Category';

  @override
  String get selfService => 'Self';

  @override
  String get professional => 'Pro';

  @override
  String get partsReplacement => 'Parts';

  @override
  String get cost => 'Cost';

  @override
  String get serviceProvider => 'Service Provider';

  @override
  String get notes => 'Notes';

  @override
  String get recordMaintenance => 'Record Maintenance';

  @override
  String get tcoAnalysis => 'Cost Analysis';

  @override
  String get costSummary => 'Cost Summary';

  @override
  String get maintenanceRatio => 'Maintenance Ratio';

  @override
  String get totalSessions => 'Total Sessions';

  @override
  String get maintenancePerSession => 'Maintenance / Session';

  @override
  String get costBreakdown => 'Cost Breakdown';

  @override
  String get byCategory => 'By Category';

  @override
  String get maintenanceCostHistory => 'Maintenance Cost History';

  @override
  String get noMaintenanceCosts => 'No maintenance costs recorded yet';

  @override
  String get costsWillAppear =>
      'Costs will appear here when you log maintenance with a cost.';

  @override
  String get componentsScreen => 'Components';

  @override
  String get noComponentsTracked => 'No components tracked';

  @override
  String get addDefaultComponents => 'Add Default Components';

  @override
  String get addComponent => 'Add Component';

  @override
  String get componentName => 'Component Name';

  @override
  String get maintenanceEveryNSessions => 'Maintenance every N sessions';

  @override
  String get maintenanceEveryNDays => 'Maintenance every N days';

  @override
  String get markMaintained => 'Mark Maintained';

  @override
  String get replaceComponent => 'Replace';

  @override
  String get deleteComponent => 'Delete';

  @override
  String replaceComponentTitle(String name) {
    return 'Replace $name?';
  }

  @override
  String get replaceComponentDesc =>
      'This will mark the current component as replaced and create a new one.';

  @override
  String get replacementCost => 'Replacement Cost';

  @override
  String get neverMaintained => 'Never maintained';

  @override
  String lastMaintenance(String date) {
    return 'Last: $date';
  }

  @override
  String everyNDays(int count) {
    return 'Every $count days';
  }

  @override
  String get tutorialsScreen => 'Maintenance Guides';

  @override
  String get allTypes => 'All';

  @override
  String get cleaning => 'Cleaning';

  @override
  String get lubrication => 'Lubrication';

  @override
  String get inspection => 'Inspection';

  @override
  String get replacement => 'Replacement';

  @override
  String get toolsNeeded => 'Tools Needed';

  @override
  String get steps => 'Steps';

  @override
  String get difficulty => 'Difficulty';

  @override
  String get beginner => 'Beginner';

  @override
  String get intermediate => 'Intermediate';

  @override
  String get advanced => 'Advanced';

  @override
  String minutes(int count) {
    return '$count min';
  }

  @override
  String nSteps(int count) {
    return '$count steps';
  }

  @override
  String get serviceRecordsScreen => 'Service';

  @override
  String get noServiceRecords => 'No service records';

  @override
  String get trackProfessionalRepairs =>
      'Track professional repairs and servicing here.';

  @override
  String get sendForService => 'Send for Service';

  @override
  String get serviceProviderLabel => 'Service Provider *';

  @override
  String get dateSent => 'Date Sent';

  @override
  String get estimatedReturn => 'Estimated Return (optional)';

  @override
  String get notSet => 'Not set';

  @override
  String get statusSent => 'Sent';

  @override
  String get statusInRepair => 'In Repair';

  @override
  String get statusReturned => 'Returned';

  @override
  String get markInRepair => 'Mark In Repair';

  @override
  String get markReturned => 'Mark Returned';

  @override
  String get serviceCost => 'Service Cost';

  @override
  String get gearReturned => 'Gear returned! Welcome back.';

  @override
  String get statusUpdated => 'Status updated';

  @override
  String get preseasonChecklist => 'Season Check';

  @override
  String itemsCompleted(int done, int total) {
    return '$done / $total items completed';
  }

  @override
  String get criticalChecks => 'Critical Checks';

  @override
  String get normalChecks => 'Normal Checks';

  @override
  String get optionalChecks => 'Optional Checks';

  @override
  String get allChecksComplete => 'All Checks Complete! Ready for Season';

  @override
  String get seasonReady => 'Season Ready!';

  @override
  String passedAllChecks(String name) {
    return '$name has passed all pre-season checks.';
  }

  @override
  String get insuranceReport => 'Insurance Report';

  @override
  String get exportCsv => 'Export CSV';

  @override
  String get noActiveGear => 'No active gear';

  @override
  String get addGearForReport =>
      'Add gear to your inventory to generate an insurance report.';

  @override
  String get exportAsCsv => 'Export as CSV';

  @override
  String get copyToClipboard => 'Copy to Clipboard';

  @override
  String get insuranceSummary => 'Insurance Summary';

  @override
  String get totalItems => 'Total Items';

  @override
  String get originalValue => 'Original Value';

  @override
  String get currentValue => 'Current Value';

  @override
  String get reportDate => 'Report Date';

  @override
  String get reportExported => 'Report Exported';

  @override
  String get copied => 'Copied';

  @override
  String get reportCopied => 'Report copied to clipboard';

  @override
  String get calculatorsScreen => 'Gear Calculators';

  @override
  String get dragSetting => 'Drag Setting';

  @override
  String get dragSettingDesc =>
      'Calculate optimal drag based on line strength and knot type';

  @override
  String get lineCapacity => 'Line Capacity';

  @override
  String get lineCapacityDesc =>
      'How much line fits on your reel + backing calculation';

  @override
  String get shockLeader => 'Shock Leader';

  @override
  String get shockLeaderDesc =>
      'Required lb test and length for casting heavy sinkers';

  @override
  String get sinkerWeight => 'Sinker Weight';

  @override
  String get sinkerWeightDesc =>
      'Recommended weight based on current, waves, and distance';

  @override
  String get lineTest => 'Line Test (lb)';

  @override
  String get knotRetention => 'Knot Retention';

  @override
  String get fishingStyle => 'Fishing Style';

  @override
  String get result => 'Result';

  @override
  String get effectiveLineStrength => 'Effective line strength';

  @override
  String get dragPercentage => 'Drag percentage';

  @override
  String get safeRange => 'Safe range';

  @override
  String get reelSpecs => 'Reel Specs';

  @override
  String get ratedCapacity => 'Rated Capacity (yds)';

  @override
  String get atDiameter => 'At Diameter (mm)';

  @override
  String get targetLine => 'Target Line';

  @override
  String get targetLineDiameter => 'Target Line Diameter (mm)';

  @override
  String get backingOptional => 'Backing (optional)';

  @override
  String get mainLine => 'Main Line (yds)';

  @override
  String get backingDia => 'Backing Dia (mm)';

  @override
  String get capacityWithTargetLine => 'Capacity with target line';

  @override
  String get backingCalculation => 'Backing Calculation';

  @override
  String get backingNeeded => 'Backing needed';

  @override
  String get sinkerWeightOz => 'Sinker Weight (oz)';

  @override
  String get rodLength => 'Rod Length (ft)';

  @override
  String get extraWraps => 'Extra wraps on spool';

  @override
  String get shockLeaderSpecs => 'Shock Leader Specs';

  @override
  String get range => 'Range';

  @override
  String get length => 'Length';

  @override
  String get approxDiameter => 'Approx. diameter';

  @override
  String get current => 'Current';

  @override
  String get waves => 'Waves';

  @override
  String get targetDistance => 'Target Distance';

  @override
  String get bottomType => 'Bottom Type';

  @override
  String get recommendedSinker => 'Recommended Sinker';

  @override
  String get type => 'Type';

  @override
  String get knotsRigsScreen => 'Knots & Rigs Guide';

  @override
  String get knots => 'Knots';

  @override
  String get rigs => 'Rigs';

  @override
  String get all => 'All';

  @override
  String get terminal => 'Terminal';

  @override
  String get lineToLine => 'Line-to-Line';

  @override
  String get loop => 'Loop';

  @override
  String get strength => 'strength';

  @override
  String get bestFor => 'Best for';

  @override
  String get assembly => 'Assembly';

  @override
  String get components => 'Components';

  @override
  String get targetSpecies => 'Target Species';

  @override
  String get speciesGuide => 'Species Guide';

  @override
  String get searchSpecies => 'Search species...';

  @override
  String get gamefish => 'Gamefish';

  @override
  String get panfish => 'Panfish';

  @override
  String get shark => 'Shark';

  @override
  String get identification => 'Identification';

  @override
  String get habitatBehavior => 'Habitat & Behavior';

  @override
  String get gearRecommendation => 'Gear Recommendation';

  @override
  String get bestBait => 'Best Bait';

  @override
  String get seasonalPattern => 'Seasonal Pattern';

  @override
  String get size => 'Size';

  @override
  String get common => 'Common';

  @override
  String get trophy => 'Trophy';

  @override
  String get regulations => 'Regulations';

  @override
  String configureGearFor(String species) {
    return 'Configure Gear for $species';
  }

  @override
  String get wishlistScreen => 'Gear Wishlist';

  @override
  String get wishlistEmpty => 'Your wishlist is empty';

  @override
  String get planUpgrades => 'Plan your next gear upgrades here';

  @override
  String get addFirstItem => 'Add First Item';

  @override
  String get addToWishlist => 'Add to Wishlist';

  @override
  String get itemName => 'Item Name';

  @override
  String get estimatedPrice => 'Est. Price';

  @override
  String get category => 'Category';

  @override
  String get priority => 'Priority';

  @override
  String get high => 'High';

  @override
  String get medium => 'Medium';

  @override
  String get low => 'Low';

  @override
  String get totalPlanned => 'Total Planned';

  @override
  String itemsOnWishlist(int count) {
    return '$count items on wishlist';
  }

  @override
  String get highPriority => 'High Priority';

  @override
  String get mediumPriority => 'Medium Priority';

  @override
  String get lowPriority => 'Low Priority';

  @override
  String get goScore => 'Go-Score';

  @override
  String get bestWindow => 'Best Window';

  @override
  String get hourlyScore => 'Hourly Score';

  @override
  String get scoreFactors => 'Score Factors';

  @override
  String get excellent => 'Excellent';

  @override
  String get good => 'Good';

  @override
  String get fair => 'Fair';

  @override
  String get poor => 'Poor';

  @override
  String get veryPoor => 'Very Poor';

  @override
  String get solunar => 'Solunar';

  @override
  String get moonPhase => 'Moon Phase';

  @override
  String get light => 'Light';

  @override
  String get tripChecklist => 'Trip Checklist';

  @override
  String packed(int done, int total) {
    return '$done / $total packed';
  }

  @override
  String get allPackedGoFish => 'All Packed — Go Fish!';

  @override
  String get general => 'General';

  @override
  String get nightFishing => 'Night';

  @override
  String get longCast => 'Long Cast';

  @override
  String get sharks => 'Sharks';

  @override
  String get lightTackle => 'Light Tackle';

  @override
  String get castTracker => 'Cast Tracker';

  @override
  String get trackCastingDistance => 'Track Your Casting Distance';

  @override
  String get recordDistanceProgress =>
      'Record distances to measure your progress over time';

  @override
  String get startFirstSession => 'Start First Session';

  @override
  String get newSession => 'New Session';

  @override
  String get yourStats => 'Your Stats';

  @override
  String get personalBest => 'Personal Best';

  @override
  String get average => 'Average';

  @override
  String get recentAvg => 'Recent Avg';

  @override
  String get sessions => 'Sessions';

  @override
  String get totalCasts => 'Total Casts';

  @override
  String get improvement => 'Improvement';

  @override
  String get bestSetup => 'Best setup';

  @override
  String get bestDistanceTrend => 'Best Distance Trend';

  @override
  String get newCastingSession => 'New Casting Session';

  @override
  String get location => 'Location';

  @override
  String get gearSetup => 'Gear Setup';

  @override
  String get casts => 'Casts';

  @override
  String get best => 'Best';

  @override
  String get recordCast => 'Record Cast';

  @override
  String get distance => 'Distance (meters)';

  @override
  String get wind => 'Wind';

  @override
  String get record => 'Record';

  @override
  String get save => 'Save';

  @override
  String get sessionSummary => 'Session Summary';

  @override
  String get allCasts => 'All Casts';

  @override
  String get catchLog => 'Catch Log';

  @override
  String get log => 'Log';

  @override
  String get stats => 'Stats';

  @override
  String get noCatchesYet => 'No catches yet';

  @override
  String get recordFirstCatch => 'Record your first catch with the + button';

  @override
  String get logCatch => 'Log Catch';

  @override
  String get species => 'Species';

  @override
  String get weight => 'Weight';

  @override
  String get lengthLabel => 'Length';

  @override
  String get bait => 'Bait';

  @override
  String get rigType => 'Rig Type';

  @override
  String get tideState => 'Tide State';

  @override
  String get rising => 'Rising';

  @override
  String get falling => 'Falling';

  @override
  String get highTide => 'High';

  @override
  String get lowTide => 'Low';

  @override
  String get slack => 'Slack';

  @override
  String get released => 'Released';

  @override
  String get kept => 'Kept';

  @override
  String get releasedSafely => 'Fish was released safely';

  @override
  String get fishKept => 'Fish was kept';

  @override
  String get saveCatch => 'Save Catch';

  @override
  String get totalCatches => 'Total Catches';

  @override
  String get biggest => 'Biggest';

  @override
  String get speciesCaught => 'Species Caught';

  @override
  String get bestBaitStats => 'Best Bait';

  @override
  String get deleteCatch => 'Delete Catch?';

  @override
  String removeCatchConfirm(String species, String date) {
    return 'Remove $species caught on $date?';
  }

  @override
  String get recordCatchesToSeeStats => 'Record catches to see statistics';

  @override
  String get backupRestore => 'Backup & Restore';

  @override
  String get dataOverview => 'Data Overview';

  @override
  String get createBackup => 'Create Backup';

  @override
  String get selectDataToBackup =>
      'Select which data to include in the backup:';

  @override
  String get selectAll => 'Select All';

  @override
  String get clearAll => 'Clear All';

  @override
  String get createShareBackup => 'Create & Share Backup';

  @override
  String get restoreFromBackup => 'Restore from Backup';

  @override
  String get selectBackupFile => 'Select Backup File (.gcbak)';

  @override
  String get selectBackupFileDesc =>
      'Select a .gcbak backup file to restore your data.';

  @override
  String get howItWorks => 'How it works';

  @override
  String get backupInfo1 =>
      'Backup creates a .gcbak file containing your selected data';

  @override
  String get backupInfo2 =>
      'Use the system share sheet to save to iCloud, Google Drive, or Files';

  @override
  String get backupInfo3 =>
      'Restore replaces current data with the backup — this cannot be undone';

  @override
  String get backupInfo4 =>
      'After restore, restart the app for changes to take effect';

  @override
  String get backupInfo5 => 'Backups are fully offline — no internet needed';

  @override
  String get backupCreated => 'Backup Created!';

  @override
  String get backupReady => 'Your backup is ready to share.';

  @override
  String get modules => 'Modules';

  @override
  String get share => 'Share';

  @override
  String get close => 'Close';

  @override
  String get backupFailed => 'Backup Failed';

  @override
  String get restoreBackup => 'Restore Backup?';

  @override
  String get restoreWarning =>
      'This will replace your current data with the backup.';

  @override
  String get cannotBeUndone =>
      'This action cannot be undone. Restart the app after restore.';

  @override
  String get restore => 'Restore';

  @override
  String get restoreComplete => 'Restore Complete!';

  @override
  String get restoreSuccess =>
      'Data has been restored successfully.\n\nPlease restart the app for all changes to take effect.';

  @override
  String get restoreFailed => 'Restore Failed';

  @override
  String get invalidBackupFile =>
      'This does not appear to be a valid GoCasting backup';

  @override
  String get gearInventory => 'Gear Inventory';

  @override
  String get usageLogs => 'Usage Logs';

  @override
  String get maintenanceRecords => 'Maintenance Records';

  @override
  String get warranties => 'Warranties';

  @override
  String get serviceRecords => 'Service Records';

  @override
  String get photosReceipts => 'Photos & Receipts';

  @override
  String get settingsBeaches => 'Settings & Beaches';

  @override
  String get dataReports => 'Data & Reports';

  @override
  String get cancel => 'Cancel';

  @override
  String get delete => 'Delete';

  @override
  String get confirm => 'Confirm';

  @override
  String get done => 'Done';

  @override
  String get ok => 'OK';

  @override
  String get error => 'Error';

  @override
  String get success => 'Success';

  @override
  String get loading => 'Loading...';

  @override
  String get comingSoon => 'Coming Soon';

  @override
  String get funHub => 'Fun Zone';

  @override
  String get dailyFortune => 'Daily Fishing Fortune';

  @override
  String get personalityTest => 'Fishing Personality Test';

  @override
  String get shareFortune => 'Share Fortune';

  @override
  String get sharePersonality => 'Share My Fishing Personality';

  @override
  String get retakeTest => 'Retake Test';

  @override
  String get moreFun => 'More Fun';

  @override
  String get shareHeatmap => 'Share Heatmap';

  @override
  String get shareProfileCard => 'Share Card';

  @override
  String get shareFunStats => 'Share Fun Stats';

  @override
  String get shareAnnualReport => 'Share My Annual Report';

  @override
  String get achievements => 'Achievements';

  @override
  String get catchAnalysis => 'Catch Analysis';

  @override
  String get spotMap => 'Fishing Spots';

  @override
  String get addSpot => 'Add Spot';

  @override
  String get addSpotBtn => 'Add';

  @override
  String get nearbySearch => 'Nearby Search';

  @override
  String get weatherTitle => 'Weather';

  @override
  String get challenges => 'Challenges';

  @override
  String get setFishingGoals => 'Set your fishing goals';

  @override
  String get create => 'Create';

  @override
  String nDays(int count) {
    return '$count days';
  }

  @override
  String get annualReport => 'Annual Report';

  @override
  String get achievementsAndLevel => 'Achievements & Level';

  @override
  String get achievementsDesc => 'View your fishing achievements and level';

  @override
  String get challengesDesc => 'Set goals, track progress';

  @override
  String get annualReportDesc => 'Your annual fishing summary';

  @override
  String get funHubDesc => 'Fortune, personality test, and more fun';

  @override
  String get insuranceDesc => 'Export gear valuation for insurance';

  @override
  String get switchRole => 'Switch Role';

  @override
  String get shareBtn => 'Share';

  @override
  String get noMatchingRods => 'No matching rods found';

  @override
  String get noMatchingReels => 'No matching reels found';

  @override
  String get compare => 'Compare';

  @override
  String get addPriceForValuation =>
      'Add purchase price & date to see valuation';

  @override
  String get autoFollowSystem => 'Follow system language';
}
