import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'user_db.g.dart';

// ============================================================
// 用户数据库表定义 — 可写，存储在 App Documents 目录
// ============================================================

/// 用户装备库存
class UserGear extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get referenceGearId => integer().nullable()(); // 可能来自参考库
  TextColumn get gearType => text()(); // rod, reel, line
  TextColumn get customName => text()();
  TextColumn get brand => text().nullable()();
  TextColumn get model => text().nullable()();
  TextColumn get purchaseDate => text().nullable()(); // ISO 8601
  RealColumn get pricePaid => real().nullable()();
  TextColumn get photoPath => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('active'))(); // active, stored, retired
  TextColumn get createdAt => text()();
}

/// 使用记录
class UsageLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get gearId => integer().references(UserGear, #id)();
  TextColumn get date => text()(); // ISO 8601
  TextColumn get environment => text()(); // saltwater, brackish, rinse-only
  IntColumn get durationMin => integer().nullable()();
  TextColumn get createdAt => text()();
}

/// 维护记录
class MaintenanceLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get gearId => integer().references(UserGear, #id)();
  TextColumn get date => text()(); // ISO 8601
  TextColumn get maintenanceType => text()(); // full_service, drag_grease, guide_inspect, line_replace
  TextColumn get notes => text().nullable()();
  RealColumn get cost => real().nullable()(); // V2: 维护费用
  TextColumn get costCategory => text().nullable()(); // V2: self_service, professional, parts_replacement
  TextColumn get serviceProvider => text().nullable()(); // V2: 服务商名称
  TextColumn get createdAt => text()();
}

/// V2: 装备保修信息
class GearWarranties extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get gearId => integer().references(UserGear, #id)();
  TextColumn get warrantyStartDate => text()(); // ISO 8601，默认为购买日期
  IntColumn get warrantyDurationMonths => integer()(); // 保修时长（月）
  TextColumn get warrantyExpiryDate => text()(); // ISO 8601，自动计算
  TextColumn get providerName => text().nullable()(); // 保修提供商/零售商
  TextColumn get warrantyTerms => text().nullable()(); // 保修条款说明
  TextColumn get createdAt => text()();
}

/// V2: 装备照片/收据（支持多图）
class GearPhotos extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get gearId => integer().references(UserGear, #id)();
  TextColumn get photoPath => text()(); // 本地文件路径
  TextColumn get photoType => text()(); // gear, receipt, warranty_card, invoice
  TextColumn get description => text().nullable()();
  TextColumn get createdAt => text()();
}

/// V2: 专业维修状态追踪
class ServiceRecords extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get gearId => integer().references(UserGear, #id)();
  TextColumn get serviceProvider => text()();
  TextColumn get dateSent => text()(); // ISO 8601
  TextColumn get estimatedReturnDate => text().nullable()();
  TextColumn get actualReturnDate => text().nullable()();
  RealColumn get cost => real().nullable()();
  TextColumn get status => text()(); // sent, in_repair, returned
  TextColumn get notes => text().nullable()();
  TextColumn get createdAt => text()();
}

/// V2: 装备零件/子组件追踪
class GearComponents extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get gearId => integer().references(UserGear, #id)();
  TextColumn get componentName => text()(); // e.g. bearings, drag_washers, line_roller
  TextColumn get componentLabel => text()(); // 显示名称
  TextColumn get installDate => text().nullable()(); // ISO 8601
  IntColumn get usageCount => integer().withDefault(const Constant(0))(); // 继承自父装备
  RealColumn get replacementCost => real().nullable()();
  IntColumn get maintenanceIntervalSessions => integer().nullable()(); // 独立维护周期（session数）
  IntColumn get maintenanceIntervalDays => integer().nullable()(); // 独立维护周期（天数）
  TextColumn get lastMaintenanceDate => text().nullable()(); // 上次维护日期
  TextColumn get status => text().withDefault(const Constant('active'))(); // active, replaced
  TextColumn get createdAt => text()();
}

/// 用户自定义海滩
class CustomBeaches extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  RealColumn get lat => real()();
  RealColumn get lon => real()();
  IntColumn get nearestStationId => integer()();
  TextColumn get beachType => text().withDefault(const Constant('sandy'))();
  BoolColumn get isFavorite => boolean().withDefault(const Constant(false))();
  TextColumn get createdAt => text()();
}

/// 用户设置
class UserSettings extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column> get primaryKey => {key};
}

/// V3: 渔获日志
class CatchLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get date => text()(); // ISO 8601
  TextColumn get time => text().nullable()(); // HH:mm
  TextColumn get species => text()(); // 鱼种名
  RealColumn get weightLb => real().nullable()(); // 重量（磅）
  RealColumn get lengthIn => real().nullable()(); // 长度（英寸）
  TextColumn get photoPath => text().nullable()(); // 照片路径
  IntColumn get gearId => integer().nullable()(); // 关联使用的装备
  TextColumn get gearSetup => text().nullable()(); // 装备组合描述
  TextColumn get bait => text().nullable()(); // 使用的饵料
  TextColumn get rigType => text().nullable()(); // 使用的钓组
  TextColumn get location => text().nullable()(); // 位置名称
  RealColumn get lat => real().nullable()(); // 经度
  RealColumn get lon => real().nullable()(); // 纬度
  TextColumn get tideState => text().nullable()(); // rising, falling, high, low
  TextColumn get weather => text().nullable()(); // 天气描述
  BoolColumn get released => boolean().withDefault(const Constant(true))(); // 放流 or 保留
  TextColumn get notes => text().nullable()();
  TextColumn get createdAt => text()();
}

@DriftDatabase(tables: [
  UserGear,
  UsageLogs,
  MaintenanceLogs,
  CustomBeaches,
  UserSettings,
  GearWarranties,
  GearPhotos,
  ServiceRecords,
  GearComponents,
  CatchLogs,
])
class UserDatabase extends _$UserDatabase {
  UserDatabase() : super(_openUserDb());

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
        // 插入默认设置
        await into(userSettings).insert(
          UserSettingsCompanion.insert(key: 'unit_system', value: 'imperial'),
        );
        await into(userSettings).insert(
          UserSettingsCompanion.insert(key: 'onboarding_complete', value: 'false'),
        );
      },
      onUpgrade: (Migrator m, int from, int to) async {
        if (from < 2) {
          // V2: 给 MaintenanceLogs 添加新字段
          await m.addColumn(maintenanceLogs, maintenanceLogs.cost);
          await m.addColumn(maintenanceLogs, maintenanceLogs.costCategory);
          await m.addColumn(maintenanceLogs, maintenanceLogs.serviceProvider);
          // V2: 创建新表
          await m.createTable(gearWarranties);
          await m.createTable(gearPhotos);
          await m.createTable(serviceRecords);
          await m.createTable(gearComponents);
        }
        if (from < 3) {
          // V3: 创建渔获日志表
          await m.createTable(catchLogs);
        }
      },
    );
  }
}

/// 打开用户数据库 — WAL 模式，可写
LazyDatabase _openUserDb() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'user.db'));

    return NativeDatabase.createInBackground(
      file,
      setup: (db) {
        // 启用 WAL 模式确保数据完整性
        db.execute('PRAGMA journal_mode=WAL');
      },
    );
  });
}
