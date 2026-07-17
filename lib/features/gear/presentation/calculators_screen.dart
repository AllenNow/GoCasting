import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';
import '../domain/fishing_calculators.dart';

/// 装备计算器工具箱主页面
class CalculatorsScreen extends StatelessWidget {
  const CalculatorsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.calculatorsScreen)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _CalcTile(
            icon: Icons.speed,
            color: Colors.blue,
            title: context.tr.dragSetting,
            subtitle: context.tr.dragSettingDesc,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const _DragCalcPage())),
          ),
          _CalcTile(
            icon: Icons.linear_scale,
            color: Colors.green,
            title: context.tr.lineCapacity,
            subtitle: context.tr.lineCapacityDesc,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const _LineCapacityPage())),
          ),
          _CalcTile(
            icon: Icons.link,
            color: Colors.orange,
            title: context.tr.shockLeader,
            subtitle: context.tr.shockLeaderDesc,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const _ShockLeaderPage())),
          ),
          _CalcTile(
            icon: Icons.anchor,
            color: Colors.teal,
            title: context.tr.sinkerWeight,
            subtitle: context.tr.sinkerWeightDesc,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const _SinkerWeightPage())),
          ),
        ],
      ),
    );
  }
}

class _CalcTile extends StatelessWidget {
  const _CalcTile({required this.icon, required this.color, required this.title, required this.subtitle, required this.onTap});
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(backgroundColor: color.withValues(alpha: 0.1), child: Icon(icon, color: color)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

// ========== 拖力计算器页面 ==========

class _DragCalcPage extends StatefulWidget {
  const _DragCalcPage();
  @override
  State<_DragCalcPage> createState() => _DragCalcPageState();
}

class _DragCalcPageState extends State<_DragCalcPage> {
  final _lineController = TextEditingController(text: '20');
  double _knotRetention = 0.80;
  DragStyle _style = DragStyle.normal;
  DragResult? _result;

  @override
  void initState() {
    super.initState();
    _calculate();
  }

  void _calculate() {
    final lb = double.tryParse(_lineController.text);
    if (lb == null || lb <= 0) return;
    setState(() {
      _result = const DragCalculator().calculate(
        lineTestLb: lb,
        knotRetention: _knotRetention,
        style: _style,
      );
    });
  }

  @override
  void dispose() { _lineController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.dragSetting)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(
          controller: _lineController,
          decoration: const InputDecoration(labelText: 'Line Test (lb)', border: OutlineInputBorder(), suffixText: 'lb'),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          onChanged: (_) => _calculate(),
        ),
        const SizedBox(height: 16),
        Text('Knot Retention: ${(_knotRetention * 100).toInt()}%'),
        Slider(value: _knotRetention, min: 0.50, max: 1.0, divisions: 10,
          label: '${(_knotRetention * 100).toInt()}%',
          onChanged: (v) { _knotRetention = v; _calculate(); }),
        const SizedBox(height: 8),
        Text(context.tr.fishingStyle, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: DragStyle.values.map((s) => ChoiceChip(
          label: Text(s.label), selected: _style == s,
          onSelected: (_) { _style = s; _calculate(); },
        )).toList()),
        const SizedBox(height: 24),
        if (_result != null) _DragResultCard(result: _result!),
      ]),
    );
  }
}

class _DragResultCard extends StatelessWidget {
  const _DragResultCard({required this.result});
  final DragResult result;

  @override
  Widget build(BuildContext context) {
    return Card(color: Colors.blue.withValues(alpha: 0.05), child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(context.tr.result, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Center(child: Text('${result.recommendedLb.toStringAsFixed(1)} lb', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.blue))),
        Center(child: Text('(${result.recommendedKg.toStringAsFixed(2)} kg)', style: const TextStyle(color: Colors.grey))),
        const SizedBox(height: 12),
        _Row(context.tr.effectiveLineStrength, '${result.effectiveLineLb.toStringAsFixed(1)} lb'),
        _Row(context.tr.dragPercentage, '${result.dragPercent.toStringAsFixed(0)}%'),
        _Row(context.tr.safeRange, '${result.minLb.toStringAsFixed(1)} — ${result.maxLb.toStringAsFixed(1)} lb'),
      ]),
    ));
  }
}

// ========== 线容量计算器页面 ==========

class _LineCapacityPage extends StatefulWidget {
  const _LineCapacityPage();
  @override
  State<_LineCapacityPage> createState() => _LineCapacityPageState();
}

class _LineCapacityPageState extends State<_LineCapacityPage> {
  final _capController = TextEditingController(text: '300');
  final _knownDiaController = TextEditingController(text: '0.33');
  final _targetDiaController = TextEditingController(text: '0.23');
  final _mainLineYdsController = TextEditingController(text: '200');
  final _backingDiaController = TextEditingController(text: '0.18');
  LineCapacityResult? _simpleResult;
  BackingResult? _backingResult;

  @override
  void initState() { super.initState(); _calculate(); }

  void _calculate() {
    final cap = double.tryParse(_capController.text) ?? 0;
    final knownDia = double.tryParse(_knownDiaController.text) ?? 0;
    final targetDia = double.tryParse(_targetDiaController.text) ?? 0;
    final mainYds = double.tryParse(_mainLineYdsController.text) ?? 0;
    final backDia = double.tryParse(_backingDiaController.text) ?? 0;

    if (cap > 0 && knownDia > 0 && targetDia > 0) {
      setState(() {
        _simpleResult = const LineCapacityCalculator().calculate(
          knownCapacityYds: cap, knownDiameterMm: knownDia, targetDiameterMm: targetDia,
        );
        if (mainYds > 0 && backDia > 0) {
          _backingResult = const LineCapacityCalculator().calculateBacking(
            spoolCapacityYds: cap, spoolLineDiameterMm: knownDia,
            mainLineYds: mainYds, mainLineDiameterMm: targetDia, backingDiameterMm: backDia,
          );
        }
      });
    }
  }

  @override
  void dispose() { _capController.dispose(); _knownDiaController.dispose(); _targetDiaController.dispose(); _mainLineYdsController.dispose(); _backingDiaController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.lineCapacity)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(context.tr.reelSpecs, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: TextField(controller: _capController, decoration: const InputDecoration(labelText: 'Rated Capacity (yds)', border: OutlineInputBorder(), isDense: true), keyboardType: TextInputType.number, onChanged: (_) => _calculate())),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: _knownDiaController, decoration: const InputDecoration(labelText: 'At Diameter (mm)', border: OutlineInputBorder(), isDense: true), keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _calculate())),
        ]),
        const SizedBox(height: 16),
        Text(context.tr.targetLine, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        TextField(controller: _targetDiaController, decoration: const InputDecoration(labelText: 'Target Line Diameter (mm)', border: OutlineInputBorder()), keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _calculate()),
        const SizedBox(height: 16),
        Text(context.tr.backingOptional, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: TextField(controller: _mainLineYdsController, decoration: const InputDecoration(labelText: 'Main Line (yds)', border: OutlineInputBorder(), isDense: true), keyboardType: TextInputType.number, onChanged: (_) => _calculate())),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: _backingDiaController, decoration: const InputDecoration(labelText: 'Backing Dia (mm)', border: OutlineInputBorder(), isDense: true), keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _calculate())),
        ]),
        const SizedBox(height: 24),
        if (_simpleResult != null) Card(color: Colors.green.withValues(alpha: 0.05), child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(context.tr.capacityWithTargetLine, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Center(child: Text('${_simpleResult!.capacityYds.toStringAsFixed(0)} yds', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.green))),
          Center(child: Text('(${_simpleResult!.capacityMeters.toStringAsFixed(0)} m)', style: const TextStyle(color: Colors.grey))),
        ]))),
        if (_backingResult != null) ...[
          const SizedBox(height: 12),
          Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(context.tr.backingCalculation, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _Row(context.tr.mainLine, '${_backingResult!.mainLineYds.toStringAsFixed(0)} yds'),
            _Row(context.tr.backingNeeded, '${_backingResult!.backingYds.toStringAsFixed(0)} yds (${_backingResult!.backingMeters.toStringAsFixed(0)} m)'),
          ]))),
        ],
      ]),
    );
  }
}

// ========== Shock Leader 计算器页面 ==========

class _ShockLeaderPage extends StatefulWidget {
  const _ShockLeaderPage();
  @override
  State<_ShockLeaderPage> createState() => _ShockLeaderPageState();
}

class _ShockLeaderPageState extends State<_ShockLeaderPage> {
  final _sinkerController = TextEditingController(text: '4');
  final _rodController = TextEditingController(text: '12');
  int _wraps = 6;
  ShockLeaderResult? _result;

  @override
  void initState() { super.initState(); _calculate(); }

  void _calculate() {
    final sinker = double.tryParse(_sinkerController.text) ?? 0;
    final rod = double.tryParse(_rodController.text) ?? 0;
    if (sinker > 0 && rod > 0) {
      setState(() {
        _result = const ShockLeaderCalculator().calculate(
          sinkerWeightOz: sinker, rodLengthFt: rod, extraWraps: _wraps,
        );
      });
    }
  }

  @override
  void dispose() { _sinkerController.dispose(); _rodController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.shockLeader)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(controller: _sinkerController, decoration: const InputDecoration(labelText: 'Sinker Weight (oz)', border: OutlineInputBorder(), suffixText: 'oz'), keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _calculate()),
        const SizedBox(height: 12),
        TextField(controller: _rodController, decoration: const InputDecoration(labelText: 'Rod Length (ft)', border: OutlineInputBorder(), suffixText: 'ft'), keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => _calculate()),
        const SizedBox(height: 12),
        Text('Extra wraps on spool: $_wraps'),
        Slider(value: _wraps.toDouble(), min: 3, max: 10, divisions: 7, label: '$_wraps', onChanged: (v) { _wraps = v.toInt(); _calculate(); }),
        const SizedBox(height: 24),
        if (_result != null) Card(color: Colors.orange.withValues(alpha: 0.05), child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(context.tr.shockLeaderSpecs, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          Center(child: Text('${_result!.recommendedLb.toStringAsFixed(0)} lb', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.orange))),
          Center(child: Text('Rule: sinker oz × 10', style: const TextStyle(color: Colors.grey))),
          const SizedBox(height: 12),
          _Row(context.tr.range, '${_result!.minLb.toStringAsFixed(0)} — ${_result!.maxLb.toStringAsFixed(0)} lb'),
          _Row(context.tr.length, '${_result!.lengthFt.toStringAsFixed(1)} ft (${_result!.lengthM.toStringAsFixed(1)} m)'),
          _Row(context.tr.approxDiameter, '${_result!.approxDiameterMm.toStringAsFixed(2)} mm (mono)'),
        ]))),
      ]),
    );
  }
}

// ========== 铅坠重量计算器页面 ==========

class _SinkerWeightPage extends StatefulWidget {
  const _SinkerWeightPage();
  @override
  State<_SinkerWeightPage> createState() => _SinkerWeightPageState();
}

class _SinkerWeightPageState extends State<_SinkerWeightPage> {
  CurrentStrength _current = CurrentStrength.light;
  WaveCondition _waves = WaveCondition.moderate;
  double _distance = 80;
  BottomType _bottom = BottomType.sand;
  SinkerWeightResult? _result;

  @override
  void initState() { super.initState(); _calculate(); }

  void _calculate() {
    setState(() {
      _result = const SinkerWeightCalculator().calculate(
        current: _current, waves: _waves, targetDistanceM: _distance, bottom: _bottom,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.sinkerWeight)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Text(context.tr.current, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 4, children: CurrentStrength.values.map((c) => ChoiceChip(
          label: Text(c.label), selected: _current == c,
          onSelected: (_) { _current = c; _calculate(); },
        )).toList()),
        const SizedBox(height: 16),
        Text(context.tr.waves, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 4, children: WaveCondition.values.map((w) => ChoiceChip(
          label: Text(w.label), selected: _waves == w,
          onSelected: (_) { _waves = w; _calculate(); },
        )).toList()),
        const SizedBox(height: 16),
        Text('Target Distance: ${_distance.toInt()} m', style: Theme.of(context).textTheme.titleSmall),
        Slider(value: _distance, min: 20, max: 200, divisions: 18, label: '${_distance.toInt()} m', onChanged: (v) { _distance = v; _calculate(); }),
        const SizedBox(height: 8),
        Text(context.tr.bottomType, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: BottomType.values.map((b) => ChoiceChip(
          label: Text(b.label), selected: _bottom == b,
          onSelected: (_) { _bottom = b; _calculate(); },
        )).toList()),
        const SizedBox(height: 24),
        if (_result != null) Card(color: Colors.teal.withValues(alpha: 0.05), child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(context.tr.recommendedSinker, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          Center(child: Text('${_result!.recommendedOz.toStringAsFixed(1)} oz', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.teal))),
          Center(child: Text('(${_result!.recommendedGrams.toStringAsFixed(0)} g)', style: const TextStyle(color: Colors.grey))),
          const SizedBox(height: 12),
          _Row(context.tr.range, '${_result!.minOz.toStringAsFixed(1)} — ${_result!.maxOz.toStringAsFixed(1)} oz'),
          _Row(context.tr.type, _result!.recommendedType),
          _Row(context.tr.shockLeader, '≥ ${_result!.shockLeaderLb.toStringAsFixed(0)} lb'),
        ]))),
      ]),
    );
  }
}

// ========== 共用组件 ==========

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);
  final String label; final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: const TextStyle(color: Colors.grey)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
    ]),
  );
}
