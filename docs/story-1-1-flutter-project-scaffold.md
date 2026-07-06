# Story 1.1: Flutter Project Scaffold & Navigation

Status: ready-for-dev

## Story

As a developer,
I want a properly configured Flutter project with routing and state management,
so that all future features have a solid foundation to build upon.

## Acceptance Criteria

1. App launches with a bottom navigation bar (3 tabs: Gear, Maintenance, Planner)
2. GoRouter handles navigation between tabs with proper route definitions
3. Riverpod ProviderScope wraps the entire app at the root
4. Material 3 theme is applied with a consistent color scheme
5. No INTERNET permission exists in AndroidManifest.xml or Info.plist
6. iOS deployment target is 15.0, Android minSdk is 26
7. App cold starts in < 3 seconds on mid-range device
8. Project structure follows feature-first modular architecture

## Tasks / Subtasks

- [ ] Task 1: Clean existing Flutter scaffold (AC: #6, #8)
  - [ ] Remove default counter app code
  - [ ] Set iOS deployment target to 15.0 in `ios/Runner.xcodeproj`
  - [ ] Set Android minSdk to 26 in `android/app/build.gradle.kts`
  - [ ] Remove INTERNET permission from AndroidManifest.xml (all variants: main, debug, profile)
  - [ ] Verify no NSAppTransportSecurity or network entitlements in Info.plist

- [ ] Task 2: Add core dependencies to pubspec.yaml (AC: #2, #3)
  - [ ] Add flutter_riverpod and riverpod_annotation
  - [ ] Add riverpod_generator and build_runner (dev)
  - [ ] Add go_router
  - [ ] Add freezed and freezed_annotation (for models)
  - [ ] Add drift and sqlite3_flutter_libs (for DB — schema only in this story)
  - [ ] Add drift_dev (dev)
  - [ ] Add flutter_local_notifications (registered, not configured yet)
  - [ ] Add fl_chart (registered, not used yet)
  - [ ] Run `flutter pub get` to verify all resolve correctly

- [ ] Task 3: Create project folder structure (AC: #8)
  - [ ] Create `lib/app/` — router.dart, theme.dart
  - [ ] Create `lib/core/database/` — placeholder for DB setup
  - [ ] Create `lib/core/notifications/` — placeholder
  - [ ] Create `lib/core/settings/` — placeholder
  - [ ] Create `lib/core/models/` — placeholder
  - [ ] Create `lib/features/gear/data/`, `domain/`, `presentation/`, `providers/`
  - [ ] Create `lib/features/maintenance/data/`, `domain/`, `presentation/`, `providers/`
  - [ ] Create `lib/features/planner/data/`, `domain/`, `presentation/`, `providers/`
  - [ ] Create `lib/shared/widgets/`, `extensions/`
  - [ ] Create `assets/db/`, `assets/data/`, `assets/images/`

- [ ] Task 4: Implement Material 3 Theme (AC: #4)
  - [ ] Create `lib/app/theme.dart`
  - [ ] Define ColorScheme using Material 3 seed color (ocean blue/teal recommended for fishing app)
  - [ ] Set useMaterial3: true
  - [ ] Define text theme with appropriate scales
  - [ ] Export ThemeData for light mode (dark mode deferred)

- [ ] Task 5: Implement GoRouter with bottom navigation (AC: #1, #2)
  - [ ] Create `lib/app/router.dart`
  - [ ] Define StatefulShellRoute with 3 branches: /gear, /maintenance, /planner
  - [ ] Create ScaffoldWithNavBar widget with BottomNavigationBar (3 tabs with icons)
  - [ ] Tab icons: build/settings (gear), handyman/wrench (maintenance), water/waves (planner)
  - [ ] Create placeholder screens for each tab (GearScreen, MaintenanceScreen, PlannerScreen)
  - [ ] Each placeholder shows centered text: "Gear", "Maintenance", "Planner"

- [ ] Task 6: Wire up main.dart with Riverpod (AC: #3, #7)
  - [ ] Wrap app in ProviderScope
  - [ ] Create MaterialApp.router using GoRouter
  - [ ] Apply theme from theme.dart
  - [ ] Set title: 'GoCasting'
  - [ ] Verify app launches and navigates between 3 tabs

- [ ] Task 7: Verify and test (AC: #1-8)
  - [ ] Run `flutter analyze` — zero warnings/errors
  - [ ] Run on iOS simulator — verify bottom nav, tabs, theme
  - [ ] Run on Android emulator — verify bottom nav, tabs, theme
  - [ ] Verify no network permission in final APK/IPA manifests
  - [ ] Write basic widget test: app renders, 3 tabs visible, navigation works

## Dev Notes

### Architecture Compliance

- **Paradigm:** Feature-first modular monolith (AD-5 from architecture spine)
- **State:** Riverpod 2.x with code generation (AD-3)
- **Router:** GoRouter with StatefulShellRoute for tab persistence
- **No Network:** Manifests MUST NOT contain INTERNET permission (AD-7). This is enforced at build level.
- **Theme:** Material 3, light mode only for V1

### Key Technical Decisions

- Use `StatefulShellRoute` (not `ShellRoute`) to preserve tab state when switching
- Bottom navigation uses `NavigationBar` (Material 3) not deprecated `BottomNavigationBar`
- Each feature folder is created empty with placeholder files to establish structure
- Dependencies are added to pubspec.yaml even if not used yet in this story (prevents version conflicts later)

### Project Structure Notes

The existing Flutter project already has:
- `android/` and `ios/` platform folders configured
- `lib/main.dart` with default counter app (to be replaced)
- `pubspec.yaml` with basic Flutter dependencies

This story replaces all default code and establishes the full project skeleton.

### Network Permission Removal

**Android:** Remove `<uses-permission android:name="android.permission.INTERNET"/>` from:
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/debug/AndroidManifest.xml`  
- `android/app/src/profile/AndroidManifest.xml`

**iOS:** Ensure `Info.plist` does NOT contain:
- `NSAppTransportSecurity` dictionary
- Any network-related entitlements in `Runner.entitlements`

### Package Versions (as of July 2026)

- flutter_riverpod: ^2.6.x
- riverpod_annotation: ^2.6.x
- go_router: ^14.x
- drift: ^2.x
- sqlite3_flutter_libs: ^0.5.x
- flutter_local_notifications: ^17.x
- fl_chart: ^0.69.x
- freezed_annotation: ^2.4.x
- freezed: ^2.5.x (dev)
- riverpod_generator: ^2.6.x (dev)
- build_runner: ^2.4.x (dev)
- drift_dev: ^2.x (dev)

### References

- [Source: docs/architecture-GoCasting.md#Project-Structure-Seed]
- [Source: docs/architecture-GoCasting.md#Technology-Stack]
- [Source: docs/architecture-GoCasting.md#AD-3-Riverpod]
- [Source: docs/architecture-GoCasting.md#AD-7-No-Network-Permission]
- [Source: docs/prd-GoCasting.md#NFR-1-Offline-First]
- [Source: docs/prd-GoCasting.md#NFR-4-Platform-Support]

## Dev Agent Record

### Agent Model Used

(to be filled by dev agent)

### Debug Log References

(to be filled during implementation)

### Completion Notes List

(to be filled on completion)

### File List

(to be filled — list of all files created/modified)
