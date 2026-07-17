// ignore_for_file: use_build_context_synchronously
import 'package:flutter/material.dart';

import '../../../core/share/share_card_service.dart';
import '../../../l10n/l10n.dart';

/// 钓鱼人格测试
class PersonalityTestScreen extends StatefulWidget {
  const PersonalityTestScreen({super.key});

  @override
  State<PersonalityTestScreen> createState() => _PersonalityTestScreenState();
}

class _PersonalityTestScreenState extends State<PersonalityTestScreen> {
  int _currentQ = 0;
  final _answers = <int>[]; // 每题答案索引

  bool get _done => _currentQ >= _questions.length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_done ? '测试结果' : '钓鱼人格测试')),
      body: _done ? _buildResult(context) : _buildQuestion(context),
    );
  }

  Widget _buildQuestion(BuildContext context) {
    final q = _questions[_currentQ];
    return Padding(padding: const EdgeInsets.all(24), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // 进度
      LinearProgressIndicator(value: _currentQ / _questions.length, minHeight: 4),
      const SizedBox(height: 8),
      Text('${_currentQ + 1} / ${_questions.length}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
      const SizedBox(height: 24),
      // 题目
      Text(q.question, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 24),
      // 选项
      ...q.options.asMap().entries.map((e) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Card(child: InkWell(
          onTap: () => setState(() { _answers.add(e.key); _currentQ++; }),
          borderRadius: BorderRadius.circular(12),
          child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
            Text(String.fromCharCode(65 + e.key), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(width: 12),
            Expanded(child: Text(e.value, style: const TextStyle(fontSize: 15))),
          ])),
        )),
      )),
    ]));
  }

  Widget _buildResult(BuildContext context) {
    final result = _calcResult();
    final cardKey = GlobalKey();

    return SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
      _ResultCard(result: result, repaintKey: cardKey),
      const SizedBox(height: 20),
      FilledButton.icon(
        onPressed: () => ShareCardService.shareWidget(repaintKey: cardKey, fileName: 'personality_${result.type}.png', shareText: '🎣 我的钓鱼人格是【${result.title}】！${result.description}'),
        icon: const Icon(Icons.share),
        label: Text(context.tr.sharePersonality),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
      ),
      const SizedBox(height: 12),
      OutlinedButton(
        onPressed: () => setState(() { _currentQ = 0; _answers.clear(); }),
        child: Text(context.tr.retakeTest),
      ),
    ]));
  }

  PersonalityResult _calcResult() {
    // 简单计分：统计各类型得票
    final scores = <String, int>{'zen': 0, 'gear': 0, 'power': 0, 'data': 0, 'social': 0};
    for (int i = 0; i < _answers.length && i < _questions.length; i++) {
      final type = _questions[i].types[_answers[i]];
      scores[type] = (scores[type] ?? 0) + 1;
    }
    final topType = scores.entries.reduce((a, b) => a.value >= b.value ? a : b).key;
    return _results[topType]!;
  }

  static const _questions = [
    _Q(question: '鱼咬钩的瞬间你会？', options: ['深呼吸，稳稳收线', '兴奋尖叫', '立刻看手表记录时间', '先拍照发朋友圈'], types: ['zen', 'social', 'data', 'social']),
    _Q(question: '选装备时你最看重？', options: ['性价比', '最新款最贵的', '数据参数对比', '朋友推荐的'], types: ['zen', 'gear', 'data', 'social']),
    _Q(question: '空军（一条没钓到）你会？', options: ['享受过程就好', '一定是装备的问题', '分析数据找原因', '发朋友圈吐槽'], types: ['zen', 'gear', 'data', 'social']),
    _Q(question: '你的理想抛投距离是？', options: ['够用就行', '越远越好，买最长的竿', '精确计算到最优距离', '能拍出好看视频的距离'], types: ['zen', 'power', 'data', 'social']),
    _Q(question: '维护装备时你？', options: ['差不多就行', '全套工具按流程来', '记录每次维护数据', '拍延时视频'], types: ['zen', 'gear', 'data', 'social']),
    _Q(question: '钓到大鱼第一反应？', options: ['放流，尊重自然', '称重量长度全记录', '分析用了什么饵和钓组', '直播给朋友看'], types: ['zen', 'gear', 'data', 'social']),
  ];

  static final _results = {
    'zen': const PersonalityResult(type: 'zen', emoji: '🧘', title: '佛系钓手', description: '享受过程大于结果，你钓的不是鱼，是心境。', color: Color(0xFF4caf50)),
    'gear': const PersonalityResult(type: 'gear', emoji: '💰', title: '装备党', description: '装备可以不用，但不能没有。你的车库比鱼塘精彩。', color: Color(0xFFff9800)),
    'power': const PersonalityResult(type: 'power', emoji: '🚀', title: '远投狂人', description: '距离就是正义。你的目标是把铅投到对面大陆。', color: Color(0xFFf44336)),
    'data': const PersonalityResult(type: 'data', emoji: '📊', title: '数据控', description: '没有数据支撑的钓鱼不叫钓鱼。你的 Excel 比鱼竿多。', color: Color(0xFF2196f3)),
    'social': const PersonalityResult(type: 'social', emoji: '📸', title: '社交达人', description: '钓鱼是社交的借口。你的朋友圈比鱼桶更满。', color: Color(0xFF9c27b0)),
  };
}

class _Q {
  const _Q({required this.question, required this.options, required this.types});
  final String question; final List<String> options; final List<String> types;
}

class PersonalityResult {
  const PersonalityResult({required this.type, required this.emoji, required this.title, required this.description, required this.color});
  final String type; final String emoji; final String title; final String description; final Color color;
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result, required this.repaintKey});
  final PersonalityResult result; final GlobalKey repaintKey;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      key: repaintKey,
      child: Container(
        width: 360, padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [result.color.withValues(alpha: 0.9), result.color, result.color.withValues(alpha: 0.8)]),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Row(children: [Text('🎣 GoCasting', style: TextStyle(color: Colors.white70, fontSize: 11)), Spacer(), Text('钓鱼人格测试', style: TextStyle(color: Colors.white70, fontSize: 11))]),
          const SizedBox(height: 20),
          Text(result.emoji, style: const TextStyle(fontSize: 56)),
          const SizedBox(height: 12),
          Text(result.title, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Text(result.description, style: const TextStyle(color: Colors.white, fontSize: 15), textAlign: TextAlign.center),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(20)),
            child: const Text('你是什么类型？来测测！', style: TextStyle(color: Colors.white, fontSize: 12)),
          ),
          const SizedBox(height: 14),
          const Text('— GoCasting 远投钓鱼助手 —', style: TextStyle(color: Colors.white38, fontSize: 10)),
        ]),
      ),
    );
  }
}
