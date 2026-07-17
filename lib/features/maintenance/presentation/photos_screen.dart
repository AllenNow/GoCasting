import 'dart:io';

import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide Value;
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../data/maintenance_repository.dart';

/// 装备照片/收据管理页面
class PhotosScreen extends StatefulWidget {
  const PhotosScreen({super.key, required this.gearId, required this.gearName});
  final int gearId;
  final String gearName;

  @override
  State<PhotosScreen> createState() => _PhotosScreenState();
}

class _PhotosScreenState extends State<PhotosScreen> {
  final _repo = Get.find<MaintenanceRepository>();
  List<GearPhoto> _photos = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPhotos();
  }

  Future<void> _loadPhotos() async {
    final photos = await _repo.getPhotos(widget.gearId);
    setState(() {
      _photos = photos;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Photos — ${widget.gearName}'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addPhoto,
        child: const Icon(Icons.add_a_photo),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _photos.isEmpty
              ? _buildEmptyState()
              : _buildPhotoGrid(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.photo_library_outlined, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text('No photos yet',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.grey)),
          const SizedBox(height: 8),
          Text(context.tr.addPhotosDesc),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: _addPhoto,
            icon: const Icon(Icons.add_a_photo),
            label: Text(context.tr.addFirstPhoto),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoGrid() {
    // 按类型分组
    final gearPhotos = _photos.where((p) => p.photoType == 'gear').toList();
    final receiptPhotos = _photos.where((p) => p.photoType != 'gear').toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (receiptPhotos.isNotEmpty) ...[
          Text('Receipts & Documents',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          _buildGrid(receiptPhotos),
          const SizedBox(height: 24),
        ],
        if (gearPhotos.isNotEmpty) ...[
          Text('Gear Photos', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          _buildGrid(gearPhotos),
        ],
      ],
    );
  }

  Widget _buildGrid(List<GearPhoto> photos) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: photos.length,
      itemBuilder: (context, index) {
        final photo = photos[index];
        final file = File(photo.photoPath);
        return GestureDetector(
          onTap: () => _viewPhoto(photo),
          onLongPress: () => _deletePhoto(photo),
          child: Card(
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                file.existsSync()
                    ? Image.file(file, fit: BoxFit.cover)
                    : const Center(child: Icon(Icons.broken_image, size: 40)),
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    color: Colors.black54,
                    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                    child: Text(
                      _photoTypeLabel(photo.photoType),
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _photoTypeLabel(String type) => switch (type) {
        'receipt' => '🧾 ${context.tr.receipt}',
        'warranty_card' => '🛡️ ${context.tr.warrantyCard}',
        'invoice' => '📄 ${context.tr.invoice}',
        'gear' => '🎣 ${context.tr.gearPhoto}',
        _ => type,
      };

  Future<void> _addPhoto() async {
    // 选择照片类型
    final type = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('What type of photo?',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long),
              title: Text(context.tr.receipt),
              onTap: () => Navigator.pop(ctx, 'receipt'),
            ),
            ListTile(
              leading: const Icon(Icons.verified_user),
              title: Text(context.tr.warrantyCard),
              onTap: () => Navigator.pop(ctx, 'warranty_card'),
            ),
            ListTile(
              leading: const Icon(Icons.description),
              title: Text(context.tr.invoice),
              onTap: () => Navigator.pop(ctx, 'invoice'),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: Text(context.tr.gearPhoto),
              onTap: () => Navigator.pop(ctx, 'gear'),
            ),
          ],
        ),
      ),
    );

    if (type == null) return;
    if (!mounted) return;

    // 选择照片来源（相机/相册）
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: Text(context.tr.takePhoto),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: Text(context.tr.chooseGallery),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    // 使用 image_picker 获取照片
    final picker = ImagePicker();
    final XFile? pickedFile = await picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );

    if (pickedFile == null) return;

    // 将照片拷贝到 App documents 目录（持久化存储）
    final appDir = await getApplicationDocumentsDirectory();
    final photosDir = Directory(p.join(appDir.path, 'gear_photos'));
    if (!photosDir.existsSync()) {
      photosDir.createSync(recursive: true);
    }

    final now = DateTime.now();
    final fileName = '${widget.gearId}_${type}_${now.millisecondsSinceEpoch}${p.extension(pickedFile.path)}';
    final destinationPath = p.join(photosDir.path, fileName);
    await File(pickedFile.path).copy(destinationPath);

    // 保存到数据库
    await _repo.addPhoto(GearPhotosCompanion(
      gearId: Value(widget.gearId),
      photoPath: Value(destinationPath),
      photoType: Value(type),
      description: const Value(null),
      createdAt: Value(now.toIso8601String()),
    ));

    _loadPhotos();
    if (mounted) {
      Get.snackbar('Done', 'Photo saved', snackPosition: SnackPosition.BOTTOM);
    }
  }

  void _viewPhoto(GearPhoto photo) {
    final file = File(photo.photoPath);
    if (!file.existsSync()) {
      Get.snackbar('Error', 'Photo file not found', snackPosition: SnackPosition.BOTTOM);
      return;
    }
    // 全屏查看
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => Scaffold(
          appBar: AppBar(
            title: Text(_photoTypeLabel(photo.photoType)),
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
          ),
          backgroundColor: Colors.black,
          body: Center(
            child: InteractiveViewer(
              child: Image.file(file),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _deletePhoto(GearPhoto photo) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(context.tr.deletePhoto),
        content: Text(context.tr.deletePhotoConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.delete)),
        ],
      ),
    );
    if (confirm == true) {
      // 删除本地文件
      final file = File(photo.photoPath);
      if (file.existsSync()) {
        try {
          await file.delete();
        } catch (_) {}
      }
      await _repo.deletePhoto(photo.id);
      _loadPhotos();
    }
  }
}
