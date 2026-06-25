import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class ManagerScreen extends StatefulWidget {
  const ManagerScreen({super.key});
  @override
  State<ManagerScreen> createState() => _ManagerScreenState();
}

class _ManagerScreenState extends State<ManagerScreen> {
  List<dynamic> _pending = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/leave/requests/pending-my-approval',
          queryParameters: {'status': 'submitted'});
      if (mounted) setState(() {
        _pending = res.data is List ? res.data : (res.data['data'] ?? []);
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
      backgroundColor: Colors.white,
      title: const Text('طلبات الفريق', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
      actions: [
        if (_pending.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(left: 16, top: 10, bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
            decoration: BoxDecoration(color: kDanger, borderRadius: BorderRadius.circular(20)),
            child: Center(child: Text('${_pending.length} معلّق', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))),
          ),
      ],
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : _pending.isEmpty
            ? _emptyState()
            : RefreshIndicator(
                color: kPrimary,
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _pending.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _RequestCard(_pending[i], onAction: _load),
                ),
              ),
  );

  Widget _emptyState() => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.task_alt_outlined, size: 72, color: kBorder),
      SizedBox(height: 16),
      Text('لا توجد طلبات معلّقة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kText)),
      SizedBox(height: 8),
      Text('كل طلبات فريقك تمت معالجتها', style: TextStyle(fontSize: 14, color: kTextSub)),
    ]),
  );
}

class _RequestCard extends StatefulWidget {
  final Map<String, dynamic> r;
  final Future<void> Function() onAction;
  const _RequestCard(this.r, {required this.onAction});
  @override
  State<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends State<_RequestCard> {
  bool _processing = false;

  Future<void> _act(String action) async {
    setState(() => _processing = true);
    try {
      await ApiClient().dio.patch('/leave/requests/${widget.r['id']}/$action');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(action == 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض'),
          backgroundColor: action == 'approve' ? kSuccess : kDanger,
          duration: const Duration(seconds: 2),
        ));
        await widget.onAction();
      }
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'حدث خطأ';
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString())));
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r         = widget.r;
    final empName   = r['employee']?['fullName'] ?? '—';
    final dept      = r['employee']?['department']?['name'] ?? '';
    final typeName  = r['leaveType']?['name'] ?? 'طلب';
    final category  = r['leaveType']?['category'] ?? 'leave';
    final start     = _fmt(r['startDate']);
    final end       = _fmt(r['endDate']);
    final days      = r['totalDays'] ?? 1;
    final reason    = r['reason'] as String?;
    final created   = _fmt(r['createdAt']);

    final catColor = switch (category) {
      'permission' => const Color(0xFF8B5CF6),
      'mission'    => const Color(0xFF0EA5E9),
      _            => kPrimary,
    };

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border(right: BorderSide(color: catColor, width: 4)),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: catColor.withAlpha(25),
              child: Text(empName.isNotEmpty ? empName[0] : '?',
                style: TextStyle(color: catColor, fontWeight: FontWeight.w800, fontSize: 18)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(empName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText)),
              Text(dept.isNotEmpty ? dept : 'بدون قسم', style: const TextStyle(fontSize: 12, color: kTextSub)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: catColor.withAlpha(25), borderRadius: BorderRadius.circular(20)),
              child: Text(typeName, style: TextStyle(color: catColor, fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ]),

          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('الفترة', style: TextStyle(fontSize: 11, color: kTextSub)),
                const SizedBox(height: 2),
                Text('$start — $end', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
              ])),
              Container(width: 1, height: 30, color: kBorder),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
                const Text('المدة', style: TextStyle(fontSize: 11, color: kTextSub)),
                const SizedBox(height: 2),
                Text('$days ${int.tryParse(days.toString()) == 1 ? "يوم" : "أيام"}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
              ]),
            ]),
          ),

          if (reason != null && reason.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.notes_outlined, size: 14, color: kTextSub),
              const SizedBox(width: 6),
              Expanded(child: Text(reason, style: const TextStyle(fontSize: 13, color: kTextSub), maxLines: 2, overflow: TextOverflow.ellipsis)),
            ]),
          ],

          const SizedBox(height: 4),
          Text('تاريخ التقديم: $created', style: const TextStyle(fontSize: 11, color: kTextSub)),

          const SizedBox(height: 12),
          if (_processing)
            const Center(child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2))
          else
            Row(children: [
              Expanded(child: OutlinedButton.icon(
                onPressed: () => _act('reject'),
                icon: const Icon(Icons.close, size: 16),
                label: const Text('رفض'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: kDanger,
                  side: const BorderSide(color: kDanger),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              )),
              const SizedBox(width: 10),
              Expanded(child: ElevatedButton.icon(
                onPressed: () => _act('approve'),
                icon: const Icon(Icons.check, size: 16),
                label: const Text('موافقة'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: kSuccess,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              )),
            ]),
        ]),
      ),
    );
  }

  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return ''; } }
}
