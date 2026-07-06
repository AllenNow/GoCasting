import '../../../core/database/user_db.dart';

/// CSV 导出工具
class CsvExporter {
  const CsvExporter();

  /// 导出装备库存为 CSV
  String exportGearInventory(List<UserGearData> gear) {
    final buffer = StringBuffer();
    buffer.writeln(
        'ID,Type,Name,Brand,Model,Purchase Date,Price Paid,Status,Created At');
    for (final item in gear) {
      buffer.writeln(
        '${item.id},'
        '${_escape(item.gearType)},'
        '${_escape(item.customName)},'
        '${_escape(item.brand ?? "")},'
        '${_escape(item.model ?? "")},'
        '${item.purchaseDate ?? ""},'
        '${item.pricePaid ?? ""},'
        '${item.status},'
        '${item.createdAt}',
      );
    }
    return buffer.toString();
  }

  /// 导出使用记录为 CSV
  String exportUsageLogs(List<UsageLog> logs) {
    final buffer = StringBuffer();
    buffer.writeln('ID,Gear ID,Date,Environment,Duration (min),Created At');
    for (final log in logs) {
      buffer.writeln(
        '${log.id},'
        '${log.gearId},'
        '${log.date},'
        '${log.environment},'
        '${log.durationMin ?? ""},'
        '${log.createdAt}',
      );
    }
    return buffer.toString();
  }

  /// 导出维护记录为 CSV
  String exportMaintenanceLogs(List<MaintenanceLog> logs) {
    final buffer = StringBuffer();
    buffer.writeln('ID,Gear ID,Date,Type,Notes,Created At');
    for (final log in logs) {
      buffer.writeln(
        '${log.id},'
        '${log.gearId},'
        '${log.date},'
        '${_escape(log.maintenanceType)},'
        '${_escape(log.notes ?? "")},'
        '${log.createdAt}',
      );
    }
    return buffer.toString();
  }

  /// 导出完整数据（合并）
  String exportAll({
    required List<UserGearData> gear,
    required List<UsageLog> usageLogs,
    required List<MaintenanceLog> maintenanceLogs,
  }) {
    final buffer = StringBuffer();
    buffer.writeln('=== GEAR INVENTORY ===');
    buffer.write(exportGearInventory(gear));
    buffer.writeln();
    buffer.writeln('=== USAGE LOGS ===');
    buffer.write(exportUsageLogs(usageLogs));
    buffer.writeln();
    buffer.writeln('=== MAINTENANCE LOGS ===');
    buffer.write(exportMaintenanceLogs(maintenanceLogs));
    return buffer.toString();
  }

  String _escape(String value) {
    if (value.contains(',') || value.contains('"') || value.contains('\n')) {
      return '"${value.replaceAll('"', '""')}"';
    }
    return value;
  }
}
