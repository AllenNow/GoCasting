# Story 1.1: Flutter 项目脚手架与导航

状态：done（已完成）

## 故事

作为开发者，
我希望有一个正确配置的 Flutter 项目，具备路由和状态管理，
以便所有未来功能有坚实的基础。

## 验收标准

1. 应用启动时显示底部导航栏（3 标签：装备、维护、规划器）
2. GetX 处理标签间导航
3. InitialBinding 包装整个应用进行依赖注入
4. Material 3 主题已应用
5. AndroidManifest.xml 或 Info.plist 中无 INTERNET 权限
6. iOS 部署目标为 15.0，Android minSdk 为 26
7. 应用冷启动在中端设备 < 3 秒
8. 项目结构遵循功能优先模块化架构

## 任务 / 子任务

- [x] 任务 1：清理 Flutter 脚手架（验收标准 #6, #8）
  - [x] 移除默认计数器应用代码
  - [x] 设置 iOS 部署目标为 15.0
  - [x] 设置 Android minSdk 为 26
  - [x] 从 AndroidManifest.xml 移除 INTERNET 权限（所有变体）
  - [x] 验证 Info.plist 无网络权限

- [x] 任务 2：添加核心依赖到 pubspec.yaml（验收标准 #2, #3）
  - [x] 添加 get（GetX 状态管理 + 路由）
  - [x] 添加 drift 和 sqlite3_flutter_libs
  - [x] 添加 drift_dev（dev）
  - [x] 添加 flutter_local_notifications
  - [x] 添加 fl_chart
  - [x] 添加 freezed 和 freezed_annotation
  - [x] 添加 build_runner（dev）
  - [x] 添加 image_picker（V2）
  - [x] 添加 timezone（V2）
  - [x] 运行 `flutter pub get` 验证全部正确解析

- [x] 任务 3：创建项目文件夹结构（验收标准 #8）
  - [x] 创建 `lib/app/` — routes.dart, theme.dart, bindings.dart, home_page.dart
  - [x] 创建 `lib/core/database/` — reference_db.dart, user_db.dart
  - [x] 创建 `lib/core/notifications/` — notification_service.dart
  - [x] 创建 `lib/core/settings/` — settings_controller.dart, locale_controller.dart
  - [x] 创建 `lib/features/gear/data/`, `domain/`, `presentation/`, `providers/`
  - [x] 创建 `lib/features/maintenance/data/`, `domain/`, `presentation/`
  - [x] 创建 `lib/features/planner/data/`, `domain/`, `presentation/`
  - [x] 创建 `lib/features/onboarding/`
  - [x] 创建 `assets/db/`, `assets/data/`, `assets/images/`

- [x] 任务 4：实现 Material 3 主题（验收标准 #4）
  - [x] 创建 `lib/app/theme.dart`
  - [x] 定义 ColorScheme 使用 Material 3 种子色
  - [x] 设置 useMaterial3: true
  - [x] 导出 ThemeData（仅亮色模式）

- [x] 任务 5：实现 GetX 路由 + 底部导航（验收标准 #1, #2）
  - [x] 创建 `lib/app/routes.dart`
  - [x] 定义路由：/gear, /maintenance, /planner, /settings, /onboarding
  - [x] 创建 HomePage 组件含 BottomNavigationBar（3 标签）
  - [x] 各标签页占位内容

- [x] 任务 6：连接 main.dart（验收标准 #3, #7）
  - [x] 使用 GetMaterialApp
  - [x] 设置 initialBinding: InitialBinding()
  - [x] 应用主题
  - [x] 初始化 NotificationService
  - [x] 设置本地化支持

- [x] 任务 7：验证和测试（验收标准 #1-8）
  - [x] 运行 `flutter analyze` — 零警告/错误
  - [x] 验证底部导航、标签、主题
  - [x] 验证无网络权限

## 开发说明

### 架构合规

- **范式：** 功能优先模块化单体（AD-5）
- **状态管理：** GetX（AD-3）
- **路由：** GetX GetPage 路由
- **无网络：** Manifest 不得包含 INTERNET 权限（AD-7）
- **主题：** Material 3，仅亮色模式

### 关键技术决策

- 使用 GetX 的 `GetPage` 路由系统管理页面导航
- 底部导航使用 Material 3 的 `NavigationBar`
- 全局依赖通过 `InitialBinding` 在应用启动时注册
- 依赖即使当前故事未使用也添加到 pubspec.yaml（防止后续版本冲突）

### 实际使用的包版本

- get: ^4.7.2
- drift: ^2.22.1
- sqlite3_flutter_libs: ^0.5.28
- flutter_local_notifications: ^18.0.1
- fl_chart: ^0.70.2
- freezed_annotation: ^2.4.4
- freezed: ^2.5.8（dev）
- build_runner: ^2.4.14（dev）
- drift_dev: ^2.22.1（dev）
- image_picker: ^1.1.2
- timezone: ^0.10.0
- path_provider: ^2.1.5
- path: ^1.9.1

### 参考文档

- [docs/architecture-GoCasting.md#项目结构]
- [docs/architecture-GoCasting.md#技术栈]
- [docs/architecture-GoCasting.md#AD-3-GetX]
- [docs/architecture-GoCasting.md#AD-7-无网络权限]
- [docs/prd-GoCasting.md#NFR-1-离线优先]
- [docs/prd-GoCasting.md#NFR-4-平台支持]

## 完成记录

### 状态

✅ 已完成 — 所有验收标准满足

### 修改的文件

- `pubspec.yaml` — 所有依赖
- `lib/main.dart` — 应用入口 + 通知初始化
- `lib/app/routes.dart` — GetX 路由配置
- `lib/app/theme.dart` — Material 3 主题
- `lib/app/bindings.dart` — 全局依赖注入
- `lib/app/home_page.dart` — 底部导航主页
- `lib/core/database/reference_db.dart` — 只读参考 DB
- `lib/core/database/user_db.dart` — 可写用户 DB（schema v2）
- `lib/core/notifications/notification_service.dart` — 通知服务
- `lib/core/settings/settings_controller.dart` — 设置控制器
- `android/app/src/main/AndroidManifest.xml` — 移除网络权限
- `android/app/src/debug/AndroidManifest.xml` — 移除网络权限
