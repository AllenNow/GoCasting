import 'package:flutter/material.dart';

/// 隐私政策页面
///
/// App Store / Google Play 审核要求：
/// 使用了定位权限（geolocator）和相册/相机权限（image_picker）的 App
/// 必须提供可访问的隐私政策。
class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('隐私政策'),
      ),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: _PrivacyContent(),
      ),
    );
  }
}

class _PrivacyContent extends StatelessWidget {
  const _PrivacyContent();

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('GoCasting 隐私政策',
            style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text('最后更新：2024年1月',
            style: textTheme.bodySmall?.copyWith(color: colorScheme.outline)),
        const SizedBox(height: 24),

        _section(context, '概述',
            'GoCasting 是一款完全在本地运行的远投钓鱼助手 App。我们重视您的隐私，您的所有数据均存储在您的设备上，不会上传至任何服务器。'),

        _section(context, '我们收集哪些数据',
            'GoCasting 不收集任何个人身份信息。App 的所有功能均在您的设备本地运行，包括：\n\n'
            '• 装备库存和维护记录\n'
            '• 渔获日志\n'
            '• 出行规划数据\n'
            '• 个人设置和偏好\n\n'
            '以上数据仅保存在您的设备本地，不会被传输至任何第三方。'),

        _section(context, '位置权限',
            '当您使用地图功能或需要定位当前位置时，App 会请求访问您的位置信息。\n\n'
            '• 位置信息仅用于在地图上显示您的当前位置\n'
            '• 位置数据不会被存储或上传\n'
            '• 您可以随时在设备设置中关闭位置权限\n\n'
            '如您不授予位置权限，地图定位功能将不可用，但 App 的其他功能不受影响。'),

        _section(context, '相机和相册权限',
            '当您为装备添加照片或保存收据时，App 会请求访问您的相机和相册。\n\n'
            '• 照片仅保存在您的设备本地\n'
            '• 照片不会被上传至任何服务器\n'
            '• 您可以随时在设备设置中关闭相关权限'),

        _section(context, '高德地图服务',
            '地图功能使用高德地图 SDK，地图瓦片和 POI 数据由高德地图服务提供。使用地图功能时，您的位置信息可能会发送至高德地图服务器以获取地图数据。高德地图的隐私政策请参阅：https://lbs.amap.com/pages/privacy'),

        _section(context, '天气数据',
            '天气功能通过高德天气 API 获取实时天气信息。查询天气时，您当前位置的坐标会发送至高德天气服务以获取对应天气数据。'),

        _section(context, '数据备份',
            '当您使用数据备份功能时，App 会将您的本地数据打包为 .gcbak 文件并通过系统分享功能导出。备份文件的存储和传输由您自行控制。'),

        _section(context, '儿童隐私',
            'GoCasting 不面向 13 岁以下儿童，我们不会主动收集儿童的个人信息。'),

        _section(context, '联系我们',
            '如您对本隐私政策有任何疑问，请通过以下方式联系我们：\n\ngocasting.app@gmail.com'),

        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            '本政策随 App 版本更新，变更后将在 App 内通知。继续使用本 App 即表示您同意本政策。',
            style: textTheme.bodySmall,
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _section(BuildContext context, String title, String content) {
    final textTheme = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(content, style: textTheme.bodyMedium),
        ],
      ),
    );
  }
}
