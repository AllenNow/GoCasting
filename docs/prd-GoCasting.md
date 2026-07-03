---
title: "GoCasting PRD"
status: final
created: 2026-07-03
updated: 2026-07-03
---

# PRD: GoCasting — Surf Casting Equipment & Tide Tool

## 1. Overview

GoCasting is a fully offline, free utility app for surf casting anglers built in Flutter (iOS + Android). It provides three core tools: an equipment configuration wizard, a gear maintenance tracker, and a tide/moon/solunar session planner. All data is bundled on-device with no network dependency.

**Target:** English-speaking surf casters globally.  
**Platform:** iOS & Android (Flutter).  
**Monetization:** None in V1. Free utility.  
**Network:** Zero. Fully offline.

---

## 2. Functional Requirements

### 2.1 Gear Intelligence Engine

**FR-1** Gear Configuration Wizard  
The app shall provide a step-by-step wizard that asks the user:
- Target species (from predefined list: striped bass, redfish, bluefish, sharks, etc.)
- Beach/surf conditions (open beach, jetty, inlet, rocky shore)
- Casting distance goal (short <50m, medium 50-100m, long 100m+)
- Budget range (entry $50-150, mid $150-400, premium $400+)

Based on inputs, the wizard outputs a complete recommended setup:
- Rod (length, power, action, material)
- Reel (size, drag rating, gear ratio, saltwater rating)
- Main line (type, lb test, diameter)
- Leader (material, lb test, length)
- Rig type (fish finder, hi-lo, Carolina, etc.)
- Sinker (type, weight range)
- Hook (style, size range)
- Bait recommendations

**FR-2** Gear Compatibility Check  
The app shall validate user-selected gear combinations and flag incompatibilities:
- Rod power vs reel size mismatch
- Line weight exceeding rod rating
- Reel line capacity insufficient for selected line
- Sinker weight exceeding rod casting weight

**FR-3** Gear Comparison  
The app shall allow side-by-side comparison of up to 3 items from the gear database with surf-casting-specific criteria:
- Corrosion resistance rating
- Casting distance performance
- Weight
- Drag system (sealed vs open)
- Price tier

**FR-4** Gear Database  
The app shall include a bundled SQLite database containing:
- Rods: brand, model, length, power, action, material, casting weight, line rating, price tier, corrosion rating
- Reels: brand, model, size, gear ratio, max drag, line capacity, weight, seal type, price tier
- Lines: brand, type (mono/braid/fluoro), lb test, diameter, color, price tier
- Terminal tackle: hooks, sinkers, swivels, leaders by type and size
- Minimum 200+ rods, 150+ reels, 100+ lines at launch

Database updates delivered exclusively via App Store version releases.

---

### 2.2 Maintenance Tracker

**FR-5** Gear Inventory  
The app shall allow users to:
- Add gear items to personal inventory (manual entry or select from gear database)
- Record purchase date and price paid
- Assign a photo (from camera or gallery)
- Mark items as active, stored, or retired

**FR-6** Usage Logging  
The app shall allow users to log sessions against gear items:
- Date of use
- Environment (saltwater / brackish / rinse-only day)
- Duration (optional)
- One-tap "used today" quick-log

**FR-7** Maintenance Scheduling  
The app shall generate maintenance reminders based on:
- Usage count since last maintenance
- Days since last maintenance
- Gear type-specific schedules:
  - Spinning reel: full service every 15 saltwater sessions or 90 days
  - Rod guides: inspection every 30 sessions
  - Drag washers: grease every 10 sessions
  - Line replacement: every 6 months or 50 sessions
- Schedules stored in local rules engine, configurable per item

**FR-8** Maintenance Notifications  
The app shall send local push notifications when maintenance is due:
- "Your [Reel Name] has 12 saltwater sessions since last service — time to rinse and re-grease"
- Notifications scheduled locally, no server required
- User can snooze (7 days) or mark complete

**FR-9** Lifespan Tracking  
The app shall display:
- Total sessions logged per item
- Estimated remaining lifespan (based on typical lifespan for gear type)
- Maintenance history log
- Cost-per-session calculation

---

### 2.3 Session Planner

**FR-10** Tide Predictions  
The app shall compute tide predictions offline using:
- NOAA harmonic constants for tide stations (bundled)
- Standard harmonic tide prediction algorithm
- Display: tide height graph (24h and 7-day views), high/low times, tide state (rising/falling/slack)
- Accuracy: within 15 minutes and 0.3m of published predictions for primary stations

**FR-11** Moon Phase & Solunar  
The app shall compute and display:
- Current moon phase with illumination percentage
- Moon rise/set times
- Solunar major and minor feeding periods
- All computed from astronomical algorithms (Jean Meeus method or equivalent)
- No network required

**FR-12** Sunrise/Sunset  
The app shall compute and display:
- Sunrise, sunset, and twilight times for the selected location
- Computed from standard solar position algorithms
- Golden hour indicators (first/last light)

**FR-13** Beach Database  
The app shall include a pre-loaded database of popular surf casting beaches:
- Minimum 500 beaches at launch covering: US East Coast, US West Coast, Gulf Coast, UK, Australia, New Zealand, South Africa
- Each entry: name, coordinates, nearest tide station, beach type (sandy/rocky/jetty), typical target species
- User can add custom locations by dropping a pin on a map (offline map tiles or coordinate entry)

**FR-14** Session Dashboard  
The app shall present a unified view for a selected beach and date showing:
- Tide graph with current position highlighted
- Moon phase icon and solunar periods overlaid
- Sunrise/sunset markers
- "Best windows" highlighted (solunar major periods during tide transitions)

---

### 2.4 General / Cross-Cutting

**FR-15** Onboarding  
The app shall provide a 3-screen onboarding flow on first launch:
1. "Configure your perfect setup" — entry to Gear Wizard
2. "Track your gear health" — entry to add first item
3. "Plan your next session" — entry to Session Planner

User can skip onboarding entirely.

**FR-16** Data Persistence  
All user data (inventory, usage logs, maintenance records, custom beaches) stored in local SQLite database on device. No cloud sync in V1.

**FR-17** Data Export  
The app shall allow export of gear inventory and maintenance logs as CSV file via system share sheet.

**FR-18** Units  
The app shall support:
- Metric (meters, kg, cm) and Imperial (feet, lbs, inches) unit systems
- User selects preference in settings; persists across sessions

---

## 3. Non-Functional Requirements

**NFR-1** Offline-First Architecture  
The app shall function with zero network connectivity. No feature shall require internet access. No network calls shall be made under any circumstance.

**NFR-2** Performance  
- App cold start: < 3 seconds on mid-range device (2022+ iPhone SE / Galaxy A53 class)
- Gear wizard recommendation: < 1 second
- Tide computation for 7-day view: < 500ms
- Database query (gear search/filter): < 200ms

**NFR-3** Storage  
- App bundle size (including all databases): target < 100MB
- User data growth: negligible (text-only logs)

**NFR-4** Platform Support  
- iOS 15.0+
- Android 8.0+ (API 26)
- Flutter 3.x stable channel

**NFR-5** Accessibility  
- VoiceOver (iOS) and TalkBack (Android) support for all screens
- Minimum touch target 44x44pt
- Dynamic text sizing support
- Sufficient color contrast (WCAG AA)

**NFR-6** Localization  
- V1: English only
- Architecture shall support future localization (string externalization)

**NFR-7** Data Integrity  
- Local database shall be resilient to app crashes (WAL mode SQLite)
- Gear database shall be read-only (app bundle); user data in separate writable DB

---

## 4. Technical Constraints

| Constraint | Detail |
|-----------|--------|
| Framework | Flutter (Dart) |
| Local DB | SQLite via drift or sqflite package |
| Tide Algorithm | Harmonic analysis (T_TIDE port or custom Dart implementation) |
| Astronomical | Jean Meeus algorithms for moon/sun position |
| Map (custom pins) | Offline-capable — coordinate input or bundled lightweight tile set |
| Notifications | flutter_local_notifications (no FCM, no server) |
| State Management | [ASSUMPTION] Riverpod or Bloc — to be decided in architecture |
| No network permissions | App shall not request network permission on either platform |

---

## 5. Out of Scope (V1)

- Any network connectivity or API calls
- Real-time weather, wind, or swell data
- Social/community features
- Catch logging or fish diary
- Monetization (subscription, ads, IAP, affiliate)
- Cloud sync or backup
- Hardware integrations
- Multi-language support
- AI/ML features

---

## 6. Open Questions

1. **Offline map for custom pin:** Use bundled lightweight world map tiles (increases app size ~30-50MB) or simple coordinate entry with no visual map? Trade-off: UX vs bundle size.
2. **Tide station coverage:** NOAA covers US coasts. For UK/Australia/NZ/South Africa, need equivalent harmonic data sources (UKHO, BOM, LINZ). Licensing status to be confirmed.
3. **State management:** Riverpod vs Bloc — decide during architecture phase.
4. **Gear database initial seeding:** Manual curation vs scraping public sources. Effort estimate needed.

---

## 7. Future Considerations (Post-V1)

- Pro subscription with expanded gear database and advanced features
- Real-time weather/swell integration (requires network permission)
- Affiliate links to gear retailers
- Catch logging with condition correlation
- Cloud backup/sync
- Asia-Pacific localization
- Hardware partnerships (smart rods, casting distance sensors)
