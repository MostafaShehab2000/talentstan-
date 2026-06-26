import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class SurveysScreen extends StatefulWidget {
  const SurveysScreen({super.key});
  @override
  State<SurveysScreen> createState() => _SurveysScreenState();
}

class _SurveysScreenState extends State<SurveysScreen> {
  List<dynamic> _surveys = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/surveys/me');
      if (mounted) setState(() {
        _surveys = res.data is List ? res.data : (res.data['data'] ?? []);
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
      title: const Text('الاستطلاعات', style: TextStyle(fontWeight: FontWeight.w800)),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : _surveys.isEmpty
            ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.poll_outlined, size: 64, color: kBorder),
                SizedBox(height: 12),
                Text('لا توجد استطلاعات نشطة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                SizedBox(height: 6),
                Text('ستظهر هنا استطلاعات الرضا الوظيفي', style: TextStyle(fontSize: 13, color: kTextSub)),
              ]))
            : RefreshIndicator(
                color: kPrimary,
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _surveys.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _SurveyCard(survey: _surveys[i], onDone: _load),
                ),
              ),
  );
}

class _SurveyCard extends StatelessWidget {
  final Map<String, dynamic> survey;
  final VoidCallback onDone;
  const _SurveyCard({required this.survey, required this.onDone});

  @override
  Widget build(BuildContext context) {
    final title      = survey['title'] as String? ?? 'استطلاع';
    final desc       = survey['description'] as String?;
    final participated = survey['hasParticipated'] == true;
    final qCount     = (survey['questions'] as List?)?.length ?? 0;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: participated ? kSuccessLight : kBorder, width: participated ? 1.5 : 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 40, height: 40,
              decoration: BoxDecoration(color: participated ? kSuccessLight : kPrimaryLight, borderRadius: BorderRadius.circular(10)),
              child: Icon(participated ? Icons.check_circle_rounded : Icons.poll_outlined,
                color: participated ? kSuccess : kPrimary, size: 22)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText)),
              Text('$qCount سؤال', style: const TextStyle(fontSize: 12, color: kTextSub)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: participated ? kSuccessLight : kPrimaryLight,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(participated ? 'شاركت ✓' : 'جديد',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: participated ? kSuccess : kPrimary)),
            ),
          ]),
          if (desc != null && desc.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(desc, style: const TextStyle(fontSize: 13, color: kTextSub), maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: participated ? null : () => Navigator.push(context, MaterialPageRoute(
                builder: (_) => _SurveyFormScreen(survey: survey, onSubmit: onDone),
              )),
              style: ElevatedButton.styleFrom(
                backgroundColor: participated ? kBorder : kPrimary,
                foregroundColor: participated ? kTextSub : Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(participated ? 'شاركت بالفعل' : 'ابدأ الاستطلاع'),
            ),
          ),
        ]),
      ),
    );
  }
}

class _SurveyFormScreen extends StatefulWidget {
  final Map<String, dynamic> survey;
  final VoidCallback onSubmit;
  const _SurveyFormScreen({required this.survey, required this.onSubmit});
  @override
  State<_SurveyFormScreen> createState() => _SurveyFormScreenState();
}

class _SurveyFormScreenState extends State<_SurveyFormScreen> {
  final Map<String, dynamic> _answers = {};
  bool _saving = false;
  String? _error;

  List<dynamic> get questions => widget.survey['questions'] as List? ?? [];

  @override
  Widget build(BuildContext context) {
    final title = widget.survey['title'] as String? ?? 'استطلاع';
    final filled = _answers.length;
    final total  = questions.length;

    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          TextButton(
            onPressed: _saving ? null : _submit,
            child: const Text('إرسال', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          ),
        ],
      ),
      body: Column(children: [
        // Progress
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          child: Column(children: [
            Row(children: [
              Text('$filled من $total سؤال', style: const TextStyle(fontSize: 12, color: kTextSub)),
              const Spacer(),
              Text('${total > 0 ? (filled / total * 100).round() : 0}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kPrimary)),
            ]),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: total > 0 ? filled / total : 0,
                color: kPrimary, backgroundColor: kPrimaryLight, minHeight: 5,
              ),
            ),
          ]),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: questions.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (_, i) => _QuestionCard(
              index: i,
              question: questions[i],
              answer: _answers[questions[i]['id']?.toString() ?? i.toString()],
              onAnswer: (v) => setState(() => _answers[questions[i]['id']?.toString() ?? i.toString()] = v),
            ),
          ),
        ),
        if (_error != null) Padding(
          padding: const EdgeInsets.all(12),
          child: Text(_error!, style: const TextStyle(color: kDanger, fontSize: 13)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          child: ElevatedButton(
            onPressed: _saving ? null : _submit,
            style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            child: _saving ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('إرسال الاستطلاع', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
        ),
      ]),
    );
  }

  Future<void> _submit() async {
    if (_answers.length < questions.length) {
      setState(() => _error = 'يرجى الإجابة على جميع الأسئلة');
      return;
    }
    setState(() { _saving = true; _error = null; });
    try {
      final responses = _answers.entries.map((e) => {'questionId': e.key, 'answer': e.value}).toList();
      await ApiClient().dio.post('/surveys/${widget.survey['id']}/respond', data: {'responses': responses});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('✅ تم إرسال إجاباتك'), backgroundColor: kSuccess));
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
}

class _QuestionCard extends StatelessWidget {
  final int index;
  final Map<String, dynamic> question;
  final dynamic answer;
  final ValueChanged<dynamic> onAnswer;
  const _QuestionCard({required this.index, required this.question, required this.answer, required this.onAnswer});

  @override
  Widget build(BuildContext context) {
    final text    = question['text'] ?? question['questionText'] ?? 'سؤال ${index + 1}';
    final type    = question['type'] ?? question['questionType'] ?? 'text';
    final options = question['options'] as List? ?? [];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: answer != null ? kPrimary.withAlpha(60) : kBorder)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 24, height: 24, decoration: BoxDecoration(color: answer != null ? kPrimary : kSurface, shape: BoxShape.circle),
            child: Center(child: Text('${index + 1}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: answer != null ? Colors.white : kTextSub)))),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText))),
        ]),
        const SizedBox(height: 12),
        if (type == 'rating' || type == 'scale')
          _RatingInput(value: answer, onChanged: onAnswer)
        else if (options.isNotEmpty)
          _OptionsInput(options: options, value: answer, onChanged: onAnswer)
        else
          _TextInput(value: answer?.toString(), onChanged: onAnswer),
      ]),
    );
  }
}

class _RatingInput extends StatelessWidget {
  final dynamic value;
  final ValueChanged<int> onChanged;
  const _RatingInput({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceAround,
    children: List.generate(5, (i) {
      final v = i + 1;
      final sel = value == v;
      return GestureDetector(
        onTap: () => onChanged(v),
        child: Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
            color: sel ? kPrimary : kSurface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: sel ? kPrimary : kBorder),
          ),
          child: Center(child: Text('$v', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: sel ? Colors.white : kTextSub))),
        ),
      );
    }),
  );
}

class _OptionsInput extends StatelessWidget {
  final List<dynamic> options;
  final dynamic value;
  final ValueChanged<String> onChanged;
  const _OptionsInput({required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) => Column(
    children: options.map<Widget>((opt) {
      final label = opt is String ? opt : opt['text'] ?? opt.toString();
      final sel = value == label;
      return GestureDetector(
        onTap: () => onChanged(label),
        child: Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: 6),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: sel ? kPrimaryLight : kSurface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: sel ? kPrimary : kBorder),
          ),
          child: Text(label, style: TextStyle(fontSize: 13, color: sel ? kPrimary : kText, fontWeight: sel ? FontWeight.w700 : FontWeight.w400)),
        ),
      );
    }).toList(),
  );
}

class _TextInput extends StatefulWidget {
  final String? value;
  final ValueChanged<String> onChanged;
  const _TextInput({required this.value, required this.onChanged});
  @override
  State<_TextInput> createState() => _TextInputState();
}

class _TextInputState extends State<_TextInput> {
  late final TextEditingController _ctrl = TextEditingController(text: widget.value ?? '');
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => TextField(
    controller: _ctrl,
    maxLines: 3,
    decoration: const InputDecoration(hintText: 'اكتب إجابتك هنا...', hintStyle: TextStyle(fontSize: 13)),
    onChanged: widget.onChanged,
  );
}
