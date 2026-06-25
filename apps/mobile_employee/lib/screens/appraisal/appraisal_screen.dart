import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class AppraisalScreen extends StatefulWidget {
  const AppraisalScreen({super.key});
  @override
  State<AppraisalScreen> createState() => _AppraisalScreenState();
}

class _AppraisalScreenState extends State<AppraisalScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  List<dynamic> _appraisals = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/appraisal/me');
      if (mounted) setState(() {
        _appraisals = res.data is List ? res.data : (res.data['data'] ?? []);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kSurface,
    appBar: AppBar(
      title: const Text('التقييم السنوي', style: TextStyle(fontWeight: FontWeight.w800)),
      bottom: TabBar(
        controller: _tabs,
        tabs: const [Tab(text: 'دورات التقييم'), Tab(text: 'لوحة الأداء')],
        indicatorColor: kPrimary,
      ),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : TabBarView(
            controller: _tabs,
            children: [
              _appraisals.isEmpty ? _emptyState() : RefreshIndicator(
                color: kPrimary,
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _appraisals.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _AppraisalCard(appraisal: _appraisals[i], onDone: _load),
                ),
              ),
              _PerformanceDashboard(appraisals: _appraisals),
            ],
          ),
  );

  Widget _emptyState() => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.star_outline_rounded, size: 72, color: kBorder),
      SizedBox(height: 16),
      Text('لا توجد تقييمات نشطة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
      SizedBox(height: 8),
      Text('ستظهر هنا دورات التقييم المفتوحة', style: TextStyle(fontSize: 14, color: kTextSub)),
    ]),
  );
}

// ─── Appraisal Card ───────────────────────────────────────────────────────────

class _AppraisalCard extends StatelessWidget {
  final Map<String, dynamic> appraisal;
  final VoidCallback onDone;
  const _AppraisalCard({required this.appraisal, required this.onDone});

  @override
  Widget build(BuildContext context) {
    final cycle      = appraisal['cycle'] as Map<String, dynamic>? ?? {};
    final template   = appraisal['template'] as Map<String, dynamic>? ?? {};
    final status     = appraisal['status'] as String? ?? 'not_started';
    final selfScore  = appraisal['selfScore'];
    final info       = _statusInfo(status);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder, width: 0.5),
      ),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: kPrimaryLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
          ),
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.star_rounded, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(cycle['name'] ?? 'دورة تقييم', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText)),
              Text(template['name'] ?? 'قالب التقييم', style: const TextStyle(fontSize: 12, color: kTextSub)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: info.$2, borderRadius: BorderRadius.circular(20)),
              child: Text(info.$1, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: info.$3)),
            ),
          ]),
        ),

        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (selfScore != null) ...[
              Row(children: [
                const Icon(Icons.check_circle_rounded, color: kSuccess, size: 18),
                const SizedBox(width: 6),
                Text('درجتك الذاتية: ${_fmt(selfScore)}%', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kSuccess)),
              ]),
              const SizedBox(height: 10),
            ],
            if (_fmt2(cycle['startDate']) != null)
              Row(children: [
                const Icon(Icons.calendar_today_outlined, size: 14, color: kTextSub),
                const SizedBox(width: 6),
                Text('${_fmt2(cycle['startDate'])} — ${_fmt2(cycle['endDate']) ?? '—'}', style: const TextStyle(fontSize: 12, color: kTextSub)),
              ]),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: status == 'finalized' ? null : () => _openAssessment(context),
                icon: Icon(status == 'not_started' ? Icons.edit_outlined : Icons.visibility_outlined, size: 16),
                label: Text(status == 'not_started' ? 'ابدأ التقييم الذاتي' :
                            status == 'finalized'   ? 'تم الإنهاء'           : 'عدّل التقييم'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: status == 'finalized' ? kBorder : kPrimary,
                  foregroundColor: status == 'finalized' ? kTextSub : Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  void _openAssessment(BuildContext context) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => _SelfAssessmentForm(appraisalId: appraisal['id'], onSubmit: onDone),
    ));
  }

  (String, Color, Color) _statusInfo(String s) => switch (s) {
    'not_started' => ('لم يبدأ',     kWarningLight, kWarning),
    'in_progress' => ('جارٍ',        kPrimaryLight, kPrimary),
    'completed'   => ('مكتمل',       kSuccessLight, kSuccess),
    'finalized'   => ('منتهٍ',       kSurface,      kTextSub),
    _             => ('غير معروف',   kSurface,      kTextSub),
  };
  String _fmt(dynamic v) => double.tryParse(v.toString())?.toStringAsFixed(1) ?? v.toString();
  String? _fmt2(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return null; } }
}

// ─── Self Assessment Form ─────────────────────────────────────────────────────

// ─── Performance Dashboard ────────────────────────────────────────────────────

class _PerformanceDashboard extends StatelessWidget {
  final List<dynamic> appraisals;
  const _PerformanceDashboard({required this.appraisals});

  @override
  Widget build(BuildContext context) {
    if (appraisals.isEmpty) return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.bar_chart_rounded, size: 64, color: kBorder),
        SizedBox(height: 12),
        Text('لا توجد بيانات أداء بعد', style: TextStyle(fontSize: 15, color: kTextSub)),
      ]),
    );

    final scores = appraisals
        .where((a) => a['selfScore'] != null)
        .map((a) => (
          name: (a['cycle']?['name'] as String? ?? ''),
          self: double.tryParse(a['selfScore'].toString()) ?? 0,
          manager: double.tryParse(a['managerScore']?.toString() ?? '') ?? 0,
          final_: double.tryParse(a['finalScore']?.toString() ?? '') ?? 0,
        ))
        .toList();

    final latest = scores.isNotEmpty ? scores.last : null;
    final avg = scores.isEmpty ? 0.0 : scores.fold(0.0, (s, e) => s + e.self) / scores.length;

    String category = '—';
    Color catColor = kTextSub;
    if (latest != null && latest.self > 0) {
      final s = latest.self;
      if (s >= 90) { category = 'Outstanding ⭐'; catColor = kSuccess; }
      else if (s >= 75) { category = 'Exceeds Expectations'; catColor = kPrimary; }
      else if (s >= 60) { category = 'Meets Expectations'; catColor = kWarning; }
      else { category = 'Needs Improvement'; catColor = kDanger; }
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary cards
        Row(children: [
          Expanded(child: _StatCard(label: 'آخر تقييم ذاتي', value: latest != null ? '${latest.self.round()}%' : '—', color: kPrimary)),
          const SizedBox(width: 10),
          Expanded(child: _StatCard(label: 'متوسط كل الدورات', value: avg > 0 ? '${avg.round()}%' : '—', color: kSuccess)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: _StatCard(label: 'تقييم المدير', value: latest?.manager != null && latest!.manager > 0 ? '${latest.manager.round()}%' : 'لم يتم', color: kWarning)),
          const SizedBox(width: 10),
          Expanded(child: _StatCard(label: 'عدد الدورات', value: '${scores.length}', color: kPurple)),
        ]),

        const SizedBox(height: 16),

        // Category badge
        if (latest != null && latest.self > 0) Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: kBorder)),
          child: Column(children: [
            Text('فئة الأداء', style: const TextStyle(fontSize: 12, color: kTextSub)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(color: catColor.withAlpha(20), borderRadius: BorderRadius.circular(20)),
              child: Text(category, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: catColor)),
            ),
          ]),
        ),

        const SizedBox(height: 16),

        // Bar chart
        if (scores.isNotEmpty) Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: kBorder)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('مقارنة الدورات', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            ...scores.map((s) => Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Text(s.name, style: const TextStyle(fontSize: 12, color: kTextSub), overflow: TextOverflow.ellipsis)),
                  Text('${s.self.round()}%', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kPrimary)),
                ]),
                const SizedBox(height: 6),
                Stack(children: [
                  Container(height: 10, decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(5))),
                  FractionallySizedBox(
                    widthFactor: (s.self / 100).clamp(0.0, 1.0),
                    child: Container(
                      height: 10,
                      decoration: BoxDecoration(
                        color: s.self >= 90 ? kSuccess : s.self >= 75 ? kPrimary : s.self >= 60 ? kWarning : kDanger,
                        borderRadius: BorderRadius.circular(5),
                      ),
                    ),
                  ),
                ]),
              ]),
            )),
            // Legend
            const SizedBox(height: 4),
            Row(children: [
              _LegendDot(color: kSuccess, label: '≥90 Outstanding'),
              const SizedBox(width: 10),
              _LegendDot(color: kPrimary, label: '≥75 Exceeds'),
              const SizedBox(width: 10),
              _LegendDot(color: kWarning, label: '≥60 Meets'),
            ]),
          ]),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final Color color;
  const _StatCard({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: kBorder)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, color: kTextSub)),
      const SizedBox(height: 6),
      Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
    ]),
  );
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
    const SizedBox(width: 4),
    Text(label, style: const TextStyle(fontSize: 9, color: kTextSub)),
  ]);
}

// ─── Self Assessment Form ─────────────────────────────────────────────────────

class _SelfAssessmentForm extends StatefulWidget {
  final String appraisalId;
  final VoidCallback onSubmit;
  const _SelfAssessmentForm({required this.appraisalId, required this.onSubmit});
  @override
  State<_SelfAssessmentForm> createState() => _SelfAssessmentFormState();
}

class _SelfAssessmentFormState extends State<_SelfAssessmentForm> {
  Map<String, dynamic>? _appraisal;
  final Map<String, double> _scores   = {};
  final Map<String, String> _comments = {};
  bool _loading  = true;
  bool _saving   = false;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/appraisal/${widget.appraisalId}');
      final data = res.data as Map<String, dynamic>;
      if (mounted) {
        setState(() { _appraisal = data; _loading = false; });
        // Pre-fill existing scores
        final existing = data['criteriaScores'] as List? ?? [];
        for (final cs in existing) {
          final cId = cs['criterion']?['id'] as String?;
          if (cId != null) {
            _scores[cId]   = double.tryParse(cs['score'].toString()) ?? 0;
            _comments[cId] = cs['comment'] as String? ?? '';
          }
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final sections = (_appraisal?['template']?['sections'] as List? ?? []);
    final allCriteria = sections.expand((s) => (s['criteria'] as List? ?? [])).toList();

    if (_scores.values.any((v) => v < 0)) {
      setState(() => _error = 'يرجى تقييم جميع المعايير قبل الإرسال');
      return;
    }

    setState(() { _saving = true; _error = null; });
    try {
      final scores = _scores.entries.map((e) => {
        'criterionId': e.key,
        'score': e.value.round(),
        'comment': _comments[e.key] ?? '',
      }).toList();

      await ApiClient().dio.post('/appraisal/${widget.appraisalId}/self-assessment', data: {'scores': scores});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ تم حفظ التقييم الذاتي'), backgroundColor: kSuccess),
        );
        widget.onSubmit();
        Navigator.pop(context);
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'];
      setState(() => _error = (msg is List ? msg.join(' ') : msg?.toString()) ?? 'حدث خطأ');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kSurface,
    appBar: AppBar(
      backgroundColor: Colors.white,
      title: const Text('التقييم الذاتي', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
      actions: [
        if (!_loading && !_saving)
          TextButton(onPressed: _submit, child: const Text('إرسال', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
      ],
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : _buildForm(),
  );

  Widget _buildForm() {
    final sections = (_appraisal?['template']?['sections'] as List? ?? []);
    final totalCriteria = sections.fold<int>(0, (s, sec) => s + ((sec['criteria'] as List?)?.length ?? 0));
    final filled = _scores.length;

    return Column(children: [
      // Progress
      Container(
        color: Colors.white,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('$filled من $totalCriteria معيار', style: const TextStyle(fontSize: 13, color: kTextSub)),
            const Spacer(),
            Text('${totalCriteria > 0 ? (filled / totalCriteria * 100).round() : 0}%', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kPrimary)),
          ]),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: totalCriteria > 0 ? filled / totalCriteria : 0,
              backgroundColor: kPrimaryLight,
              color: kPrimary,
              minHeight: 6,
            ),
          ),
        ]),
      ),

      Expanded(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ...sections.map((section) => _SectionWidget(
              section: section,
              scores: _scores,
              comments: _comments,
              onScoreChanged: (id, v) => setState(() => _scores[id] = v),
              onCommentChanged: (id, v) => setState(() => _comments[id] = v),
            )),
            if (_error != null) Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, style: const TextStyle(color: kDanger, fontSize: 13)),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving
                  ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                  : const Text('إرسال التقييم الذاتي', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    ]);
  }
}

// ─── Section Widget ───────────────────────────────────────────────────────────

class _SectionWidget extends StatelessWidget {
  final Map<String, dynamic> section;
  final Map<String, double> scores;
  final Map<String, String> comments;
  final void Function(String, double) onScoreChanged;
  final void Function(String, String) onCommentChanged;
  const _SectionWidget({
    required this.section, required this.scores, required this.comments,
    required this.onScoreChanged, required this.onCommentChanged,
  });

  static const _sectionLabels = {
    'kpi':         ('مؤشرات الأداء', Icons.bar_chart_rounded),
    'competency':  ('الكفاءات', Icons.psychology_rounded),
    'discipline':  ('الانضباط', Icons.verified_user_rounded),
  };

  @override
  Widget build(BuildContext context) {
    final type     = section['sectionType'] as String? ?? '';
    final weight   = section['weight'] ?? 0;
    final criteria = section['criteria'] as List? ?? [];
    final (label, icon) = _sectionLabels[type] ?? ('قسم', Icons.list_rounded);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder, width: 0.5),
      ),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: kSurface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
          ),
          child: Row(children: [
            Icon(icon, size: 18, color: kPrimary),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: kText)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(12)),
              child: Text('وزن $weight%', style: const TextStyle(fontSize: 11, color: kPrimary, fontWeight: FontWeight.w700)),
            ),
          ]),
        ),
        ...criteria.asMap().entries.map((e) {
          final i = e.key;
          final c = e.value as Map<String, dynamic>;
          final cId = c['id'] as String;
          return Column(children: [
            if (i > 0) const Divider(height: 0, color: kBorder, indent: 16, endIndent: 16),
            _CriterionItem(
              criterion: c,
              score: scores[cId],
              comment: comments[cId],
              onScoreChanged: (v) => onScoreChanged(cId, v),
              onCommentChanged: (v) => onCommentChanged(cId, v),
            ),
          ]);
        }),
      ]),
    );
  }
}

// ─── Criterion Item ───────────────────────────────────────────────────────────

class _CriterionItem extends StatefulWidget {
  final Map<String, dynamic> criterion;
  final double? score;
  final String? comment;
  final ValueChanged<double> onScoreChanged;
  final ValueChanged<String> onCommentChanged;
  const _CriterionItem({
    required this.criterion, required this.score, required this.comment,
    required this.onScoreChanged, required this.onCommentChanged,
  });
  @override
  State<_CriterionItem> createState() => _CriterionItemState();
}

class _CriterionItemState extends State<_CriterionItem> {
  late double _score;
  bool _showComment = false;
  late final TextEditingController _commentCtrl;

  @override
  void initState() {
    super.initState();
    _score = widget.score ?? -1.0;
    _commentCtrl = TextEditingController(text: widget.comment ?? '');
  }

  @override
  void dispose() { _commentCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final name   = widget.criterion['criterionName'] ?? '';
    final weight = widget.criterion['weight'] ?? 0;

    return Padding(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText))),
          Text('$weight%', style: const TextStyle(fontSize: 11, color: kTextSub)),
        ]),
        const SizedBox(height: 12),

        // Numeric score 1-100
        Row(children: [
          Expanded(child: Slider(
            value: _score < 0 ? 0 : _score,
            min: 0, max: 100, divisions: 100,
            activeColor: _scoreColor(_score.round()),
            onChanged: (v) {
              setState(() => _score = v);
              widget.onScoreChanged(v);
            },
          )),
          Container(
            width: 52, height: 36,
            decoration: BoxDecoration(
              color: _score < 0 ? kSurface : _scoreColor(_score.round()).withAlpha(25),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _score < 0 ? kBorder : _scoreColor(_score.round()), width: 1.5),
            ),
            child: Center(child: Text(
              _score < 0 ? '—' : '${_score.round()}',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: _score < 0 ? kTextSub : _scoreColor(_score.round())),
            )),
          ),
        ]),
        if (_score >= 0) ...[
          const SizedBox(height: 4),
          Text(_scoreLabel(_score.round()), style: TextStyle(fontSize: 12, color: _scoreColor(_score.round()), fontWeight: FontWeight.w600)),
        ],

        const SizedBox(height: 8),
        GestureDetector(
          onTap: () => setState(() => _showComment = !_showComment),
          child: Row(children: [
            Icon(_showComment ? Icons.remove_circle_outline : Icons.add_comment_outlined, size: 14, color: kTextSub),
            const SizedBox(width: 4),
            Text(_showComment ? 'إخفاء التعليق' : 'إضافة تعليق (اختياري)', style: const TextStyle(fontSize: 12, color: kTextSub)),
          ]),
        ),

        if (_showComment) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _commentCtrl,
            maxLines: 2,
            decoration: const InputDecoration(
              hintText: 'اكتب تعليقك هنا...',
              hintStyle: TextStyle(fontSize: 13),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            style: const TextStyle(fontSize: 13),
            onChanged: widget.onCommentChanged,
          ),
        ],
      ]),
    );
  }

  Color _scoreColor(int s) {
    if (s >= 90) return kSuccess;
    if (s >= 75) return kPrimary;
    if (s >= 60) return kWarning;
    return kDanger;
  }

  String _scoreLabel(int s) {
    if (s >= 90) return 'ممتاز — Outstanding';
    if (s >= 75) return 'يتجاوز التوقعات — Exceeds';
    if (s >= 60) return 'يلبي التوقعات — Meets';
    if (s >= 40) return 'يحتاج تحسين — Needs Improvement';
    return 'ضعيف';
  }
}
