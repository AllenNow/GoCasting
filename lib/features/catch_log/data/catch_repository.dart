import 'package:drift/drift.dart';

import '../../../core/database/user_db.dart';

/// 渔获日志数据访问层
class CatchRepository {
  CatchRepository(this._db);
  final UserDatabase _db;

  /// 获取所有渔获记录（最新在前）
  Future<List<CatchLog>> getAll() {
    return (_db.select(_db.catchLogs)
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .get();
  }

  /// 按鱼种筛选
  Future<List<CatchLog>> getBySpecies(String species) {
    return (_db.select(_db.catchLogs)
          ..where((t) => t.species.equals(species))
          ..orderBy([(t) => OrderingTerm.desc(t.date)]))
        .get();
  }

  /// 获取总渔获数
  Future<int> getCount() async {
    final all = await (_db.select(_db.catchLogs)).get();
    return all.length;
  }

  /// 添加渔获记录
  Future<int> add(CatchLogsCompanion entry) {
    return _db.into(_db.catchLogs).insert(entry);
  }

  /// 删除渔获记录
  Future<int> delete(int id) {
    return (_db.delete(_db.catchLogs)..where((t) => t.id.equals(id))).go();
  }

  /// 获取鱼种统计（每种鱼钓了多少条）
  Future<Map<String, int>> getSpeciesStats() async {
    final all = await getAll();
    final stats = <String, int>{};
    for (final c in all) {
      stats[c.species] = (stats[c.species] ?? 0) + 1;
    }
    return stats;
  }

  /// 获取最佳渔获（按重量）
  Future<CatchLog?> getBiggest() async {
    final all = await (_db.select(_db.catchLogs)
          ..where((t) => t.weightLb.isNotNull())
          ..orderBy([(t) => OrderingTerm.desc(t.weightLb)])
          ..limit(1))
        .getSingleOrNull();
    return all;
  }

  /// 获取月度统计（每月钓了多少条）
  Future<Map<String, int>> getMonthlyStats() async {
    final all = await getAll();
    final stats = <String, int>{};
    for (final c in all) {
      final month = c.date.substring(0, 7); // "2026-07"
      stats[month] = (stats[month] ?? 0) + 1;
    }
    return stats;
  }

  /// 获取饵料效率统计
  Future<Map<String, int>> getBaitStats() async {
    final all = await getAll();
    final stats = <String, int>{};
    for (final c in all) {
      if (c.bait != null && c.bait!.isNotEmpty) {
        stats[c.bait!] = (stats[c.bait!] ?? 0) + 1;
      }
    }
    return stats;
  }
}
