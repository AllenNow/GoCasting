---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - "_bmad-output/planning-artifacts/prds/prd-GoCasting-2026-07-03/prd.md"
  - "_bmad-output/planning-artifacts/architecture/arch-GoCasting-2026-07-03/ARCHITECTURE-SPINE.md"
---

# GoCasting - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for GoCasting, decomposing the PRD (18 FRs, 7 NFRs) and Architecture decisions into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR-1: Gear Configuration Wizard
- FR-2: Gear Compatibility Check
- FR-3: Gear Comparison
- FR-4: Gear Database (bundled SQLite, 200+ rods, 150+ reels, 100+ lines)
- FR-5: Gear Inventory (user gear management)
- FR-6: Usage Logging (session tracking per gear)
- FR-7: Maintenance Scheduling (rules engine)
- FR-8: Maintenance Notifications (local push)
- FR-9: Lifespan Tracking (cost-per-session, remaining life)
- FR-10: Tide Predictions (NOAA harmonic, offline)
- FR-11: Moon Phase & Solunar (astronomical algorithms)
- FR-12: Sunrise/Sunset (solar position algorithms)
- FR-13: Beach Database (500+ pre-loaded beaches)
- FR-14: Session Dashboard (unified tide/moon/sun view)
- FR-15: Onboarding (3-screen intro flow)
- FR-16: Data Persistence (local SQLite, WAL mode)
- FR-17: Data Export (CSV via share sheet)
- FR-18: Units (metric/imperial toggle)

### NonFunctional Requirements

- NFR-1: Offline-First (zero network, no permissions)
- NFR-2: Performance (cold start <3s, queries <200ms)
- NFR-3: Storage (<100MB bundle)
- NFR-4: Platform (iOS 15+, Android 8+, Flutter 3.x)
- NFR-5: Accessibility (VoiceOver, TalkBack, WCAG AA)
- NFR-6: Localization (English V1, architecture supports i18n)
- NFR-7: Data Integrity (WAL mode, dual DB separation)

### Additional Requirements

- Dual SQLite: read-only reference.db (app bundle) + writable user.db (documents)
- Riverpod 2.x state management with code generation
- Drift ORM for type-safe database access
- GoRouter for navigation
- flutter_local_notifications for maintenance reminders
- Pure Dart astronomy (no platform plugins)
- No INTERNET permission in manifests
- CI/CD: GitHub Actions lint → test → build

### UX Design Requirements

N/A — No UX design document. Tool-first minimal UI.

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-1 | Epic 2 | Gear Configuration Wizard |
| FR-2 | Epic 2 | Gear Compatibility Check |
| FR-3 | Epic 2 | Gear Comparison |
| FR-4 | Epic 1 | Gear Database (reference DB) |
| FR-5 | Epic 3 | Gear Inventory |
| FR-6 | Epic 3 | Usage Logging |
| FR-7 | Epic 3 | Maintenance Scheduling |
| FR-8 | Epic 3 | Maintenance Notifications |
| FR-9 | Epic 3 | Lifespan Tracking |
| FR-10 | Epic 4 | Tide Predictions |
| FR-11 | Epic 4 | Moon Phase & Solunar |
| FR-12 | Epic 4 | Sunrise/Sunset |
| FR-13 | Epic 1 | Beach Database |
| FR-14 | Epic 4 | Session Dashboard |
| FR-15 | Epic 1 | Onboarding |
| FR-16 | Epic 1 | Data Persistence |
| FR-17 | Epic 3 | Data Export |
| FR-18 | Epic 1 | Units |

## Epic List

### Epic 1: Project Foundation & Data Layer
Users can install the app, complete onboarding, set preferences, and access pre-loaded reference data (gear catalog, beaches, tide stations).
**FRs covered:** FR-4, FR-13, FR-15, FR-16, FR-18

### Epic 2: Gear Intelligence Engine
Users can get personalized equipment recommendations, check gear compatibility, and compare products — solving the "what should I buy?" problem.
**FRs covered:** FR-1, FR-2, FR-3

### Epic 3: Gear Maintenance Tracker
Users can manage their gear inventory, log usage sessions, receive maintenance reminders, and track gear lifespan — solving the "my gear keeps corroding" problem.
**FRs covered:** FR-5, FR-6, FR-7, FR-8, FR-9, FR-17

### Epic 4: Session Planner
Users can view tide predictions, moon phases, solunar periods, and sunrise/sunset for any beach — solving the "when should I go?" problem.
**FRs covered:** FR-10, FR-11, FR-12, FR-14

---

## Epic 1: Project Foundation & Data Layer

Users can install the app, complete onboarding, select unit preferences, and browse pre-loaded reference data that powers all other features.

### Story 1.1: Flutter Project Scaffold & Navigation

As a developer,
I want a properly configured Flutter project with routing and state management,
So that all future features have a solid foundation to build upon.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `flutter run`
**Then** the app launches with a bottom navigation bar (3 tabs: Gear, Maintenance, Planner)
**And** GoRouter handles navigation between tabs
**And** Riverpod ProviderScope wraps the app
**And** Material 3 theme is applied
**And** No INTERNET permission exists in AndroidManifest.xml or Info.plist
**And** iOS deployment target is 15.0, Android minSdk is 26

### Story 1.2: Dual SQLite Database Setup

As a developer,
I want the dual database architecture established with Drift,
So that reference data is read-only and user data is safely writable.

**Acceptance Criteria:**

**Given** the app starts for the first time
**When** the database initialization completes
**Then** reference.db is loaded from app assets (read-only)
**And** user.db is created in the app documents directory (writable, WAL mode)
**And** Drift DAOs are generated for both databases
**And** reference.db contains empty schema for: rods, reels, lines, terminal_tackle, tide_stations, beaches
**And** user.db contains empty schema for: user_gear, usage_logs, maintenance_logs, custom_beaches, user_settings
**And** queries against reference.db complete in <200ms

### Story 1.3: Gear Reference Database Seeding

As a surf caster,
I want a pre-loaded database of popular surf casting equipment,
So that I can browse and get recommendations from real products.

**Acceptance Criteria:**

**Given** the app is installed
**When** I open the gear section
**Then** at least 200 rods are available with: brand, model, length, power, action, material, cast weight range, line rating, price tier, corrosion rating
**And** at least 150 reels are available with: brand, model, size, gear ratio, max drag, line capacity, weight, seal type, price tier
**And** at least 100 lines are available with: brand, type, lb test, diameter, price tier
**And** terminal tackle (hooks, sinkers, swivels, leaders) are seeded by type and size
**And** data covers brands: Penn, Shimano, Daiwa, St. Croix, and others
**And** app bundle size remains under 100MB total

### Story 1.4: Beach & Tide Station Database Seeding

As a surf caster,
I want a pre-loaded database of popular surf casting beaches linked to tide stations,
So that I can quickly find my local beach and view tide data.

**Acceptance Criteria:**

**Given** the app is installed
**When** I open the planner section
**Then** at least 500 beaches are available covering: US East Coast, US West Coast, Gulf Coast, UK, Australia, New Zealand, South Africa
**And** each beach has: name, region, coordinates, nearest tide station ID, beach type, typical species
**And** NOAA harmonic constants are bundled for all referenced US tide stations
**And** tide stations include: name, coordinates, harmonic constants (JSON)
**And** beaches are searchable by name and region

### Story 1.5: Settings & Unit System

As a surf caster,
I want to choose between metric and imperial units,
So that measurements display in the system I'm familiar with.

**Acceptance Criteria:**

**Given** I open the Settings screen
**When** I toggle between Metric and Imperial
**Then** the preference is persisted in user.db
**And** all measurements throughout the app respect the chosen unit system
**And** rod lengths display in feet (imperial) or meters (metric)
**And** weights display in oz/lbs (imperial) or grams/kg (metric)
**And** distances display in yards (imperial) or meters (metric)
**And** the setting persists across app restarts

### Story 1.6: Onboarding Flow

As a new user,
I want a brief introduction to the app's three core features,
So that I know what GoCasting can do for me and where to start.

**Acceptance Criteria:**

**Given** I launch the app for the first time
**When** the onboarding screens appear
**Then** Screen 1 shows "Configure your perfect setup" with entry to Gear Wizard
**And** Screen 2 shows "Track your gear health" with entry to add first item
**And** Screen 3 shows "Plan your next session" with entry to Session Planner
**And** a "Skip" button is visible on all screens
**And** after completing or skipping, onboarding does not show again
**And** the completion state is persisted in user_settings

---

## Epic 2: Gear Intelligence Engine

Users can get personalized equipment setup recommendations, validate gear compatibility, and compare products side-by-side.

### Story 2.1: Gear Configuration Wizard UI

As a surf caster,
I want to answer a few questions about my fishing goals,
So that I receive a complete recommended equipment setup.

**Acceptance Criteria:**

**Given** I tap "Configure Setup" from the Gear tab
**When** the wizard launches
**Then** I see Step 1: Target species (multi-select from predefined list: striped bass, redfish, bluefish, sharks, etc.)
**And** Step 2: Beach/surf conditions (open beach, jetty, inlet, rocky shore)
**And** Step 3: Casting distance goal (short <50m, medium 50-100m, long 100m+)
**And** Step 4: Budget range (entry $50-150, mid $150-400, premium $400+)
**And** I can go back to previous steps
**And** a progress indicator shows current step

### Story 2.2: Recommendation Engine

As a surf caster,
I want the wizard to produce a complete gear setup based on my inputs,
So that I know exactly what rod, reel, line, leader, rig, sinker, hook, and bait to use.

**Acceptance Criteria:**

**Given** I have completed all wizard steps
**When** I tap "Get Recommendations"
**Then** the engine returns a complete setup within 1 second including:
- Rod: top 3 candidates with length, power, action, material
- Reel: top 3 candidates matched to rod power/size
- Main line: type, lb test recommendation
- Leader: material and lb test
- Rig type: recommended rig for species + conditions
- Sinker: type and weight range for conditions
- Hook: style and size range for species
- Bait: recommended options for species
**And** all recommended items exist in the reference database
**And** recommendations respect the user's budget filter
**And** the engine uses rule-based matching (species → power range, conditions → sinker weight → cast weight, budget → price tier)

### Story 2.3: Gear Compatibility Check

As a surf caster,
I want to validate whether my chosen gear combination works together,
So that I avoid mismatched setups that waste money or limit performance.

**Acceptance Criteria:**

**Given** I have selected or am viewing a gear combination (rod + reel + line)
**When** the compatibility check runs
**Then** it flags: rod power vs reel size mismatch
**And** flags: line weight exceeding rod line rating
**And** flags: reel line capacity insufficient for selected line diameter/length
**And** flags: sinker weight exceeding rod casting weight range
**And** displays green checkmark for compatible, red warning for incompatible
**And** each flag includes a brief explanation of why it's incompatible

### Story 2.4: Gear Comparison View

As a surf caster,
I want to compare up to 3 gear items side-by-side,
So that I can make informed purchase decisions.

**Acceptance Criteria:**

**Given** I am browsing the gear database
**When** I select 2-3 items of the same category (e.g., 3 reels)
**Then** a comparison table shows them side-by-side with columns for:
- Corrosion resistance rating
- Casting distance performance (for rods)
- Weight
- Drag system type (sealed vs open, for reels)
- Price tier
- Key specs (size, gear ratio, max drag, etc.)
**And** differences are visually highlighted
**And** I can dismiss or swap items in the comparison

---

## Epic 3: Gear Maintenance Tracker

Users can manage their personal gear collection, log usage sessions, receive timely maintenance reminders, and understand gear health and cost.

### Story 3.1: Gear Inventory Management

As a surf caster,
I want to add my gear to a personal inventory,
So that I can track what I own and its condition.

**Acceptance Criteria:**

**Given** I am on the Maintenance tab
**When** I tap "Add Gear"
**Then** I can choose from the reference database or enter manually
**And** I can set: custom name, purchase date, price paid, status (active/stored/retired)
**And** I can attach a photo from camera or gallery
**And** the item is saved to user.db
**And** I can view my full inventory list with status indicators
**And** I can edit or delete any inventory item

### Story 3.2: Usage Session Logging

As a surf caster,
I want to log when I use my gear in saltwater,
So that the app knows when maintenance is due.

**Acceptance Criteria:**

**Given** I have gear in my inventory
**When** I tap "Log Session" or the quick "Used Today" button
**Then** I can select which gear items were used
**And** I can set: date (defaults to today), environment (saltwater/brackish/rinse-only), duration (optional)
**And** the usage log is saved to user.db linked to the gear item(s)
**And** the gear's total session count updates immediately
**And** I can view usage history for any gear item

### Story 3.3: Maintenance Scheduling Rules Engine

As a surf caster,
I want automatic maintenance schedules based on my usage patterns,
So that I service my gear before it degrades.

**Acceptance Criteria:**

**Given** gear items have usage logs recorded
**When** the scheduler evaluates maintenance status
**Then** it applies default rules:
- Spinning reel full service: every 15 saltwater sessions OR 90 days
- Drag washers grease: every 10 sessions OR 60 days
- Rod guide inspection: every 30 sessions OR 180 days
- Line replacement: every 50 sessions OR 6 months
**And** the threshold that triggers first (sessions or days) wins
**And** maintenance status shows: green (OK), yellow (due soon), red (overdue)
**And** users can customize thresholds per gear item in settings

### Story 3.4: Local Maintenance Notifications

As a surf caster,
I want push notification reminders when gear maintenance is due,
So that I don't forget to service my equipment.

**Acceptance Criteria:**

**Given** a gear item's maintenance threshold is exceeded
**When** I open the app (or on scheduled check)
**Then** a local notification is scheduled: "Your [Gear Name] has X saltwater sessions since last service — time to rinse and re-grease"
**And** notifications use flutter_local_notifications (no server, no FCM)
**And** tapping the notification opens the gear's detail page
**And** I can snooze the reminder (7 days) or mark maintenance as complete
**And** marking complete creates a maintenance_log entry and resets the counter

### Story 3.5: Lifespan Tracking & Cost Analysis

As a surf caster,
I want to see how much life my gear has left and what it costs per session,
So that I can plan replacements and understand value.

**Acceptance Criteria:**

**Given** I view a gear item's detail page
**When** the lifespan section loads
**Then** it shows: total sessions logged, estimated total lifespan (based on gear type defaults), remaining sessions estimate
**And** it shows: cost-per-session (price paid ÷ total sessions)
**And** it shows: complete maintenance history (dates, types, notes)
**And** a visual progress bar indicates gear lifecycle position
**And** lifespan defaults are: reel ~300 sessions, rod ~500 sessions, line ~50 sessions (configurable)

### Story 3.6: Data Export (CSV)

As a surf caster,
I want to export my gear inventory and maintenance logs,
So that I can back up my data or analyze it elsewhere.

**Acceptance Criteria:**

**Given** I go to Settings → Export Data
**When** I tap "Export to CSV"
**Then** a CSV file is generated containing: all gear items with details, all usage logs, all maintenance logs
**And** the system share sheet appears allowing me to save/send the file
**And** the CSV uses standard formatting with headers
**And** dates are in ISO 8601 format

---

## Epic 4: Session Planner

Users can view offline tide predictions, moon phases, solunar periods, and sunrise/sunset for any beach to find the best fishing windows.

### Story 4.1: Tide Prediction Algorithm

As a surf caster,
I want accurate offline tide predictions for my beach,
So that I know the tide state without needing internet.

**Acceptance Criteria:**

**Given** I select a beach with a linked US tide station
**When** the tide computation runs
**Then** tide heights are predicted for any requested date/time
**And** computation uses harmonic analysis: h(t) = H₀ + Σ(Aₙ · cos(ωₙt + φₙ))
**And** predictions are within ±15 minutes and ±0.3m of NOAA published predictions
**And** 7-day computation completes in <500ms
**And** the algorithm is implemented in pure Dart (no platform plugins)
**And** high/low tide times are identified from the computed curve

### Story 4.2: Astronomical Calculations (Moon, Sun, Solunar)

As a surf caster,
I want to know moon phase, solunar periods, and sunrise/sunset,
So that I can identify the best feeding times.

**Acceptance Criteria:**

**Given** a location (lat/lon) and date
**When** astronomical calculations run
**Then** moon phase is computed with illumination percentage and phase name
**And** moon rise/set times are computed (±2 min accuracy)
**And** sunrise/sunset/twilight times are computed (±1 min accuracy)
**And** solunar major periods (moon transit, moon underfoot) are computed
**And** solunar minor periods (moon rise, moon set) are computed
**And** all computations use Jean Meeus algorithms in pure Dart
**And** results are deterministic (same input → same output always)

### Story 4.3: Session Dashboard UI

As a surf caster,
I want a single screen showing all timing data for my chosen beach and date,
So that I can quickly decide if conditions are good.

**Acceptance Criteria:**

**Given** I have selected a beach and a date
**When** the session dashboard loads
**Then** it displays a tide height graph (24h view) with current time marker
**And** high/low tide times are labeled on the graph
**And** moon phase icon with illumination % is shown
**And** solunar major/minor periods are overlaid as colored bands
**And** sunrise/sunset times are shown as markers
**And** "Best windows" are highlighted (solunar major periods overlapping tide transitions)
**And** I can swipe between days (7-day range)
**And** all data loads from offline computation, no network call

### Story 4.4: Beach Selection & Custom Locations

As a surf caster,
I want to select from pre-loaded beaches or add my own fishing spots,
So that I see tide data specific to where I actually fish.

**Acceptance Criteria:**

**Given** I am on the Planner tab
**When** I tap the beach selector
**Then** I can search pre-loaded beaches by name or region
**And** results show: beach name, type, region, typical species
**And** I can add a custom beach by entering: name, latitude, longitude
**And** the app automatically assigns the nearest tide station to custom beaches
**And** custom beaches are saved to user.db
**And** I can set a "favorite" beach as default for the dashboard
**And** I can delete custom beaches
