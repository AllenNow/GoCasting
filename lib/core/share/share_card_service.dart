import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// 分享卡片生成服务
///
/// 将 Widget 渲染为图片，保存为 PNG 文件，通过系统分享面板分享。
class ShareCardService {
  const ShareCardService();

  /// 将 Widget 渲染为图片并分享
  ///
  /// [cardWidget] 要截图的卡片 Widget（必须有固定尺寸）
  /// [fileName] 保存的文件名（不含路径）
  /// [shareText] 分享时附带的文字说明
  static Future<void> shareWidget({
    required GlobalKey repaintKey,
    String fileName = 'share_card.png',
    String? shareText,
  }) async {
    try {
      // 获取 RenderRepaintBoundary
      final boundary = repaintKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return;

      // 渲染为图片（3x 分辨率确保清晰）
      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) return;

      // 保存到临时目录
      final tempDir = await getTemporaryDirectory();
      final filePath = p.join(tempDir.path, fileName);
      final file = File(filePath);
      await file.writeAsBytes(byteData.buffer.asUint8List());

      // 通过系统分享面板分享
      await Share.shareXFiles(
        [XFile(filePath)],
        text: shareText,
      );
    } catch (e) {
      debugPrint('ShareCardService error: $e');
    }
  }
}
