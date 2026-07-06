import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/database/user_db.dart';
import '../providers/maintenance_providers.dart';

/// 添加装备页面
class AddGearScreen extends ConsumerStatefulWidget {
  const AddGearScreen({super.key});

  @override
  ConsumerState<AddGearScreen> createState() => _AddGearScreenState();
}

class _AddGearScreenState extends ConsumerState<AddGearScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _priceController = TextEditingController();

  String _gearType = 'reel';
  DateTime? _purchaseDate;

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final repo = ref.read(maintenanceRepositoryProvider);
    await repo.addGear(UserGearCompanion.insert(
      gearType: _gearType,
      customName: _nameController.text.trim(),
      brand: Value(_brandController.text.trim().isEmpty
          ? null
          : _brandController.text.trim()),
      model: Value(_modelController.text.trim().isEmpty
          ? null
          : _modelController.text.trim()),
      purchaseDate: Value(_purchaseDate?.toIso8601String().split('T').first),
      pricePaid: Value(double.tryParse(_priceController.text)),
      createdAt: DateTime.now().toIso8601String(),
    ));

    // 刷新列表
    ref.invalidate(allGearProvider);

    if (mounted) {
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Gear')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 装备类型
            DropdownButtonFormField<String>(
              initialValue: _gearType,
              decoration: const InputDecoration(
                labelText: 'Gear Type',
                prefixIcon: Icon(Icons.category),
              ),
              items: const [
                DropdownMenuItem(value: 'reel', child: Text('Reel')),
                DropdownMenuItem(value: 'rod', child: Text('Rod')),
                DropdownMenuItem(value: 'line', child: Text('Line')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: (v) => setState(() => _gearType = v!),
            ),
            const SizedBox(height: 16),
            // 名称
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Name *',
                hintText: 'e.g., My Penn Battle III',
                prefixIcon: Icon(Icons.label),
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Name is required' : null,
            ),
            const SizedBox(height: 16),
            // 品牌
            TextFormField(
              controller: _brandController,
              decoration: const InputDecoration(
                labelText: 'Brand',
                hintText: 'e.g., Penn',
                prefixIcon: Icon(Icons.business),
              ),
            ),
            const SizedBox(height: 16),
            // 型号
            TextFormField(
              controller: _modelController,
              decoration: const InputDecoration(
                labelText: 'Model',
                hintText: 'e.g., Battle III 5000',
                prefixIcon: Icon(Icons.precision_manufacturing),
              ),
            ),
            const SizedBox(height: 16),
            // 购买价格
            TextFormField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Price Paid',
                hintText: 'e.g., 129.99',
                prefixIcon: Icon(Icons.attach_money),
              ),
            ),
            const SizedBox(height: 16),
            // 购买日期
            ListTile(
              leading: const Icon(Icons.calendar_today),
              title: Text(_purchaseDate == null
                  ? 'Purchase Date (optional)'
                  : 'Purchased: ${_purchaseDate!.toIso8601String().split('T').first}'),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: DateTime.now(),
                  firstDate: DateTime(2000),
                  lastDate: DateTime.now(),
                );
                if (date != null) {
                  setState(() => _purchaseDate = date);
                }
              },
            ),
            const SizedBox(height: 32),
            // 保存按钮
            FilledButton.icon(
              onPressed: _save,
              icon: const Icon(Icons.save),
              label: const Text('Save Gear'),
            ),
          ],
        ),
      ),
    );
  }
}
