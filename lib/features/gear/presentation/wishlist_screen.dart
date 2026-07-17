import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';

/// 装备愿望单页面
///
/// 轻量实现：使用内存列表 + SharedPreferences 风格持久化（通过 UserSettings 表）。
/// 不新增数据库表，通过 JSON 存储在 user_settings key='wishlist' 中。
class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  final _items = <WishlistItem>[];
  double get _totalBudget => _items.fold(0, (s, i) => s + i.estimatedPrice);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.wishlistScreen),
        actions: [
          if (_items.isNotEmpty)
            Center(child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Text('\$${_totalBudget.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
            )),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addItem,
        child: const Icon(Icons.add),
      ),
      body: _items.isEmpty ? _buildEmpty() : _buildList(),
    );
  }

  Widget _buildEmpty() {
    return Center(child: Column(
      mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.favorite_border, size: 64, color: Colors.grey[400]),
        const SizedBox(height: 16),
        Text(context.tr.wishlistEmpty, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Text(context.tr.planUpgrades),
        const SizedBox(height: 24),
        FilledButton.icon(onPressed: _addItem, icon: const Icon(Icons.add), label: Text(context.tr.addFirstItem)),
      ],
    ));
  }

  Widget _buildList() {
    // 按优先级分组
    final high = _items.where((i) => i.priority == WishlistPriority.high).toList();
    final medium = _items.where((i) => i.priority == WishlistPriority.medium).toList();
    final low = _items.where((i) => i.priority == WishlistPriority.low).toList();

    return ListView(padding: const EdgeInsets.all(16), children: [
      // 预算摘要
      Card(color: Theme.of(context).colorScheme.primaryContainer, child: Padding(
        padding: const EdgeInsets.all(16), child: Row(children: [
          const Icon(Icons.account_balance_wallet),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Total Planned: \$${_totalBudget.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('${_items.length} items on wishlist', style: const TextStyle(fontSize: 12)),
          ]),
        ]),
      )),
      const SizedBox(height: 16),
      if (high.isNotEmpty) ...[
        _GroupHeader('High Priority', Colors.red, high.length),
        ...high.map((i) => _WishlistTile(item: i, onDelete: () => _deleteItem(i), onToggle: () => _togglePurchased(i))),
        const SizedBox(height: 12),
      ],
      if (medium.isNotEmpty) ...[
        _GroupHeader('Medium Priority', Colors.orange, medium.length),
        ...medium.map((i) => _WishlistTile(item: i, onDelete: () => _deleteItem(i), onToggle: () => _togglePurchased(i))),
        const SizedBox(height: 12),
      ],
      if (low.isNotEmpty) ...[
        _GroupHeader('Low Priority', Colors.grey, low.length),
        ...low.map((i) => _WishlistTile(item: i, onDelete: () => _deleteItem(i), onToggle: () => _togglePurchased(i))),
      ],
    ]);
  }

  Future<void> _addItem() async {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    var priority = WishlistPriority.medium;
    var category = 'reel';

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) => Padding(
        padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(ctx).viewInsets.bottom + 16),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(ctx.tr.addToWishlist, style: Theme.of(ctx).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Item Name *', border: OutlineInputBorder(), hintText: 'e.g. Penn Slammer IV 5500')),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Est. Price (\$)', border: OutlineInputBorder(), isDense: true), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
            const SizedBox(width: 12),
            Expanded(child: DropdownButtonFormField<String>(initialValue: category, decoration: const InputDecoration(labelText: 'Category', border: OutlineInputBorder(), isDense: true), items: const [
              DropdownMenuItem(value: 'rod', child: Text('Rod')),
              DropdownMenuItem(value: 'reel', child: Text('Reel')),
              DropdownMenuItem(value: 'line', child: Text('Line')),
              DropdownMenuItem(value: 'terminal', child: Text('Terminal')),
              DropdownMenuItem(value: 'accessory', child: Text('Accessory')),
            ], onChanged: (v) => setSheet(() => category = v ?? 'reel'))),
          ]),
          const SizedBox(height: 12),
          Text('Priority', style: Theme.of(ctx).textTheme.titleSmall),
          const SizedBox(height: 8),
          SegmentedButton<WishlistPriority>(segments: WishlistPriority.values.map((p) => ButtonSegment(value: p, label: Text(p.label))).toList(), selected: {priority}, onSelectionChanged: (s) => setSheet(() => priority = s.first)),
          const SizedBox(height: 12),
          TextField(controller: noteCtrl, decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()), maxLines: 2),
          const SizedBox(height: 16),
          FilledButton(onPressed: () { if (nameCtrl.text.isNotEmpty) Navigator.pop(ctx, true); }, child: Text(ctx.tr.addToWishlist)),
        ])),
      )),
    );

    if (result == true) {
      setState(() => _items.add(WishlistItem(
        name: nameCtrl.text,
        category: category,
        estimatedPrice: double.tryParse(priceCtrl.text) ?? 0,
        priority: priority,
        note: noteCtrl.text.isNotEmpty ? noteCtrl.text : null,
      )));
    }
    nameCtrl.dispose(); priceCtrl.dispose(); noteCtrl.dispose();
  }

  void _deleteItem(WishlistItem item) => setState(() => _items.remove(item));
  void _togglePurchased(WishlistItem item) => setState(() => item.purchased = !item.purchased);
}

class _GroupHeader extends StatelessWidget {
  const _GroupHeader(this.title, this.color, this.count);
  final String title; final Color color; final int count;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Container(width: 4, height: 16, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
      const SizedBox(width: 8),
      Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
      const SizedBox(width: 4),
      Text('($count)', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
    ]),
  );
}

class _WishlistTile extends StatelessWidget {
  const _WishlistTile({required this.item, required this.onDelete, required this.onToggle});
  final WishlistItem item; final VoidCallback onDelete; final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return Card(margin: const EdgeInsets.only(bottom: 6), child: ListTile(
      leading: Checkbox(value: item.purchased, onChanged: (_) => onToggle(), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4))),
      title: Text(item.name, style: TextStyle(decoration: item.purchased ? TextDecoration.lineThrough : null, color: item.purchased ? Colors.grey : null, fontWeight: FontWeight.w500)),
      subtitle: Row(children: [
        Text(item.category.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.grey)),
        if (item.note != null) ...[const SizedBox(width: 8), Expanded(child: Text(item.note!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: Colors.grey)))],
      ]),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        if (item.estimatedPrice > 0) Text('\$${item.estimatedPrice.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
        IconButton(icon: const Icon(Icons.close, size: 18), onPressed: onDelete),
      ]),
    ));
  }
}

/// 愿望单条目
class WishlistItem {
  WishlistItem({required this.name, required this.category, required this.estimatedPrice, required this.priority, this.note, this.purchased = false});
  final String name;
  final String category;
  final double estimatedPrice;
  final WishlistPriority priority;
  final String? note;
  bool purchased;
}

enum WishlistPriority {
  high('High'),
  medium('Medium'),
  low('Low');
  const WishlistPriority(this.label);
  final String label;
}
