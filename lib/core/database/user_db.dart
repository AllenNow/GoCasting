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

@DriftDatabase(tables: [
  UserGear,
  UsageLogs,
  MaintenanceLogs,
  CustomBeaches,
  UserSettings,
])
class UserDatabase extends _$UserDatabase {
  UserDatabase() : super(_openUserDb());

  @override
  int get schemaVersion => 1;

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
