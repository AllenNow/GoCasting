// ignore_for_file: use_build_context_synchronously
import 'package:flutter/material.dart';

import '../../core/database/user_db.dart';
import '../../l10n/l10n.dart';
import 'share_card_service.dart';

/// 渔获分享卡片
///
/// 生成一张精美的渔获卡片图片，可分享到微信/朋友圈/微博等社交平台。
class CatchShareCard extends StatelessWidget {
  const CatchShareCard({super.key, required this.catchLog, required this.repaintKey});
  final CatchLog catchLog;
  final GlobalKey repaintKey;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1a237e), Color(0xFF0d47a1), Color(0xFF01579b)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 头部：App 标识
            Row(children: [
              const Text('🎣', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 8),
              const Text('GoCasting', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500)),
              const Spacer(),
              Text(catchLog.date, style: const TextStyle(color: Colors.white54, fontSize: 12)),
            ]),
            const SizedBox(height: 20),

            // 鱼种名称（大字）
            Text(
              catchLog.species,
              style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            // 数据行
            Row(children: [
              if (catchLog.weightLb != null)
                _DataChip(icon: '⚖️', value: '${catchLog.weightLb!.toStringAsFixed(1)} lb'),
              if (catchLog.lengthIn != null)
                _DataChip(icon: '📏', value: '${catchLog.lengthIn!.toStringAsFixed(1)}"'),
              if (catchLog.time != null)
                _DataChip(icon: '🕐', value: catchLog.time!),
            ]),
            const SizedBox(height: 12),

            // 条件信息
            if (catchLog.bait != null || catchLog.rigType != null || catchLog.tideState != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (catchLog.bait != null)
                      _InfoRow(label: '饵料', value: catchLog.bait!),
                    if (catchLog.rigType != null)
                      _InfoRow(label: '钓组', value: catchLog.rigType!),
                    if (catchLog.tideState != null)
                      _InfoRow(label: '潮汐', value: _tideName(catchLog.tideState!)),
                  ],
                ),
              ),
            const SizedBox(height: 12),

            // 位置
            if (catchLog.location != null)
              Row(children: [
                const Text('📍', style: TextStyle(fontSize: 14)),
                const SizedBox(width: 4),
                Text(catchLog.location!, style: const TextStyle(color: Colors.white70, fontSize: 13)),
              ]),

            // 放流标记
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: catchLog.released ? Colors.green.withValues(alpha: 0.3) : Colors.orange.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                catchLog.released ? '🐟 已放流' : '🍽️ 已保留',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ),

            // 底部水印
            const SizedBox(height: 16),
            const Center(child: Text(
              '— GoCasting 远投钓鱼助手 —',
              style: TextStyle(color: Colors.white38, fontSize: 10),
            )),
          ],
        ),
      ),
    );
  }

  String _tideName(String tide) => switch (tide) {
        'rising' => '涨潮',
        'falling' => '落潮',
        'high' => '满潮',
        'low' => '低潮',
        'slack' => '平潮',
        _ => tide,
      };
}

/// 成就分享卡片
class AchievementShareCard extends StatelessWidget {
  const AchievementShareCard({
    super.key,
    required this.emoji,
    required this.title,
    required this.description,
    required this.tier,
    required this.repaintKey,
  });
  final String emoji;
  final String title;
  final String description;
  final String tier; // 铜/银/金/钻石 emoji
  final GlobalKey repaintKey;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360,
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF4a148c), Color(0xFF6a1b9a), Color(0xFF7b1fa2)],
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 成就图标（大）
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Center(child: Text(emoji, style: const TextStyle(fontSize: 40))),
            ),
            const SizedBox(height: 16),

            // 成就解锁标题
            const Text('🏆 成就解锁！', style: TextStyle(color: Colors.amber, fontSize: 14, fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),

            // 成就名称
            Text(title, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            const SizedBox(height: 8),

            // 描述
            Text(description, style: const TextStyle(color: Colors.white70, fontSize: 14), textAlign: TextAlign.center),
            const SizedBox(height: 12),

            // 等级标记
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.amber.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text('$tier 等级', style: const TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold)),
            ),

            // 底部水印
            const SizedBox(height: 20),
            const Text(
              '— GoCasting 远投钓鱼助手 —',
              style: TextStyle(color: Colors.white38, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }
}

/// 分享按钮辅助方法
class ShareHelper {
  /// 分享渔获卡片
  static Future<void> shareCatch(BuildContext context, CatchLog catchLog) async {
    final key = GlobalKey();
    
    // 显示预览+确认弹窗
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.transparent,
        contentPadding: EdgeInsets.zero,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchShareCard(catchLog: catchLog, repaintKey: key),
            const SizedBox(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('取消', style: TextStyle(color: Colors.white70)),
              ),
              const SizedBox(width: 16),
              FilledButton.icon(
                onPressed: () async {
                  Navigator.pop(ctx);
                  // 延迟确保 dialog 关闭后再截图
                  await Future.delayed(const Duration(milliseconds: 100));
                },
                icon: const Icon(Icons.share),
                label: Text(context.tr.shareBtn),
              ),
            ]),
          ],
        ),
      ),
    );

    // 在 Overlay 中渲染卡片并截图
    await _renderAndShare(context, key, CatchShareCard(catchLog: catchLog, repaintKey: key),
      fileName: 'catch_${catchLog.species}_${catchLog.date}.png',
      shareText: '我在 GoCasting 钓到了一条 ${catchLog.species}！${catchLog.weightLb != null ? '${catchLog.weightLb!.toStringAsFixed(1)} lb' : ''}',
    );
  }

  /// 分享成就卡片
  static Future<void> shareAchievement(BuildContext context, {
    required String emoji,
    required String title,
    required String description,
    required String tier,
  }) async {
    final key = GlobalKey();
    await _renderAndShare(context, key,
      AchievementShareCard(emoji: emoji, title: title, description: description, tier: tier, repaintKey: key),
      fileName: 'achievement_$title.png',
      shareText: '🏆 我在 GoCasting 解锁了成就【$title】！',
    );
  }

  /// 在 Overlay 中渲染并截图分享
  static Future<void> _renderAndShare(BuildContext context, GlobalKey key, Widget card, {
    required String fileName,
    String? shareText,
  }) async {
    // 使用 OverlayEntry 在屏幕外渲染卡片
    final overlay = Overlay.of(context);
    final entry = OverlayEntry(builder: (ctx) => Positioned(
      left: -1000, // 放在屏幕外
      child: Material(child: card),
    ));
    overlay.insert(entry);

    // 等待渲染完成
    await Future.delayed(const Duration(milliseconds: 300));

    // 截图并分享
    await ShareCardService.shareWidget(
      repaintKey: key,
      fileName: fileName,
      shareText: shareText,
    );

    // 移除 overlay
    entry.remove();
  }
}

// === 内部组件 ===

class _DataChip extends StatelessWidget {
  const _DataChip({required this.icon, required this.value});
  final String icon; final String value;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(right: 8),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(16)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Text(icon, style: const TextStyle(fontSize: 12)),
      const SizedBox(width: 4),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
    ]),
  );
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label; final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: Row(children: [
      SizedBox(width: 40, child: Text(label, style: const TextStyle(color: Colors.white54, fontSize: 12))),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 13)),
    ]),
  );
}
