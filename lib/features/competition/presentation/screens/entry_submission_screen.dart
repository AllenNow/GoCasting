import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:go_casting/features/competition/presentation/competition_controller.dart';
import 'package:go_casting/features/competition/domain/competition_models.dart';

class EntrySubmissionScreen extends StatefulWidget {
  const EntrySubmissionScreen({super.key});

  @override
  State<EntrySubmissionScreen> createState() => _EntrySubmissionScreenState();
}

class _EntrySubmissionScreenState extends State<EntrySubmissionScreen> {
  final CompetitionController controller = Get.find<CompetitionController>();
  final ImagePicker _picker = ImagePicker();
  
  // 本地状态用于图片预览
  File? _fishPhoto;
  File? _measurementPhoto;
  File? _environmentVideo;

  @override
  void initState() {
    super.initState();
    if (controller.currentCompetition.value == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Get.snackbar('提示', '请先选择比赛', duration: const Duration(seconds: 2));
        Get.back();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('提交参赛记录'),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _showCompetitionRules(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 当前比赛信息
            _buildCurrentCompetitionCard(),
            const SizedBox(height: 20),

            // 参赛者信息
            const Text('参赛者信息', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(
                labelText: '昵称（如：老高-海湾公园）',
                hintText: '请输入昵称，用于识别您的参赛记录',
                border: OutlineInputBorder(),
              ),
              onChanged: controller.participantName,
            ),
            const SizedBox(height: 20),

            // 类别选择
            const Text('比赛类别', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _buildCategorySelector(),
            const SizedBox(height: 20),

            // 测量数据
            const Text('测量数据', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: '长度（cm）',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      final length = double.tryParse(value) ?? 0.0;
                      controller.lengthCm.value = length;
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: '重量（g）',
                      border: OutlineInputBorder(),
                      helperText: '去除容器重量',
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      final weight = double.tryParse(value);
                      controller.weightG.value = weight;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 钓点信息
            const Text('钓点信息', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(
                labelText: '钓点位置',
                hintText: '如：海湾公园、五缘湾等',
                border: OutlineInputBorder(),
              ),
              onChanged: controller.location,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<FishingMethod>(
                    decoration: const InputDecoration(
                      labelText: '钓法',
                      border: OutlineInputBorder(),
                    ),
                    value: controller.selectedFishingMethod.value,
                    items: [
                      DropdownMenuItem(
                        value: FishingMethod.shore,
                        child: Text(controller.getFishingMethodDescription(FishingMethod.shore)),
                      ),
                      DropdownMenuItem(
                        value: FishingMethod.rock,
                        child: Text(controller.getFishingMethodDescription(FishingMethod.rock)),
                      ),
                      DropdownMenuItem(
                        value: FishingMethod.boat,
                        child: Text(controller.getFishingMethodDescription(FishingMethod.boat)),
                      ),
                      DropdownMenuItem(
                        value: FishingMethod.platform,
                        child: Text(controller.getFishingMethodDescription(FishingMethod.platform)),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        controller.selectedFishingMethod.value = value;
                      }
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: '区域',
                      border: OutlineInputBorder(),
                    ),
                    value: controller.selectedCountyForm.value,
                    items: const [
                      DropdownMenuItem(value: '厦门', child: Text('厦门')),
                      DropdownMenuItem(value: '漳州', child: Text('漳州')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        controller.selectedCountyForm.value = value;
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 照片/视频上传
            const Text('照片/视频验证', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('为增加透明度，请提供以下材料:', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            
            // 活鱼照片
            _buildPhotoUploadCard(
              title: '活鱼照片',
              photo: _fishPhoto,
              onTap: () => _pickFishPhoto(),
            ),
            const SizedBox(height: 8),
            
            // 测量照片
            _buildPhotoUploadCard(
              title: '测量照片',
              subtitle: '鱼长重量测量照片（去容器重量）',
              photo: _measurementPhoto,
              onTap: () => _pickMeasurementPhoto(),
            ),
            const SizedBox(height: 8),
            
            // 环境视频
            _buildVideoUploadCard(
              title: '环境视频',
              subtitle: '周围环境视频，增加透明度',
              video: _environmentVideo,
              onTap: () => _pickEnvironmentVideo(),
            ),
            const SizedBox(height: 20),

            // 额外信息（可选）
            const Text('额外信息（可选）', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(
                labelText: '使用的饵料',
                border: OutlineInputBorder(),
              ),
              onChanged: controller.baitUsed,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(
                labelText: '使用的装备',
                border: OutlineInputBorder(),
              ),
              onChanged: controller.gearUsed,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: '天气状况',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: controller.weatherCondition,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      labelText: '潮汐状况',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: controller.tideCondition,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(
                labelText: '捕获时间（HH:mm）',
                border: OutlineInputBorder(),
              ),
              onChanged: controller.catchTime,
            ),
            const SizedBox(height: 30),

            // 提交按钮
            Obx(() {
              if (controller.isLoading.value) {
                return const Center(child: CircularProgressIndicator());
              }
              
              return SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.send),
                  label: const Text('提交参赛记录'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: controller.submitCompetitionEntry,
                ),
              );
            }),

            // 错误提示
            Obx(() {
              if (controller.error.value.isNotEmpty) {
                return Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: Text(
                    controller.error.value,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                );
              }
              return const SizedBox();
            }),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentCompetitionCard() {
    final competition = controller.currentCompetition.value;
    if (competition == null) {
      return Container();
    }

    return Card(
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.emoji_events, color: Colors.blue),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    competition.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ),
                Chip(
                  label: Text(controller.getCompetitionStatusDescription(competition.status)),
                  backgroundColor: Colors.blue.withOpacity(0.2),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              competition.description,
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySelector() {
    final categories = controller.competitionCategories;
    if (categories.isEmpty) {
      return const Text('暂无类别', style: TextStyle(color: Colors.grey));
    }

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: categories.map((category) {
          final isSelected = controller.selectedCategoryId.value == category.id;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(category.categoryName, style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : null,
                  )),
                  if (category.minLengthCm != null)
                    Text(
                      '${category.minLengthCm}cm 上榜',
                      style: TextStyle(
                        fontSize: 11,
                        color: isSelected ? Colors.white : Colors.grey,
                      ),
                    ),
                ],
              ),
              selected: isSelected,
              onSelected: (_) => controller.switchCategory(category.id),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPhotoUploadCard({
    required String title,
    String? subtitle,
    required File? photo,
    required VoidCallback onTap,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.photo_camera, size: 20),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
            const SizedBox(height: 8),
            if (photo != null)
              Container(
                height: 150,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  image: DecorationImage(
                    image: FileImage(photo),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.add_a_photo),
              label: Text(photo == null ? '上传照片' : '更换照片'),
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 40),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoUploadCard({
    required String title,
    String? subtitle,
    required File? video,
    required VoidCallback onTap,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.videocam, size: 20),
                const SizedBox(width: 8),
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
            const SizedBox(height: 8),
            if (video != null)
              Container(
                height: 100,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.videocam, size: 40, color: Colors.blue),
                      const SizedBox(height: 8),
                      Text(
                        '视频已选择: ${video.path.split('/').last}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.video_call),
              label: Text(video == null ? '上传视频' : '更换视频'),
              onPressed: onTap,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 40),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickFishPhoto() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _fishPhoto = File(pickedFile.path);
      });
      controller.fishPhotoPath.value = pickedFile.path;
    }
  }

  Future<void> _pickMeasurementPhoto() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _measurementPhoto = File(pickedFile.path);
      });
      controller.measurementPhotoPath.value = pickedFile.path;
    }
  }

  Future<void> _pickEnvironmentVideo() async {
    final pickedFile = await _picker.pickVideo(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _environmentVideo = File(pickedFile.path);
      });
      controller.environmentVideoPath.value = pickedFile.path;
    }
  }

  void _showCompetitionRules(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('比赛规则'),
          content: SingleChildScrollView(
            child: Text(controller.getCompetitionRules()),
          ),
          actions: [
            TextButton(
              onPressed: () => Get.back(),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    // 清理控制器中的表单数据
    controller.clearEntryForm();
    super.dispose();
  }
}