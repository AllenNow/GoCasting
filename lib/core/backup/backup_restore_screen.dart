import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../l10n/l10n.dart';
import 'backup_service.dart';

/// 备份与恢复页面
class BackupRestoreScreen extends StatefulWidget {
  const BackupRestoreScreen({super.key});

  @override
  State<BackupRestoreScreen> createState() => _BackupRestoreScreenState();
}

class _BackupRestoreScreenState extends State<BackupRestoreScreen> {
  static const _service = BackupService();
  Map<String, String> _stats = {};
  bool _loading = false;

  // 模块选择状态（备份时）
  final Map<BackupModule, bool> _selectedModules = {
    for (final m in BackupModule.values) m: true,
  };

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    final stats = await _service.getDataStats();
    setState(() => _stats = stats);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.backupRestore)),
      body: _loading
          ? const Center(child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [CircularProgressIndicator(), SizedBox(height: 16), Text('Processing...')],
            ))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildDataOverview(context),
                const SizedBox(height: 24),
                _buildBackupSection(context),
                const SizedBox(height: 24),
                _buildRestoreSection(context),
                const SizedBox(height: 24),
                _buildInfoSection(context),
              ],
            ),
    );
  }

  /// 数据概览卡片
  Widget _buildDataOverview(BuildContext context) {
    return Card(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.storage, size: 20),
              const SizedBox(width: 8),
              Text(context.tr.dataOverview, style: Theme.of(context).textTheme.titleMedium),
            ]),
            const SizedBox(height: 12),
            ..._stats.entries.map((e) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(e.key, style: TextStyle(color: Colors.grey[600])),
                      Text(e.value, style: const TextStyle(fontWeight: FontWeight.w500)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }

  /// 备份区域
  Widget _buildBackupSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Icon(Icons.cloud_upload, color: Colors.blue),
          const SizedBox(width: 8),
          Text(context.tr.createBackup, style: Theme.of(context).textTheme.titleMedium),
        ]),
        const SizedBox(height: 8),
        Text(context.tr.selectDataToBackup,
            style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 12),

        // 模块选择
        Card(
          child: Column(
            children: BackupModule.values.map((module) => CheckboxListTile(
                  value: _selectedModules[module],
                  onChanged: (v) => setState(() => _selectedModules[module] = v ?? true),
                  title: Text(module.label),
                  subtitle: Text(module.description, style: const TextStyle(fontSize: 12)),
                  dense: true,
                  secondary: Icon(_moduleIcon(module), size: 20),
                )).toList(),
          ),
        ),
        const SizedBox(height: 12),

        // 快捷按钮
        Row(children: [
          TextButton(
            onPressed: () => setState(() {
              for (final m in BackupModule.values) { _selectedModules[m] = true; }
            }),
            child: Text(context.tr.selectAll),
          ),
          TextButton(
            onPressed: () => setState(() {
              for (final m in BackupModule.values) { _selectedModules[m] = false; }
            }),
            child: Text(context.tr.clearAll),
          ),
        ]),
        const SizedBox(height: 8),

        // 备份按钮
        FilledButton.icon(
          onPressed: _createBackup,
          icon: const Icon(Icons.backup),
          label: Text(context.tr.createShareBackup),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
      ],
    );
  }

  /// 恢复区域
  Widget _buildRestoreSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Icon(Icons.cloud_download, color: Colors.green),
          const SizedBox(width: 8),
          Text(context.tr.restoreFromBackup, style: Theme.of(context).textTheme.titleMedium),
        ]),
        const SizedBox(height: 8),
        Text(context.tr.selectBackupFileDesc,
            style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _selectAndRestore,
          icon: const Icon(Icons.file_open),
          label: Text(context.tr.selectBackupFile),
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
      ],
    );
  }

  /// 信息说明
  Widget _buildInfoSection(BuildContext context) {
    return Card(
      color: Colors.blue.withValues(alpha: 0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.info_outline, color: Colors.blue, size: 18),
              const SizedBox(width: 8),
              Text(context.tr.howItWorks, style: TextStyle(color: Colors.blue[700], fontWeight: FontWeight.w600)),
            ]),
            const SizedBox(height: 8),
            _InfoItem('Backup creates a .gcbak file containing your selected data'),
            _InfoItem('Use the system share sheet to save to iCloud, Google Drive, or Files'),
            _InfoItem('Restore replaces current data with the backup — this cannot be undone'),
            _InfoItem('After restore, restart the app for changes to take effect'),
            _InfoItem('Backups are fully offline — no internet needed'),
          ],
        ),
      ),
    );
  }

  /// 创建备份
  Future<void> _createBackup() async {
    final selected = _selectedModules.entries
        .where((e) => e.value)
        .map((e) => e.key)
        .toList();

    if (selected.isEmpty) {
      Get.snackbar('Error', 'Select at least one data module', snackPosition: SnackPosition.BOTTOM);
      return;
    }

    setState(() => _loading = true);

    final result = await _service.createBackup(modules: selected);

    setState(() => _loading = false);

    if (result.success && result.filePath != null) {
      // 显示成功信息
      if (mounted) {
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(context.tr.backupCreated),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(context.tr.backupReady),
                const SizedBox(height: 8),
                if (result.manifest != null) ...[
                  Text('Modules: ${result.manifest!.modules.length}', style: const TextStyle(fontSize: 13)),
                  Text('Date: ${result.manifest!.createdAt.split('T').first}', style: const TextStyle(fontSize: 13)),
                  if (result.manifest!.stats.containsKey('photo_count'))
                    Text('Photos: ${result.manifest!.stats['photo_count']}', style: const TextStyle(fontSize: 13)),
                ],
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.close)),
              FilledButton.icon(
                onPressed: () => Navigator.pop(ctx, true),
                icon: const Icon(Icons.share),
                label: Text(context.tr.share),
              ),
            ],
          ),
        );
        if (confirm == true) {
          await _service.shareBackup(result.filePath!);
        }
      }
    } else {
      Get.snackbar('Backup Failed', result.error ?? 'Unknown error', snackPosition: SnackPosition.BOTTOM);
    }
  }

  /// 选择文件并恢复
  Future<void> _selectAndRestore() async {
    final pick = await FilePicker.platform.pickFiles(
      type: FileType.any,
      // 无法限定 .gcbak 后缀（部分平台不支持），允许选任意文件
    );

    if (pick == null || pick.files.isEmpty) return;
    final filePath = pick.files.first.path;
    if (filePath == null) return;

    // 先读取 manifest 预览
    final manifest = await _service.readManifest(filePath);
    if (manifest == null) {
      Get.snackbar('Invalid File', 'This does not appear to be a valid GoCasting backup', snackPosition: SnackPosition.BOTTOM);
      return;
    }

    // 确认恢复
    if (!mounted) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr.restoreBackup),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('This will replace your current data with the backup.', style: TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            Text('Backup date: ${manifest.createdAt.split('T').first}'),
            Text('Modules: ${manifest.modules.join(', ')}'),
            if (manifest.stats.containsKey('photo_count'))
              Text('Photos: ${manifest.stats['photo_count']}'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(8)),
              child: const Row(children: [
                Icon(Icons.warning, color: Colors.red, size: 16),
                SizedBox(width: 6),
                Expanded(child: Text('This action cannot be undone. Restart the app after restore.', style: TextStyle(fontSize: 12, color: Colors.red))),
              ]),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: Text(context.tr.restore),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _loading = true);
    final result = await _service.restoreBackup(filePath: filePath);
    setState(() => _loading = false);

    if (result.success) {
      if (mounted) {
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: Row(children: [const Icon(Icons.check_circle, color: Colors.green), const SizedBox(width: 8), Text(context.tr.restoreComplete)]),
            content: Text(context.tr.restoreSuccess),
            actions: [
              FilledButton(onPressed: () => Navigator.pop(ctx), child: Text(context.tr.ok)),
            ],
          ),
        );
      }
    } else {
      Get.snackbar('Restore Failed', result.error ?? 'Unknown error', snackPosition: SnackPosition.BOTTOM);
    }

    _loadStats(); // 刷新数据概览
  }

  IconData _moduleIcon(BackupModule module) => switch (module) {
        BackupModule.gearInventory => Icons.inventory_2,
        BackupModule.usageLogs => Icons.waves,
        BackupModule.maintenance => Icons.build,
        BackupModule.warranties => Icons.verified_user,
        BackupModule.serviceRecords => Icons.local_shipping,
        BackupModule.photos => Icons.photo_library,
        BackupModule.settings => Icons.settings,
      };
}

class _InfoItem extends StatelessWidget {
  const _InfoItem(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('• ', style: TextStyle(color: Colors.blue)),
            Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
          ],
        ),
      );
}
