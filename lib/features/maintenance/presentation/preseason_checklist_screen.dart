import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../../../l10n/l10n.dart';
import '../domain/preseason_checklist.dart';

/// 季前检查清单页面
class PreseasonChecklistScreen extends StatefulWidget {
  const PreseasonChecklistScreen({super.key, required this.gear});
  final UserGearData gear;

  @override
  State<PreseasonChecklistScreen> createState() => _PreseasonChecklistScreenState();
}

class _PreseasonChecklistScreenState extends State<PreseasonChecklistScreen> {
  static const _generator = PreseasonChecklistGenerator();
  late final List<ChecklistItem> _items;
  final Set<String> _completed = {};

  @override
  void initState() {
    super.initState();
    _items = _generator.generate(
      gearType: widget.gear.gearType,
      storageDays: _calculateStorageDays(),
    );
  }

  int _calculateStorageDays() {
    // 如果装备状态是 stored，用当前日期减去最近一次使用日期
    // 如果没有使用记录，用当前日期减去购买日期
    // 默认按 30 天处理
    if (widget.gear.purchaseDate != null) {
      final purchase = DateTime.tryParse(widget.gear.purchaseDate!);
      if (purchase != null) {
        return DateTime.now().difference(purchase).inDays;
      }
    }
    return 30;
  }

  double get _progress => _items.isEmpty ? 0 : _completed.length / _items.length;
  bool get _allComplete => _completed.length == _items.length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Season Check — ${widget.gear.customName}'),
        actions: [
          if (_allComplete)
            IconButton(
              icon: const Icon(Icons.check_circle, color: Colors.green),
              onPressed: _markAllDone,
              tooltip: 'All checks complete!',
            ),
        ],
      ),
      body: Column(
        children: [
          // 进度条
          _buildProgressHeader(context),
          // 检查项列表
          Expanded(child: _buildCheckList(context)),
        ],
      ),
      bottomNavigationBar: _allComplete ? _buildCompleteBar(context) : null,
    );
  }

  Widget _buildProgressHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${_completed.length} / ${_items.length} 项已完成',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              Text(
                '${(_progress * 100).toInt()}%',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: _allComplete ? Colors.green : Theme.of(context).colorScheme.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _progress,
              minHeight: 8,
              backgroundColor: Colors.grey[300],
              color: _allComplete ? Colors.green : Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '装备类型: ${widget.gear.gearType.toUpperCase()} • 存储约 ${_calculateStorageDays()} 天',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  Widget _buildCheckList(BuildContext context) {
    // 按优先级分组
    final critical = _items.where((i) => i.priority == CheckPriority.critical).toList();
    final normal = _items.where((i) => i.priority == CheckPriority.normal).toList();
    final optional = _items.where((i) => i.priority == CheckPriority.optional).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (critical.isNotEmpty) ...[
          _SectionHeader(title: '关键检查', color: Colors.red, count: critical.length),
          ...critical.map((item) => _CheckItem(
                item: item,
                completed: _completed.contains(item.id),
                onToggle: () => _toggleItem(item.id),
              )),
          const SizedBox(height: 16),
        ],
        if (normal.isNotEmpty) ...[
          _SectionHeader(title: '常规检查', color: Colors.blue, count: normal.length),
          ...normal.map((item) => _CheckItem(
                item: item,
                completed: _completed.contains(item.id),
                onToggle: () => _toggleItem(item.id),
              )),
          const SizedBox(height: 16),
        ],
        if (optional.isNotEmpty) ...[
          _SectionHeader(title: '可选检查', color: Colors.grey, count: optional.length),
          ...optional.map((item) => _CheckItem(
                item: item,
                completed: _completed.contains(item.id),
                onToggle: () => _toggleItem(item.id),
              )),
        ],
      ],
    );
  }

  Widget _buildCompleteBar(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: FilledButton.icon(
          onPressed: _markAllDone,
          icon: const Icon(Icons.celebration),
          label: Text(context.tr.allChecksComplete),
          style: FilledButton.styleFrom(
            backgroundColor: Colors.green,
            minimumSize: const Size.fromHeight(48),
          ),
        ),
      ),
    );
  }

  void _toggleItem(String id) {
    setState(() {
      if (_completed.contains(id)) {
        _completed.remove(id);
      } else {
        _completed.add(id);
      }
    });
  }

  void _markAllDone() {
    Get.snackbar(
      'Season Ready! 🎣',
      '${widget.gear.customName} has passed all pre-season checks.',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: Colors.green,
      colorText: Colors.white,
    );
    Navigator.of(context).pop(true);
  }
}

/// 分组标题
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.color, required this.count});
  final String title;
  final Color color;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 20,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(width: 8),
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
          const SizedBox(width: 8),
          Text('($count)', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ],
      ),
    );
  }
}

/// 单个检查项
class _CheckItem extends StatelessWidget {
  const _CheckItem({required this.item, required this.completed, required this.onToggle});
  final ChecklistItem item;
  final bool completed;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onToggle,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Checkbox(
                value: completed,
                onChanged: (_) => onToggle(),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        decoration: completed ? TextDecoration.lineThrough : null,
                        color: completed ? Colors.grey : null,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.description,
                      style: TextStyle(
                        fontSize: 13,
                        color: completed ? Colors.grey[400] : Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
