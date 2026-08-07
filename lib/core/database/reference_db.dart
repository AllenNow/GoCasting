import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'reference_db.g.dart';

// ============================================================
// 参考数据库表定义 — 只读，打包在 App Bundle 中
// ============================================================

/// 鱼竿表
class Rods extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get brand => text()();
  TextColumn get model => text()();
  RealColumn get lengthFt => real()();
  TextColumn get power => text()(); // light, medium, medium-heavy, heavy
  TextColumn get action => text()(); // fast, moderate-fast, moderate, slow
  TextColumn get material => text()(); // graphite, fiberglass, composite
  RealColumn get castWeightMinOz => real()();
  RealColumn get castWeightMaxOz => real()();
  TextColumn get lineRating => text()(); // e.g. "10-25 lb"
  IntColumn get priceTier => integer()(); // 1=entry, 2=mid, 3=premium
  IntColumn get corrosionRating => integer()(); // 1-5 scale
}

/// 渔轮表
class Reels extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get brand => text()();
  TextColumn get model => text()();
  IntColumn get size => integer()(); // e.g. 4000, 5000, 6000
  RealColumn get gearRatio => real()();
  RealColumn get maxDragLb => real()();
  IntColumn get lineCapacityYds => integer()();
  RealColumn get weightOz => real()();
  TextColumn get sealType => text()(); // sealed, shielded, open
  IntColumn get priceTier => integer()();
}

/// 钓线表
class Lines extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get brand => text()();
  TextColumn get type => text()(); // mono, braid, fluoro
  IntColumn get lbTest => integer()();
  RealColumn get diameterMm => real()();
  IntColumn get priceTier => integer()();
}

/// 末端配件表 (钩、铅、转环、前导线)
class TerminalTackle extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get category => text()(); // hook, sinker, swivel, leader
  TextColumn get type => text()(); // e.g. circle, pyramid, barrel
  TextColumn get size => text()(); // e.g. "2/0", "3oz"
  TextColumn get description => text().nullable()();
}

/// 潮汐站表
class TideStations extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  RealColumn get lat => real()();
  RealColumn get lon => real()();
  TextColumn get harmonicConstantsJson => text()(); // JSON 谐波常数
}

/// 海滩表
class Beaches extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  TextColumn get region => text()();
  RealColumn get lat => real()();
  RealColumn get lon => real()();
  IntColumn get nearestStationId => integer().references(TideStations, #id)();
  TextColumn get beachType => text()(); // sandy, rocky, jetty, inlet
  TextColumn get typicalSpecies => text()(); // comma-separated
}

/// 目标鱼种表
class Species extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  TextColumn get category => text()(); // gamefish, panfish, shark
  TextColumn get preferredRodPower => text()(); // recommended rod power range
  TextColumn get preferredLineWeight => text()(); // recommended line lb range
  TextColumn get preferredRigType => text()(); // fish-finder, hi-lo, etc.
  TextColumn get preferredBait => text()(); // comma-separated
}

@DriftDatabase(tables: [
  Rods,
  Reels,
  Lines,
  TerminalTackle,
  TideStations,
  Beaches,
  Species,
])
class ReferenceDatabase extends _$ReferenceDatabase {
  ReferenceDatabase() : super(_openReferenceDb());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
        },
        onUpgrade: (m, from, to) async {
          // 参考数据库升级时重建所有表，seeder 重新填充
          if (from < 2) {
            for (final table in allTables) {
              await m.deleteTable(table.actualTableName);
            }
            await m.createAll();
          }
        },
        beforeOpen: (details) async {
          await customStatement('PRAGMA journal_mode=WAL');
        },
      );
}

/// 打开参考数据库 — 本地可写文件，由 seeder 负责填充数据
LazyDatabase _openReferenceDb() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'reference_v2.db'));
    return NativeDatabase.createInBackground(file);
  });
}
