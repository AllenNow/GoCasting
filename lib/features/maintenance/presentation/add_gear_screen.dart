import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../core/database/user_db.dart';
import '../data/maintenance_repository.dart';

/// 添加装备页面
class AddGearScreen extends StatefulWidget {
  const AddGearScreen({super.key});

  @override
  State<AddGearScreen> createState() => _AddGearScreenState();
}

class _AddGearScreenState extends State<AddGearScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _brandCtrl = TextEditingController();
  final _modelCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  String _gearType = 'reel';
  DateTime? _purchaseDate;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _brandCtrl.dispose();
    _modelCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final repo = Get.find<MaintenanceRepository>();
    await repo.addGear(UserGearCompanion.insert(
      gearType: _gearType,
      customName: _nameCtrl.text.trim(),
      brand: drift.Value(_brandCtrl.text.trim().isEmpty ? null : _brandCtrl.text.trim()),
      model: drift.Value(_modelCtrl.text.trim().isEmpty ? null : _modelCtrl.text.trim()),
      purchaseDate: drift.Value(_purchaseDate?.toIso8601String().split('T').first),
      pricePaid: drift.Value(double.tryParse(_priceCtrl.text)),
      createdAt: DateTime.now().toIso8601String(),
    ));
    Get.back();
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
            DropdownButtonFormField<String>(
              initialValue: _gearType,
              decoration: const InputDecoration(labelText: 'Gear Type', prefixIcon: Icon(Icons.category)),
              items: const [
                DropdownMenuItem(value: 'reel', child: Text('Reel')),
                DropdownMenuItem(value: 'rod', child: Text('Rod')),
                DropdownMenuItem(value: 'line', child: Text('Line')),
                DropdownMenuItem(value: 'other', child: Text('Other')),
              ],
              onChanged: (v) => setState(() => _gearType = v!),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(labelText: 'Name *', prefixIcon: Icon(Icons.label)),
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(controller: _brandCtrl, decoration: const InputDecoration(labelText: 'Brand', prefixIcon: Icon(Icons.business))),
            const SizedBox(height: 16),
            TextFormField(controller: _modelCtrl, decoration: const InputDecoration(labelText: 'Model', prefixIcon: Icon(Icons.precision_manufacturing))),
            const SizedBox(height: 16),
            TextFormField(controller: _priceCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Price Paid', prefixIcon: Icon(Icons.attach_money))),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.calendar_today),
              title: Text(_purchaseDate == null ? 'Purchase Date (optional)' : 'Purchased: ${_purchaseDate!.toIso8601String().split('T').first}'),
              onTap: () async {
                final d = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2000), lastDate: DateTime.now());
                if (d != null) setState(() => _purchaseDate = d);
              },
            ),
            const SizedBox(height: 32),
            FilledButton.icon(onPressed: _save, icon: const Icon(Icons.save), label: const Text('Save Gear')),
          ],
        ),
      ),
    );
  }
}
