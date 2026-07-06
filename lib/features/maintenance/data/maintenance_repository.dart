import 'package:drift/drift.dart';

import '../../../core/database/user_db.dart';

/// 维护模块数据访问层
class MaintenanceRepository {
  MaintenanceRepository(this._db);

  final UserDatabase _db;

  // === Gear Inventory ===

  /// 获取所有用户装备
  Future<List<UserGearData>> getAllGear() {
    return (_db.select(_db.userGear)
          ..orderBy([(t) => OrderingTerm.desc(t.id)]))
        .get();
  }

  /// 获取活跃装备
  Future<List<UserGearData>> getActiveGear() {
    return (_db.select(_db.userGear)
          ..where((t) => t.status.equals('active')))
        .get();
  }

  /// 添加装备
  Future<int> addGear(UserGearCompanion gear) {
    return _db.into(_db.userGear).insert(gear);
  }

  /// 更新装备
  Future<bool> updateGear(int id, UserGearCompanion gear) {
    return (_db.update(_db.userGear)..where((t) => t.id.equals(id)))
        .write(gear)
        .then((rows) => rows > 0);
  }

  /// 删除装备
  Future<int> deleteGear(int id) {
    return (_db.delete(_db.userGear)..where((t) => t.id.equals(id))).go();
  }

  // === Usage Logs ===

  /// 获取某装备的使用记录
  Future<List<UsageLog>> getUsageLogs(int gearId) {
    return (_db.select(_db.usageLogs)
          ..where((t) => t.gearId.equals(gearId))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .get();
  }

  /// 获取某装备的总使用次数
  Future<int> getUsageCount(int gearId) async {
    final logs = await (_db.select(_db.usageLogs)
          ..where((t) => t.gearId.equals(gearId)))
        .get();
    return logs.length;
  }

  /// 获取自上次维护以来的使用次数
  Future<int> getUsageSinceLastMaintenance(
      int gearId, String maintenanceType) async {
    // 找到该类型最近一次维护的日期
    final lastMaint = await (_db.select(_db.maintenanceLogs)
          ..where((t) =>
              t.gearId.equals(gearId) &
              t.maintenanceType.equals(maintenanceType))
          ..orderBy([(t) => OrderingTerm.desc(t.date)])
          ..limit(1))
        .getSingleOrNull();

    if (lastMaint == null) {
      // 没有维护过 → 返回所有使用次数
      return getUsageCount(gearId);
    }

    // 统计该日期之后的使用次数
    final logs = await (_db.select(_db.usageLogs)
          ..where((t) =>
              t.gearId.equals(gearId) & t.date.isBiggerThanValue(lastMaint.date)))
        .get();
    return logs.length;
  }

  /// 添加使用记录
  Future<int> addUsageLog(UsageLogsCompanion log) {
    return _db.into(_db.usageLogs).insert(log);
  }

  /// 批量添加使用记录（多个装备同时使用）
  Future<void> addUsageLogForMultipleGear({
    required List<int> gearIds,
    required String date,
    required String environment,
    int? durationMin,
  }) async {
    final now = DateTime.now().toIso8601String();
    await _db.batch((batch) {
      for (final gearId in gearIds) {
        batch.insert(
          _db.usageLogs,
          UsageLogsCompanion.insert(
            gearId: gearId,
            date: date,
            environment: environment,
            durationMin: Value(durationMin),
            createdAt: now,
          ),
        );
      }
    });
  }

  // === Maintenance Logs ===

  /// 获取某装备的维护记录
  Future<List<MaintenanceLog>> getMaintenanceLogs(int gearId) {
    return (_db.select(_db.maintenanceLogs)
          ..where((t) => t.gearId.equals(gearId))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .get();
  }

  /// 记录维护完成
  Future<int> addMaintenanceLog(MaintenanceLogsCompanion log) {
    return _db.into(_db.maintenanceLogs).insert(log);
  }

  /// 获取最近一次维护日期
  Future<String?> getLastMaintenanceDate(
      int gearId, String maintenanceType) async {
    final log = await (_db.select(_db.maintenanceLogs)
          ..where((t) =>
              t.gearId.equals(gearId) &
              t.maintenanceType.equals(maintenanceType))
          ..orderBy([(t) => OrderingTerm.desc(t.date)])
          ..limit(1))
        .getSingleOrNull();
    return log?.date;
  }
}
