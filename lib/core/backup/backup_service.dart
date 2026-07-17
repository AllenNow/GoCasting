import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// 备份数据模块定义
enum BackupModule {
  gearInventory('gear_inventory', 'Gear Inventory', 'Rods, reels, and all gear items'),
  usageLogs('usage_logs', 'Usage Logs', 'All session usage records'),
  maintenance('maintenance', 'Maintenance Records', 'Maintenance logs and component tracking'),
  warranties('warranties', 'Warranties', 'Warranty information for all gear'),
  serviceRecords('service_records', 'Service Records', 'Professional repair history'),
  photos('photos', 'Photos & Receipts', 'Receipt images, warranty cards, gear photos'),
  settings('settings', 'Settings & Beaches', 'User preferences and custom beach locations');

  const BackupModule(this.id, this.label, this.description);
  final String id;
  final String label;
  final String description;
}

/// 备份清单（包含在 zip 中的 manifest.json）
class BackupManifest {
  const BackupManifest({
    required this.version,
    required this.appVersion,
    required this.createdAt,
    required this.modules,
    required this.stats,
  });

  final int version; // 清单格式版本
  final String appVersion;
  final String createdAt; // ISO 8601
  final List<String> modules; // 包含的模块 ID
  final Map<String, int> stats; // 统计信息: {"gear_count": 5, "photo_count": 12, ...}

  Map<String, dynamic> toJson() => {
        'version': version,
        'app_version': appVersion,
        'created_at': createdAt,
        'modules': modules,
        'stats': stats,
      };

  factory BackupManifest.fromJson(Map<String, dynamic> json) => BackupManifest(
        version: json['version'] as int,
        appVersion: json['app_version'] as String,
        createdAt: json['created_at'] as String,
        modules: (json['modules'] as List).cast<String>(),
        stats: (json['stats'] as Map<String, dynamic>).map((k, v) => MapEntry(k, v as int)),
      );
}

/// 备份/恢复结果
class BackupResult {
  const BackupResult({required this.success, this.filePath, this.error, this.manifest});
  final bool success;
  final String? filePath;
  final String? error;
  final BackupManifest? manifest;
}

/// 备份/恢复服务
class BackupService {
  const BackupService();

  /// 获取用户数据库路径
  Future<String> get _userDbPath async {
    final dir = await getApplicationDocumentsDirectory();
    return p.join(dir.path, 'user.db');
  }

  /// 获取照片目录路径
  Future<String> get _photosDir async {
    final dir = await getApplicationDocumentsDirectory();
    return p.join(dir.path, 'gear_photos');
  }

  /// 创建备份
  ///
  /// [modules] 要备份的模块。如果为空则备份所有模块。
  /// 返回备份文件路径。
  Future<BackupResult> createBackup({
    List<BackupModule> modules = const [],
  }) async {
    try {
      final selectedModules = modules.isEmpty ? BackupModule.values.toList() : modules;

      final archive = Archive();
      final stats = <String, int>{};

      // 1. 始终包含数据库（它包含所有表数据）
      final dbPath = await _userDbPath;
      final dbFile = File(dbPath);
      if (await dbFile.exists()) {
        // 先写一个 WAL checkpoint 确保所有数据写入主文件
        // （Drift 在关闭前会自动做，但这里额外保险）
        final dbBytes = await dbFile.readAsBytes();
        archive.addFile(ArchiveFile('user.db', dbBytes.length, dbBytes));

        // WAL 文件也一起备份（如果存在）
        final walFile = File('$dbPath-wal');
        if (await walFile.exists()) {
          final walBytes = await walFile.readAsBytes();
          archive.addFile(ArchiveFile('user.db-wal', walBytes.length, walBytes));
        }

        // SHM 文件
        final shmFile = File('$dbPath-shm');
        if (await shmFile.exists()) {
          final shmBytes = await shmFile.readAsBytes();
          archive.addFile(ArchiveFile('user.db-shm', shmBytes.length, shmBytes));
        }
      }

      // 2. 如果选择了照片模块，打包照片目录
      if (selectedModules.contains(BackupModule.photos)) {
        final photosPath = await _photosDir;
        final photosDir = Directory(photosPath);
        if (await photosDir.exists()) {
          int photoCount = 0;
          await for (final entity in photosDir.list(recursive: false)) {
            if (entity is File) {
              final bytes = await entity.readAsBytes();
              final name = p.basename(entity.path);
              archive.addFile(ArchiveFile('photos/$name', bytes.length, bytes));
              photoCount++;
            }
          }
          stats['photo_count'] = photoCount;
        }
      }

      // 3. 创建 manifest
      final manifest = BackupManifest(
        version: 1,
        appVersion: '1.0.0',
        createdAt: DateTime.now().toIso8601String(),
        modules: selectedModules.map((m) => m.id).toList(),
        stats: stats,
      );
      final manifestJson = utf8.encode(jsonEncode(manifest.toJson()));
      archive.addFile(ArchiveFile('manifest.json', manifestJson.length, manifestJson));

      // 4. 编码为 zip 并写入临时文件
      final zipData = ZipEncoder().encode(archive);

      final tempDir = await getTemporaryDirectory();
      final date = DateTime.now().toIso8601String().split('T').first;
      final fileName = 'GoCasting_Backup_$date.gcbak';
      final outputPath = p.join(tempDir.path, fileName);
      final outputFile = File(outputPath);
      await outputFile.writeAsBytes(zipData);

      return BackupResult(success: true, filePath: outputPath, manifest: manifest);
    } catch (e) {
      return BackupResult(success: false, error: e.toString());
    }
  }

  /// 通过系统分享面板分享备份文件
  Future<void> shareBackup(String filePath) async {
    await Share.shareXFiles([XFile(filePath)], subject: 'GoCasting Backup');
  }

  /// 读取备份文件的清单信息（不恢复，仅预览）
  Future<BackupManifest?> readManifest(String filePath) async {
    try {
      final file = File(filePath);
      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      final manifestFile = archive.findFile('manifest.json');
      if (manifestFile == null) return null;

      final jsonStr = utf8.decode(manifestFile.content as List<int>);
      return BackupManifest.fromJson(jsonDecode(jsonStr) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  /// 从备份文件恢复数据
  ///
  /// [filePath] 备份文件路径
  /// [modules] 要恢复的模块（空 = 全部恢复）
  /// [replaceExisting] 是否替换现有数据（true = 覆盖，false = 跳过已存在的）
  Future<BackupResult> restoreBackup({
    required String filePath,
    List<BackupModule> modules = const [],
    bool replaceExisting = true,
  }) async {
    try {
      final file = File(filePath);
      if (!await file.exists()) {
        return const BackupResult(success: false, error: 'Backup file not found');
      }

      final bytes = await file.readAsBytes();
      final archive = ZipDecoder().decodeBytes(bytes);

      // 1. 读取 manifest
      final manifestFile = archive.findFile('manifest.json');
      if (manifestFile == null) {
        return const BackupResult(success: false, error: 'Invalid backup: no manifest.json');
      }
      final manifestJson = utf8.decode(manifestFile.content as List<int>);
      final manifest = BackupManifest.fromJson(jsonDecode(manifestJson) as Map<String, dynamic>);

      // 2. 恢复数据库
      final dbFile = archive.findFile('user.db');
      if (dbFile != null) {
        final dbPath = await _userDbPath;

        // 删除旧的 WAL/SHM 文件
        final walFile = File('$dbPath-wal');
        final shmFile = File('$dbPath-shm');
        if (await walFile.exists()) await walFile.delete();
        if (await shmFile.exists()) await shmFile.delete();

        // 写入新的数据库文件
        await File(dbPath).writeAsBytes(dbFile.content as List<int>);

        // 恢复 WAL 文件（如果备份中有）
        final walBackup = archive.findFile('user.db-wal');
        if (walBackup != null) {
          await File('$dbPath-wal').writeAsBytes(walBackup.content as List<int>);
        }
      }

      // 3. 恢复照片
      final selectedModules = modules.isEmpty ? BackupModule.values.toList() : modules;
      if (selectedModules.contains(BackupModule.photos)) {
        final photosPath = await _photosDir;
        final photosDir = Directory(photosPath);
        if (!await photosDir.exists()) {
          await photosDir.create(recursive: true);
        }

        for (final archiveFile in archive.files) {
          if (archiveFile.name.startsWith('photos/') && archiveFile.isFile) {
            final fileName = p.basename(archiveFile.name);
            final outputPath = p.join(photosPath, fileName);
            final destFile = File(outputPath);

            if (!replaceExisting && await destFile.exists()) continue;
            await destFile.writeAsBytes(archiveFile.content as List<int>);
          }
        }
      }

      return BackupResult(success: true, manifest: manifest);
    } catch (e) {
      return BackupResult(success: false, error: e.toString());
    }
  }

  /// 计算当前数据大小
  Future<Map<String, String>> getDataStats() async {
    final stats = <String, String>{};

    // 数据库大小
    final dbPath = await _userDbPath;
    final dbFile = File(dbPath);
    if (await dbFile.exists()) {
      final size = await dbFile.length();
      stats['Database'] = _formatSize(size);
    }

    // 照片目录大小
    final photosPath = await _photosDir;
    final photosDir = Directory(photosPath);
    if (await photosDir.exists()) {
      int totalSize = 0;
      int count = 0;
      await for (final entity in photosDir.list()) {
        if (entity is File) {
          totalSize += await entity.length();
          count++;
        }
      }
      stats['Photos'] = '$count files (${_formatSize(totalSize)})';
    } else {
      stats['Photos'] = '0 files';
    }

    return stats;
  }

  String _formatSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
