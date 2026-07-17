import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide Value;

import '../../../core/database/user_db.dart';
import '../../../core/share/catch_share_card.dart';
import '../../../l10n/l10n.dart';
import '../data/catch_repository.dart';
import 'catch_analysis_screen.dart';

/// 渔获日志主页面
class CatchLogScreen extends StatefulWidget {
  const CatchLogScreen({super.key});

  @override
  State<CatchLogScreen> createState() => _CatchLogScreenState();
}

class _CatchLogScreenState extends State<CatchLogScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabCtrl;
  late final CatchRepository _repo;
  List<CatchLog> _catches = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    _repo = CatchRepository(Get.find<UserDatabase>());
    _loadData();
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  Future<void> _loadData() async {
    final catches = await _repo.getAll();
    setState(() { _catches = catches; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.catchLog),
        actions: [
          IconButton(
            icon: const Icon(Icons.insights),
            onPressed: () => Get.to(() => const CatchAnalysisScreen()),
            tooltip: '条件分析',
          ),
        ],
        bottom: TabBar(controller: _tabCtrl, tabs: [
          Tab(icon: const Icon(Icons.list), text: context.tr.log),
          Tab(icon: const Icon(Icons.bar_chart), text: context.tr.stats),
        ]),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addCatch,
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(controller: _tabCtrl, children: [
              _CatchList(catches: _catches, onDelete: _deleteCatch),
              _CatchStats(repo: _repo),
            ]),
    );
  }

  Future<void> _addCatch() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => _AddCatchPage(repo: _repo)),
    );
    if (result == true) _loadData();
  }

  Future<void> _deleteCatch(CatchLog c) async {
    final confirm = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      title: Text(context.tr.deleteCatch),
      content: Text('Remove ${c.species} caught on ${c.date}?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr.cancel)),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr.delete)),
      ],
    ));
    if (confirm == true) {
      await _repo.delete(c.id);
      _loadData();
    }
  }
}

/// 渔获列表
class _CatchList extends StatelessWidget {
  const _CatchList({required this.catches, required this.onDelete});
  final List<CatchLog> catches;
  final void Function(CatchLog) onDelete;

  @override
  Widget build(BuildContext context) {
    if (catches.isEmpty) {
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.phishing, size: 64, color: Colors.grey[400]),
        const SizedBox(height: 16),
        Text(context.tr.noCatchesYet, style: const TextStyle(fontSize: 18)),
        const SizedBox(height: 8),
        Text(context.tr.recordFirstCatch),
      ]));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: catches.length,
      itemBuilder: (ctx, i) {
        final c = catches[i];
        return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
          leading: CircleAvatar(
            backgroundColor: c.released ? Colors.green.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
            child: Text(c.released ? '🐟' : '🍽️', style: const TextStyle(fontSize: 20)),
          ),
          title: Text(c.species, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(c.date + (c.time != null ? ' ${c.time}' : '')),
            Row(children: [
              if (c.weightLb != null) Text('${c.weightLb!.toStringAsFixed(1)} lb  ', style: const TextStyle(fontSize: 12)),
              if (c.lengthIn != null) Text('${c.lengthIn!.toStringAsFixed(1)}"  ', style: const TextStyle(fontSize: 12)),
              if (c.bait != null) Text('🎣 ${c.bait}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ]),
          ]),
          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
            IconButton(icon: const Icon(Icons.share, size: 18), onPressed: () => ShareHelper.shareCatch(context, c)),
            IconButton(icon: const Icon(Icons.delete_outline, size: 20), onPressed: () => onDelete(c)),
          ]),
          isThreeLine: true,
        ));
      },
    );
  }
}

/// 渔获统计
class _CatchStats extends StatelessWidget {
  const _CatchStats({required this.repo});
  final CatchRepository repo;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: Future.wait([repo.getSpeciesStats(), repo.getBaitStats(), repo.getBiggest(), repo.getCount()]),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final speciesStats = snap.data![0] as Map<String, int>;
        final baitStats = snap.data![1] as Map<String, int>;
        final biggest = snap.data![2] as CatchLog?;
        final count = snap.data![3] as int;

        if (count == 0) {
          return const Center(child: Text('Record catches to see statistics'));
        }

        final topSpecies = speciesStats.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
        final topBait = baitStats.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

        return ListView(padding: const EdgeInsets.all(16), children: [
          // 概览
          Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
            Text('$count', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.blue)),
            Text(context.tr.totalCatches),
            if (biggest != null) ...[
              const Divider(),
              Row(children: [
                const Icon(Icons.emoji_events, color: Colors.amber, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Biggest: ${biggest.species} — ${biggest.weightLb?.toStringAsFixed(1) ?? '?'} lb', style: const TextStyle(fontWeight: FontWeight.w500))),
              ]),
            ],
          ]))),
          const SizedBox(height: 16),

          // 鱼种排行
          if (topSpecies.isNotEmpty) ...[
            Text(context.tr.speciesCaught, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...topSpecies.take(10).map((e) => _StatBar(label: e.key, value: e.value, max: topSpecies.first.value, color: Colors.teal)),
            const SizedBox(height: 16),
          ],

          // 饵料排行
          if (topBait.isNotEmpty) ...[
            Text(context.tr.bestBaitStats, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...topBait.take(8).map((e) => _StatBar(label: e.key, value: e.value, max: topBait.first.value, color: Colors.orange)),
          ],
        ]);
      },
    );
  }
}

class _StatBar extends StatelessWidget {
  const _StatBar({required this.label, required this.value, required this.max, required this.color});
  final String label; final int value; final int max; final Color color;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(children: [
    SizedBox(width: 100, child: Text(label, style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis)),
    Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(4), child: LinearProgressIndicator(
      value: value / max, minHeight: 16, backgroundColor: Colors.grey[200], color: color,
    ))),
    const SizedBox(width: 8),
    Text('$value', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
  ]));
}

/// 添加渔获页面
class _AddCatchPage extends StatefulWidget {
  const _AddCatchPage({required this.repo});
  final CatchRepository repo;
  @override
  State<_AddCatchPage> createState() => _AddCatchPageState();
}

class _AddCatchPageState extends State<_AddCatchPage> {
  final _speciesCtrl = TextEditingController();
  final _weightCtrl = TextEditingController();
  final _lengthCtrl = TextEditingController();
  final _baitCtrl = TextEditingController();
  final _rigCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  DateTime _date = DateTime.now();
  TimeOfDay _time = TimeOfDay.now();
  bool _released = true;
  String? _tideState;

  @override
  void dispose() {
    _speciesCtrl.dispose(); _weightCtrl.dispose(); _lengthCtrl.dispose();
    _baitCtrl.dispose(); _rigCtrl.dispose(); _locationCtrl.dispose(); _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.logCatch)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // 鱼种（必填）
        TextField(controller: _speciesCtrl, decoration: const InputDecoration(labelText: 'Species *', border: OutlineInputBorder(), prefixIcon: Icon(Icons.phishing), hintText: 'e.g. Striped Bass')),
        const SizedBox(height: 12),

        // 日期和时间
        Row(children: [
          Expanded(child: InkWell(
            onTap: () async {
              final d = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: DateTime.now());
              if (d != null) setState(() => _date = d);
            },
            child: InputDecorator(decoration: const InputDecoration(labelText: 'Date', border: OutlineInputBorder(), isDense: true, suffixIcon: Icon(Icons.calendar_today)),
              child: Text('${_date.month}/${_date.day}/${_date.year}')),
          )),
          const SizedBox(width: 8),
          Expanded(child: InkWell(
            onTap: () async {
              final t = await showTimePicker(context: context, initialTime: _time);
              if (t != null) setState(() => _time = t);
            },
            child: InputDecorator(decoration: const InputDecoration(labelText: 'Time', border: OutlineInputBorder(), isDense: true, suffixIcon: Icon(Icons.access_time)),
              child: Text('${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}')),
          )),
        ]),
        const SizedBox(height: 12),

        // 尺寸
        Row(children: [
          Expanded(child: TextField(controller: _weightCtrl, decoration: const InputDecoration(labelText: 'Weight (lb)', border: OutlineInputBorder(), isDense: true), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: _lengthCtrl, decoration: const InputDecoration(labelText: 'Length (in)', border: OutlineInputBorder(), isDense: true), keyboardType: const TextInputType.numberWithOptions(decimal: true))),
        ]),
        const SizedBox(height: 12),

        // 饵料和钓组
        TextField(controller: _baitCtrl, decoration: const InputDecoration(labelText: 'Bait', border: OutlineInputBorder(), prefixIcon: Icon(Icons.set_meal), hintText: 'e.g. Cut bunker')),
        const SizedBox(height: 12),
        TextField(controller: _rigCtrl, decoration: const InputDecoration(labelText: 'Rig Type', border: OutlineInputBorder(), prefixIcon: Icon(Icons.schema_outlined), hintText: 'e.g. Fish Finder')),
        const SizedBox(height: 12),

        // 位置
        TextField(controller: _locationCtrl, decoration: const InputDecoration(labelText: 'Location', border: OutlineInputBorder(), prefixIcon: Icon(Icons.location_on), hintText: 'e.g. Jones Beach, Inlet')),
        const SizedBox(height: 12),

        // 潮汐状态
        Text(context.tr.tideState, style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: ['Rising', 'Falling', 'High', 'Low', 'Slack'].map((t) => ChoiceChip(
          label: Text(t), selected: _tideState == t.toLowerCase(),
          onSelected: (_) => setState(() => _tideState = _tideState == t.toLowerCase() ? null : t.toLowerCase()),
        )).toList()),
        const SizedBox(height: 12),

        // 放流/保留
        SwitchListTile(
          title: Text(_released ? 'Released 🐟' : 'Kept 🍽️'),
          subtitle: Text(_released ? 'Fish was released safely' : 'Fish was kept'),
          value: _released,
          onChanged: (v) => setState(() => _released = v),
        ),
        const SizedBox(height: 12),

        // 备注
        TextField(controller: _notesCtrl, decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()), maxLines: 2),
        const SizedBox(height: 24),

        // 保存
        FilledButton.icon(
          onPressed: _save,
          icon: const Icon(Icons.check),
          label: Text(context.tr.saveCatch),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
        ),
      ]),
    );
  }

  Future<void> _save() async {
    if (_speciesCtrl.text.isEmpty) {
      Get.snackbar('Required', 'Enter a species name', snackPosition: SnackPosition.BOTTOM);
      return;
    }

    final now = DateTime.now().toIso8601String();
    final dateStr = '${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
    final timeStr = '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}';

    await widget.repo.add(CatchLogsCompanion(
      date: Value(dateStr),
      time: Value(timeStr),
      species: Value(_speciesCtrl.text),
      weightLb: Value(double.tryParse(_weightCtrl.text)),
      lengthIn: Value(double.tryParse(_lengthCtrl.text)),
      bait: Value(_baitCtrl.text.isNotEmpty ? _baitCtrl.text : null),
      rigType: Value(_rigCtrl.text.isNotEmpty ? _rigCtrl.text : null),
      location: Value(_locationCtrl.text.isNotEmpty ? _locationCtrl.text : null),
      tideState: Value(_tideState),
      released: Value(_released),
      notes: Value(_notesCtrl.text.isNotEmpty ? _notesCtrl.text : null),
      createdAt: Value(now),
    ));

    if (mounted) Navigator.pop(context, true);
  }
}
