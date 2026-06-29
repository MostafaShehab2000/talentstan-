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
  // Leave requests pending manager approval
  List<dynamic> _leaveRequests  = [];
  // Other requests (إذن / مأمورية) pending manager approval
  List<dynamic> _otherRequests  = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ApiClient().dio;
      final results = await Future.wait([
        // طلبات الإجازة (بدون workflow)
        api.get('/leave/requests/pending-my-approval'),
        // طلبات بدون workflow (إذن/مأمورية يدوية)
        api.get('/other-requests/pending-manager'),
        // طلبات تمشي على workflow (الأدمن حددها)
        api.get('/workflow/pending-approvals'),
      ]);

      final leaveRaw  = results[0].data;
      final otherRaw  = results[1].data;
      final wfRaw     = results[2].data;

      // workflow items: فصّل إجازات عن طلبات أخرى
      final List<dynamic> wfItems = wfRaw is List ? wfRaw : (wfRaw['data'] ?? []);
      final wfLeave = wfItems.where((i) => i['relatedEntityType'] == 'leave_request').toList();
      final wfOther = wfItems.where((i) => i['relatedEntityType'] == 'other_request').toList();

      if (mounted) setState(() {
        _leaveRequests = [
          ...(leaveRaw is List ? leaveRaw : (leaveRaw['data'] ?? [])),
          ...wfLeave.map((i) => { ...?i['entityDetails'], '_workflowInstanceId': i['id'] }),
        ];
        _otherRequests = [
          ...(otherRaw is List ? otherRaw : (otherRaw['data'] ?? [])),
          ...wfOther.map((i) => { ...?i['entityDetails'], '_workflowInstanceId': i['id'] }),
        ];
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _totalPending => _leaveRequests.length + _otherRequests.length;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kSurface,
    appBar: AppBar(
      backgroundColor: Colors.white,
      title: const Text('طلبات الفريق', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
      actions: [
        if (_totalPending > 0)
          Container(
            margin: const EdgeInsets.only(left: 16, top: 10, bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: kDanger, borderRadius: BorderRadius.circular(20)),
            child: Center(child: Text('$_totalPending معلّق',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))),
          ),
      ],
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : _totalPending == 0
            ? _emptyState()
            : RefreshIndicator(
                color: kPrimary,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // ── إجازات ──
                    if (_leaveRequests.isNotEmpty) ...[
                      _SectionHeader(
                        icon: Icons.beach_access_rounded,
                        label: 'طلبات الإجازة',
                        count: _leaveRequests.length,
                        color: kPrimary,
                      ),
                      const SizedBox(height: 8),
                      ..._leaveRequests.map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _LeaveCard(r, onAction: _load),
                      )),
                    ],
                    // ── إذن / مأمورية ──
                    if (_otherRequests.isNotEmpty) ...[
                      if (_leaveRequests.isNotEmpty) const SizedBox(height: 8),
                      _SectionHeader(
                        icon: Icons.exit_to_app_rounded,
                        label: 'طلبات الإذن والمأمورية',
                        count: _otherRequests.length,
                        color: const Color(0xFF8B5CF6),
                      ),
                      const SizedBox(height: 8),
                      ..._otherRequests.map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _OtherCard(r, onAction: _load),
                      )),
                    ],
                  ],
                ),
              ),
  );

  Widget _emptyState() => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.task_alt_outlined, size: 72, color: kBorder),
      SizedBox(height: 16),
      Text('لا توجد طلبات معلّقة',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kText)),
      SizedBox(height: 8),
      Text('كل طلبات فريقك تمت معالجتها',
          style: TextStyle(fontSize: 14, color: kTextSub)),
    ]),
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color color;
  const _SectionHeader({required this.icon, required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) => Row(children: [
    Container(
      width: 28, height: 28,
      decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(6)),
      child: Icon(icon, size: 15, color: color),
    ),
    const SizedBox(width: 8),
    Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color)),
    const SizedBox(width: 6),
    Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
      child: Text('$count', style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w800)),
    ),
  ]);
}

// ─── Leave Request Card ───────────────────────────────────────────────────────

class _LeaveCard extends StatefulWidget {
  final Map<String, dynamic> r;
  final Future<void> Function() onAction;
  const _LeaveCard(this.r, {required this.onAction});
  @override
  State<_LeaveCard> createState() => _LeaveCardState();
}

class _LeaveCardState extends State<_LeaveCard> {
  bool _processing = false;

  Future<void> _act(String action) async {
    setState(() => _processing = true);
    try {
      final wfId = widget.r['_workflowInstanceId'] as String?;
      if (wfId != null) {
        // طلب يمشي على workflow من الأدمن
        await ApiClient().dio.post('/workflow/instances/$wfId/action',
            data: {'action': action == 'approve' ? 'approve' : 'reject'});
      } else {
        // طلب إجازة يدوي
        await ApiClient().dio.patch('/leave/requests/${widget.r['id']}/$action');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(action == 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض'),
          backgroundColor: action == 'approve' ? kSuccess : kDanger,
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
    final r       = widget.r;
    final empName = r['employee']?['fullName'] ?? '—';
    final dept    = r['employee']?['department']?['name'] ?? '';
    final type    = r['leaveType']?['name'] ?? 'إجازة';
    final start   = _fmt(r['startDate']);
    final end     = _fmt(r['endDate']);
    final days    = r['totalDays'] ?? 1;
    final reason  = r['reason'] as String?;

    return _CardShell(
      color: kPrimary,
      empName: empName,
      dept: dept,
      tag: type,
      processing: _processing,
      onApprove: () => _act('approve'),
      onReject:  () => _act('reject'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(8)),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('الفترة', style: TextStyle(fontSize: 10, color: kTextSub)),
              Text('$start — $end', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
            ])),
            Container(width: 1, height: 28, color: kBorder),
            const SizedBox(width: 12),
            Column(children: [
              const Text('المدة', style: TextStyle(fontSize: 10, color: kTextSub)),
              Text('$days ${int.tryParse(days.toString()) == 1 ? "يوم" : "أيام"}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
            ]),
          ]),
        ),
        if (reason != null && reason.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(reason, style: const TextStyle(fontSize: 12, color: kTextSub), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ]),
    );
  }

  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return '—'; } }
}

// ─── Other Request Card (إذن / مأمورية) ──────────────────────────────────────

class _OtherCard extends StatefulWidget {
  final Map<String, dynamic> r;
  final Future<void> Function() onAction;
  const _OtherCard(this.r, {required this.onAction});
  @override
  State<_OtherCard> createState() => _OtherCardState();
}

class _OtherCardState extends State<_OtherCard> {
  bool _processing = false;

  static const _typeLabels = {
    'permission': ('طلب إذن',     Color(0xFF8B5CF6)),
    'mission':    ('طلب مأمورية', Color(0xFF0EA5E9)),
    'advance':    ('طلب سلفة',    Color(0xFF10B981)),
  };

  Future<void> _act(String action) async {
    setState(() => _processing = true);
    try {
      final wfId = widget.r['_workflowInstanceId'] as String?;
      if (wfId != null) {
        // طلب يمشي على workflow من الأدمن
        await ApiClient().dio.post('/workflow/instances/$wfId/action',
            data: {'action': action == 'approve' ? 'approve' : 'reject'});
      } else {
        // طلب يدوي
        await ApiClient().dio.patch('/other-requests/${widget.r['id']}/manager-$action');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(action == 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض'),
          backgroundColor: action == 'approve' ? kSuccess : kDanger,
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
    final r        = widget.r;
    final type     = r['type'] as String? ?? 'other';
    final empName  = r['employee']?['fullName'] ?? '—';
    final dept     = r['employee']?['employeeCode'] ?? '';
    final details  = r['details'] as String?;
    final fromTime = r['fromTime'] as String?;
    final toTime   = r['toTime']   as String?;
    final created  = _fmt(r['createdAt']);
    final meta     = _typeLabels[type] ?? ('طلب', const Color(0xFF6B7280));

    return _CardShell(
      color: meta.$2,
      empName: empName,
      dept: dept,
      tag: meta.$1,
      processing: _processing,
      onApprove: () => _act('approve'),
      onReject:  () => _act('reject'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (fromTime != null && toTime != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(color: meta.$2.withAlpha(12), borderRadius: BorderRadius.circular(8)),
            child: Row(children: [
              Icon(Icons.access_time_rounded, size: 15, color: meta.$2),
              const SizedBox(width: 6),
              Text('من $fromTime إلى $toTime',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: meta.$2)),
            ]),
          ),
        if (details != null && details.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(details, style: const TextStyle(fontSize: 12, color: kTextSub), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
        const SizedBox(height: 4),
        Text('تاريخ التقديم: $created', style: const TextStyle(fontSize: 10, color: kTextSub)),
      ]),
    );
  }

  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return '—'; } }
}

// ─── Shared Card Shell ────────────────────────────────────────────────────────

class _CardShell extends StatelessWidget {
  final Color color;
  final String empName, dept, tag;
  final bool processing;
  final VoidCallback onApprove, onReject;
  final Widget child;
  const _CardShell({
    required this.color, required this.empName, required this.dept,
    required this.tag, required this.processing,
    required this.onApprove, required this.onReject, required this.child,
  });

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border(right: BorderSide(color: color, width: 4)),
      boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
    ),
    padding: const EdgeInsets.all(14),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Header
      Row(children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: color.withAlpha(25),
          child: Text(empName.isNotEmpty ? empName[0] : '?',
              style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(empName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: kText)),
          if (dept.isNotEmpty)
            Text(dept, style: const TextStyle(fontSize: 11, color: kTextSub)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(20)),
          child: Text(tag, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
        ),
      ]),
      const SizedBox(height: 10),
      child,
      const SizedBox(height: 12),
      if (processing)
        const Center(child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2))
      else
        Row(children: [
          Expanded(child: OutlinedButton.icon(
            onPressed: onReject,
            icon: const Icon(Icons.close, size: 15),
            label: const Text('رفض'),
            style: OutlinedButton.styleFrom(
              foregroundColor: kDanger,
              side: const BorderSide(color: kDanger),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          )),
          const SizedBox(width: 10),
          Expanded(child: ElevatedButton.icon(
            onPressed: onApprove,
            icon: const Icon(Icons.check, size: 15),
            label: const Text('موافقة → HR'),
            style: ElevatedButton.styleFrom(
              backgroundColor: kSuccess,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          )),
        ]),
    ]),
  );
}
