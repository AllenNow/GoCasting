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

  // === Warranty ===

  /// 获取某装备的保修信息
  Future<GearWarranty?> getWarranty(int gearId) {
    return (_db.select(_db.gearWarranties)
          ..where((t) => t.gearId.equals(gearId)))
        .getSingleOrNull();
  }

  /// 添加保修信息
  Future<int> addWarranty(GearWarrantiesCompanion warranty) {
    return _db.into(_db.gearWarranties).insert(warranty);
  }

  /// 更新保修信息
  Future<bool> updateWarranty(int id, GearWarrantiesCompanion warranty) {
    return (_db.update(_db.gearWarranties)..where((t) => t.id.equals(id)))
        .write(warranty)
        .then((rows) => rows > 0);
  }

  /// 删除保修信息
  Future<int> deleteWarranty(int gearId) {
    return (_db.delete(_db.gearWarranties)
          ..where((t) => t.gearId.equals(gearId)))
        .go();
  }

  /// 获取即将过期的保修（30天内）
  Future<List<GearWarranty>> getExpiringWarranties() async {
    final now = DateTime.now();
    final threshold = now.add(const Duration(days: 30)).toIso8601String().split('T').first;
    final today = now.toIso8601String().split('T').first;
    return (_db.select(_db.gearWarranties)
          ..where((t) =>
              t.warrantyExpiryDate.isBiggerOrEqualValue(today) &
              t.warrantyExpiryDate.isSmallerOrEqualValue(threshold)))
        .get();
  }

  // === Photos / Receipts ===

  /// 获取某装备的所有照片
  Future<List<GearPhoto>> getPhotos(int gearId) {
    return (_db.select(_db.gearPhotos)
          ..where((t) => t.gearId.equals(gearId))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .get();
  }

  /// 获取某装备的收据照片
  Future<List<GearPhoto>> getReceiptPhotos(int gearId) {
    return (_db.select(_db.gearPhotos)
          ..where((t) =>
              t.gearId.equals(gearId) &
              t.photoType.isIn(['receipt', 'warranty_card', 'invoice'])))
        .get();
  }

  /// 添加照片
  Future<int> addPhoto(GearPhotosCompanion photo) {
    return _db.into(_db.gearPhotos).insert(photo);
  }

  /// 删除照片
  Future<int> deletePhoto(int id) {
    return (_db.delete(_db.gearPhotos)..where((t) => t.id.equals(id))).go();
  }

  // === Maintenance Cost ===

  /// 获取某装备的总维护费用
  Future<double> getTotalMaintenanceCost(int gearId) async {
    final logs = await (_db.select(_db.maintenanceLogs)
          ..where((t) => t.gearId.equals(gearId) & t.cost.isNotNull()))
        .get();
    double total = 0.0;
    for (final log in logs) {
      total += log.cost ?? 0.0;
    }
    return total;
  }

  /// 获取某装备的 TCO（总拥有成本 = 购买价 + 维护费）
  Future<double> getTotalCostOfOwnership(int gearId) async {
    final gear = await (_db.select(_db.userGear)
          ..where((t) => t.id.equals(gearId)))
        .getSingleOrNull();
    final purchasePrice = gear?.pricePaid ?? 0.0;
    final maintenanceCost = await getTotalMaintenanceCost(gearId);
    return purchasePrice + maintenanceCost;
  }

  /// 获取维护费用分类统计
  Future<Map<String, double>> getMaintenanceCostByCategory(int gearId) async {
    final logs = await (_db.select(_db.maintenanceLogs)
          ..where((t) => t.gearId.equals(gearId) & t.cost.isNotNull()))
        .get();
    final result = <String, double>{};
    for (final log in logs) {
      final category = log.costCategory ?? 'other';
      result[category] = (result[category] ?? 0.0) + (log.cost ?? 0.0);
    }
    return result;
  }

  // === Service Records ===

  /// 获取某装备的维修记录
  Future<List<ServiceRecord>> getServiceRecords(int gearId) {
    return (_db.select(_db.serviceRecords)
          ..where((t) => t.gearId.equals(gearId))
          ..orderBy([(t) => OrderingTerm.desc(t.dateSent)]))
        .get();
  }

  /// 添加维修记录
  Future<int> addServiceRecord(ServiceRecordsCompanion record) {
    return _db.into(_db.serviceRecords).insert(record);
  }

  /// 更新维修记录
  Future<bool> updateServiceRecord(int id, ServiceRecordsCompanion record) {
    return (_db.update(_db.serviceRecords)..where((t) => t.id.equals(id)))
        .write(record)
        .then((rows) => rows > 0);
  }

  /// 获取当前送修中的装备 ID 列表
  Future<List<int>> getGearIdsInService() async {
    final records = await (_db.select(_db.serviceRecords)
          ..where((t) => t.status.isIn(['sent', 'in_repair'])))
        .get();
    return records.map((r) => r.gearId).toSet().toList();
  }

  // === Gear Components ===

  /// 获取某装备的所有零件
  Future<List<GearComponent>> getComponents(int gearId) {
    return (_db.select(_db.gearComponents)
          ..where((t) => t.gearId.equals(gearId) & t.status.equals('active'))
          ..orderBy([(t) => OrderingTerm.asc(t.componentName)]))
        .get();
  }

  /// 添加零件
  Future<int> addComponent(GearComponentsCompanion component) {
    return _db.into(_db.gearComponents).insert(component);
  }

  /// 更新零件
  Future<bool> updateComponent(int id, GearComponentsCompanion component) {
    return (_db.update(_db.gearComponents)..where((t) => t.id.equals(id)))
        .write(component)
        .then((rows) => rows > 0);
  }

  /// 标记零件已更换
  Future<void> replaceComponent(int id, {double? replacementCost}) async {
    // 将旧零件标记为 replaced
    await (_db.update(_db.gearComponents)..where((t) => t.id.equals(id)))
        .write(GearComponentsCompanion(status: const Value('replaced')));
  }

  /// 删除零件
  Future<int> deleteComponent(int id) {
    return (_db.delete(_db.gearComponents)..where((t) => t.id.equals(id))).go();
  }

  /// 为某装备初始化默认零件列表
  Future<void> initDefaultComponents(int gearId, String gearType) async {
    final defaults = _defaultComponents(gearType);
    final now = DateTime.now().toIso8601String();
    await _db.batch((batch) {
      for (final comp in defaults) {
        batch.insert(
          _db.gearComponents,
          GearComponentsCompanion.insert(
            gearId: gearId,
            componentName: comp.name,
            componentLabel: comp.label,
            maintenanceIntervalSessions: Value(comp.intervalSessions),
            maintenanceIntervalDays: Value(comp.intervalDays),
            createdAt: now,
          ),
        );
      }
    });
  }

  List<_DefaultComponent> _defaultComponents(String gearType) {
    return switch (gearType.toLowerCase()) {
      'reel' => [
          _DefaultComponent('bearings', 'Bearings', 30, 180),
          _DefaultComponent('drag_washers', 'Drag Washers', 10, 60),
          _DefaultComponent('line_roller', 'Line Roller', 20, 120),
          _DefaultComponent('main_gear', 'Main Gear', 50, 365),
          _DefaultComponent('anti_reverse', 'Anti-Reverse', 40, 300),
        ],
      'rod' => [
          _DefaultComponent('guides', 'Guides', 30, 180),
          _DefaultComponent('tip_top', 'Tip Top', 50, 365),
          _DefaultComponent('reel_seat', 'Reel Seat', 100, 730),
          _DefaultComponent('grip_cork', 'Grip / Cork', 60, 365),
        ],
      _ => [],
    };
  }
}

class _DefaultComponent {
  const _DefaultComponent(this.name, this.label, this.intervalSessions, this.intervalDays);
  final String name;
  final String label;
  final int intervalSessions;
  final int intervalDays;
}
