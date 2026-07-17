import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../../l10n/l10n.dart';
import '../domain/cast_tracker.dart';

/// 抛投距离追踪器页面
class CastTrackerScreen extends StatefulWidget {
  const CastTrackerScreen({super.key});

  @override
  State<CastTrackerScreen> createState() => _CastTrackerScreenState();
}

class _CastTrackerScreenState extends State<CastTrackerScreen> {
  final List<CastSession> _sessions = [];
  CastStats _stats = const CastStats(
    totalSessions: 0, totalCasts: 0, personalBestM: 0,
    averageM: 0, recentAverageM: 0, improvementPercent: 0,
  );

  void _recalcStats() {
    setState(() => _stats = const CastStatsCalculator().calculate(_sessions));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.tr.castTracker)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _startSession,
        icon: const Icon(Icons.add),
        label: Text(context.tr.newSession),
      ),
      body: _sessions.isEmpty ? _buildEmpty() : _buildContent(context),
    );
  }

  Widget _buildEmpty() {
    return Center(child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.speed, size: 64, color: Colors.grey[400]),
        const SizedBox(height: 16),
        Text(context.tr.trackCastingDistance, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        Text(context.tr.recordDistanceProgress),
        const SizedBox(height: 24),
        FilledButton.icon(onPressed: _startSession, icon: const Icon(Icons.add), label: Text(context.tr.startFirstSession)),
      ],
    ));
  }

  Widget _buildContent(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      // 统计卡片
      _StatsCard(stats: _stats),
      const SizedBox(height: 16),

      // 进步趋势图
      if (_sessions.length >= 2) ...[
        _TrendChart(sessions: _sessions),
        const SizedBox(height: 16),
      ],

      // 会话历史
      Text('Sessions (${_sessions.length})', style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      ..._sessions.reversed.map((s) => _SessionTile(
        session: s,
        onTap: () => _viewSession(s),
        onDelete: () { setState(() => _sessions.remove(s)); _recalcStats(); },
      )),
    ]);
  }

  Future<void> _startSession() async {
    final result = await Navigator.push<CastSession>(
      context,
      MaterialPageRoute(builder: (_) => const _NewSessionPage()),
    );
    if (result != null) {
      setState(() => _sessions.add(result));
      _recalcStats();
    }
  }

  void _viewSession(CastSession session) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => _SessionDetailPage(session: session)));
  }
}

/// 统计卡片
class _StatsCard extends StatelessWidget {
  const _StatsCard({required this.stats});
  final CastStats stats;

  @override
  Widget build(BuildContext context) {
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.tr.yourStats, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _Stat(context.tr.personalBest, '${stats.personalBestM.toStringAsFixed(0)} m', Colors.green)),
          Expanded(child: _Stat(context.tr.average, '${stats.averageM.toStringAsFixed(0)} m', Colors.blue)),
          Expanded(child: _Stat(context.tr.recentAvg, '${stats.recentAverageM.toStringAsFixed(0)} m', Colors.orange)),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: _Stat(context.tr.sessions, '${stats.totalSessions}', Colors.grey)),
          Expanded(child: _Stat(context.tr.totalCasts, '${stats.totalCasts}', Colors.grey)),
          Expanded(child: _Stat(context.tr.improvement, '${stats.improvementPercent >= 0 ? '+' : ''}${stats.improvementPercent.toStringAsFixed(0)}%',
            stats.improvementPercent >= 0 ? Colors.green : Colors.red)),
        ]),
        if (stats.bestGearSetup != null) ...[
          const Divider(),
          Row(children: [
            const Icon(Icons.emoji_events, size: 16, color: Colors.amber),
            const SizedBox(width: 8),
            Expanded(child: Text('Best setup: ${stats.bestGearSetup}', style: const TextStyle(fontSize: 12))),
          ]),
        ],
      ],
    )));
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, this.color);
  final String label; final String value; final Color color;
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
    Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
  ]);
}

/// 趋势图
class _TrendChart extends StatelessWidget {
  const _TrendChart({required this.sessions});
  final List<CastSession> sessions;

  @override
  Widget build(BuildContext context) {
    final sorted = List<CastSession>.from(sessions)..sort((a, b) => a.date.compareTo(b.date));
    final spots = <FlSpot>[];
    for (int i = 0; i < sorted.length; i++) {
      spots.add(FlSpot(i.toDouble(), sorted[i].bestM));
    }

    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(context.tr.bestDistanceTrend, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        SizedBox(height: 150, child: LineChart(LineChartData(
          gridData: const FlGridData(show: true, drawVerticalLine: false),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, _) => Text('#${v.toInt() + 1}', style: const TextStyle(fontSize: 10)))),
            leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40, getTitlesWidget: (v, _) => Text('${v.toInt()}m', style: const TextStyle(fontSize: 10)))),
          ),
          borderData: FlBorderData(show: false),
          lineBarsData: [LineChartBarData(
            spots: spots, isCurved: true, color: Colors.blue, barWidth: 3,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(show: true, color: Colors.blue.withValues(alpha: 0.1)),
          )],
        ))),
      ],
    )));
  }
}

/// 会话列表项
class _SessionTile extends StatelessWidget {
  const _SessionTile({required this.session, required this.onTap, required this.onDelete});
  final CastSession session; final VoidCallback onTap; final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final dateStr = '${session.date.month}/${session.date.day}/${session.date.year}';
    return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
      leading: CircleAvatar(backgroundColor: Colors.blue.withValues(alpha: 0.1), child: Text(session.bestM.toStringAsFixed(0), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue))),
      title: Text(session.location ?? dateStr, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Text('$dateStr • ${session.castCount} casts • Best: ${session.bestM.toStringAsFixed(0)}m • Avg: ${session.averageM.toStringAsFixed(0)}m'),
      trailing: IconButton(icon: const Icon(Icons.delete_outline, size: 20), onPressed: onDelete),
      onTap: onTap,
    ));
  }
}

/// 新建会话页面
class _NewSessionPage extends StatefulWidget {
  const _NewSessionPage();
  @override
  State<_NewSessionPage> createState() => _NewSessionPageState();
}

class _NewSessionPageState extends State<_NewSessionPage> {
  final _locationCtrl = TextEditingController();
  final _gearCtrl = TextEditingController();
  final _casts = <CastRecord>[];

  @override
  void dispose() { _locationCtrl.dispose(); _gearCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr.newCastingSession),
        actions: [
          TextButton(
            onPressed: _casts.isEmpty ? null : _saveSession,
            child: Text(context.tr.save),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _addCast,
        child: const Icon(Icons.add),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        // 会话信息
        TextField(controller: _locationCtrl, decoration: const InputDecoration(labelText: 'Location (optional)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.location_on))),
        const SizedBox(height: 12),
        TextField(controller: _gearCtrl, decoration: const InputDecoration(labelText: 'Gear Setup (optional)', border: OutlineInputBorder(), prefixIcon: Icon(Icons.settings), hintText: 'e.g. Penn Prevail II 12ft + Battle III 5000')),
        const SizedBox(height: 16),

        // 抛投列表
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Casts (${_casts.length})', style: Theme.of(context).textTheme.titleMedium),
          if (_casts.isNotEmpty) Text('Best: ${_casts.map((c) => c.distanceM).reduce((a, b) => a > b ? a : b).toStringAsFixed(0)}m', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
        ]),
        const SizedBox(height: 8),
        if (_casts.isEmpty)
          const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: Text('Tap + to record your first cast', style: TextStyle(color: Colors.grey)))))
        else
          ..._casts.asMap().entries.map((e) => Card(margin: const EdgeInsets.only(bottom: 6), child: ListTile(
            leading: CircleAvatar(radius: 16, child: Text('${e.key + 1}', style: const TextStyle(fontSize: 12))),
            title: Text('${e.value.distanceM.toStringAsFixed(0)} m (${e.value.distanceYds.toStringAsFixed(0)} yds)', style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: e.value.windDirection != null ? Text('${e.value.windDirection!.label} • ${e.value.windStrength?.label ?? ''}') : null,
            trailing: IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => setState(() => _casts.removeAt(e.key))),
          ))),
      ]),
    );
  }

  Future<void> _addCast() async {
    final distCtrl = TextEditingController();
    WindDirection? wind;
    WindStrength? strength;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) => Padding(
        padding: EdgeInsets.only(left: 16, right: 16, top: 16, bottom: MediaQuery.of(ctx).viewInsets.bottom + 16),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Record Cast #${_casts.length + 1}', style: Theme.of(ctx).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(controller: distCtrl, autofocus: true, decoration: const InputDecoration(labelText: 'Distance (meters) *', border: OutlineInputBorder(), suffixText: 'm', prefixIcon: Icon(Icons.straighten)), keyboardType: const TextInputType.numberWithOptions(decimal: true)),
          const SizedBox(height: 12),
          Text('Wind (optional)', style: Theme.of(ctx).textTheme.titleSmall),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 4, children: WindDirection.values.map((w) => ChoiceChip(label: Text(w.label), selected: wind == w, onSelected: (_) => setSheet(() => wind = wind == w ? null : w))).toList()),
          if (wind != null) ...[
            const SizedBox(height: 8),
            Wrap(spacing: 6, children: WindStrength.values.map((s) => ChoiceChip(label: Text(s.label), selected: strength == s, onSelected: (_) => setSheet(() => strength = strength == s ? null : s))).toList()),
          ],
          const SizedBox(height: 16),
          FilledButton(onPressed: () { if (distCtrl.text.isNotEmpty) Navigator.pop(ctx, true); }, child: Text(context.tr.record)),
        ])),
      )),
    );

    if (result == true) {
      final dist = double.tryParse(distCtrl.text);
      if (dist != null && dist > 0) {
        setState(() => _casts.add(CastRecord(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          date: DateTime.now(),
          distanceM: dist,
          gearSetup: _gearCtrl.text.isNotEmpty ? _gearCtrl.text : null,
          windDirection: wind,
          windStrength: strength,
        )));
      }
    }
    distCtrl.dispose();
  }

  void _saveSession() {
    final session = CastSession(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: DateTime.now(),
      casts: _casts,
      location: _locationCtrl.text.isNotEmpty ? _locationCtrl.text : null,
      gearSetup: _gearCtrl.text.isNotEmpty ? _gearCtrl.text : null,
    );
    Navigator.pop(context, session);
  }
}

/// 会话详情页
class _SessionDetailPage extends StatelessWidget {
  const _SessionDetailPage({required this.session});
  final CastSession session;

  @override
  Widget build(BuildContext context) {
    final dateStr = '${session.date.year}-${session.date.month.toString().padLeft(2, '0')}-${session.date.day.toString().padLeft(2, '0')}';
    return Scaffold(
      appBar: AppBar(title: Text(session.location ?? dateStr)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(context.tr.sessionSummary, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _Info('Date', dateStr),
            if (session.location != null) _Info('Location', session.location!),
            if (session.gearSetup != null) _Info('Gear', session.gearSetup!),
            _Info('Casts', '${session.castCount}'),
            _Info('Best', '${session.bestM.toStringAsFixed(0)} m (${(session.bestM * 1.09361).toStringAsFixed(0)} yds)'),
            _Info('Average', '${session.averageM.toStringAsFixed(0)} m (${(session.averageM * 1.09361).toStringAsFixed(0)} yds)'),
          ],
        ))),
        const SizedBox(height: 16),
        Text(context.tr.allCasts, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ...session.casts.asMap().entries.map((e) => Card(margin: const EdgeInsets.only(bottom: 6), child: ListTile(
          leading: CircleAvatar(radius: 16, backgroundColor: e.value.distanceM == session.bestM ? Colors.green : null, child: Text('${e.key + 1}', style: TextStyle(fontSize: 12, color: e.value.distanceM == session.bestM ? Colors.white : null))),
          title: Text('${e.value.distanceM.toStringAsFixed(1)} m', style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: e.value.windDirection != null ? Text('${e.value.windDirection!.label} ${e.value.windStrength?.description ?? ''}') : null,
          trailing: e.value.distanceM == session.bestM ? const Icon(Icons.emoji_events, color: Colors.amber, size: 20) : null,
        ))),
      ]),
    );
  }
}

class _Info extends StatelessWidget {
  const _Info(this.label, this.value);
  final String label; final String value;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(children: [
    SizedBox(width: 80, child: Text(label, style: TextStyle(color: Colors.grey[600]))),
    Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
  ]));
}
