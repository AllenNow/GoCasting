import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_providers.dart';
import '../../../core/database/user_db.dart';
import '../data/maintenance_repository.dart';

/// 维护仓库 Provider
final maintenanceRepositoryProvider = Provider<MaintenanceRepository>((ref) {
  final db = ref.watch(userDatabaseProvider);
  return MaintenanceRepository(db);
});

/// 所有装备列表 Provider
final allGearProvider = FutureProvider<List<UserGearData>>((ref) {
  final repo = ref.watch(maintenanceRepositoryProvider);
  return repo.getAllGear();
});

/// 活跃装备列表 Provider
final activeGearProvider = FutureProvider<List<UserGearData>>((ref) {
  final repo = ref.watch(maintenanceRepositoryProvider);
  return repo.getActiveGear();
});

/// 某装备的使用记录 Provider
final usageLogsProvider =
    FutureProvider.family<List<UsageLog>, int>((ref, gearId) {
  final repo = ref.watch(maintenanceRepositoryProvider);
  return repo.getUsageLogs(gearId);
});

/// 某装备的维护记录 Provider
final maintenanceLogsProvider =
    FutureProvider.family<List<MaintenanceLog>, int>((ref, gearId) {
  final repo = ref.watch(maintenanceRepositoryProvider);
  return repo.getMaintenanceLogs(gearId);
});

/// 某装备的使用次数 Provider
final usageCountProvider =
    FutureProvider.family<int, int>((ref, gearId) {
  final repo = ref.watch(maintenanceRepositoryProvider);
  return repo.getUsageCount(gearId);
});
