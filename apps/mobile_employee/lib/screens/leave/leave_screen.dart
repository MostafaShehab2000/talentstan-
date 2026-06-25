import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class LeaveScreen extends StatefulWidget {
  const LeaveScreen({super.key});
  @override
  State<LeaveScreen> createState() => LeaveScreenState();
}

class LeaveScreenState extends State<LeaveScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 4, vsync: this);

  List<dynamic> _myRequests    = [];
  List<dynamic> _approvals     = [];
  List<dynamic> _types         = [];
  List<dynamic> _otherRequests = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ApiClient().dio;
      final [reqRes, typeRes, otherRes] = await Future.wait([
        api.get('/leave/requests/me'),
        api.get('/leave/types'),
        api.get('/other-requests/me'),
      ]);
      List<dynamic> approvals = [];
      try {
        final apRes = await api.get('/leave/requests/pending-approvals');
        approvals = apRes.data is List ? apRes.data : (apRes.data['data'] ?? []);
      } catch (_) {}
      if (mounted) setState(() {
        _myRequests    = reqRes.data is List ? reqRes.data : (reqRes.data['data'] ?? []);
        _types         = typeRes.data is List ? typeRes.data : (typeRes.data['data'] ?? []);
        _otherRequests = otherRes.data is List ? otherRes.data : (otherRes.data['data'] ?? []);
        _approvals     = approvals;
        _loading       = false;
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
      title: const Text('الطلبات', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
      actions: [
        PopupMenuButton<String>(
          onSelected: (v) {
            if (v == 'leave') _showNewLeaveRequest();
            else _showNewOtherRequest(v);
          },
          itemBuilder: (_) => [
            const PopupMenuItem(value: 'leave',      child: Text('طلب إجازة')),
            const PopupMenuItem(value: 'permission', child: Text('طلب إذن')),
            const PopupMenuItem(value: 'mission',    child: Text('طلب مأمورية')),
          ],
          child: Container(
            margin: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(20)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.add, size: 16, color: Colors.white),
              SizedBox(width: 4),
              Text('طلب جديد', style: TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
      ],
      bottom: TabBar(
        controller: _tabs,
        tabs: const [
          Tab(text: 'إجازاتي'),
          Tab(text: 'موافقات'),
          Tab(text: 'الرصيد'),
          Tab(text: 'إذن/مأمورية'),
        ],
        indicatorColor: kPrimary,
        dividerColor: kBorder,
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
        unselectedLabelStyle: const TextStyle(fontSize: 12),
      ),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : TabBarView(
            controller: _tabs,
            children: [
              _MyRequestsTab(requests: _myRequests, onRefresh: _load, onAdd: _showNewLeaveRequest),
              _ApprovalsTab(approvals: _approvals, onRefresh: _load),
              _BalanceTab(types: _types, requests: _myRequests, onAdd: _showNewLeaveRequest),
              _OtherRequestsTab(requests: _otherRequests, onRefresh: _load,
                  onAdd: () => _showNewOtherRequest('permission')),
            ],
          ),
  );

  void _showNewLeaveRequest() {
    final startCtrl  = TextEditingController();
    final endCtrl    = TextEditingController();
    final reasonCtrl = TextEditingController();
    String? selectedTypeId;
    String? errorMsg;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('طلب إجازة جديد', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
            ]),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'نوع الإجازة', prefixIcon: Icon(Icons.category_outlined)),
              items: _types.map<DropdownMenuItem<String>>((t) =>
                DropdownMenuItem(value: t['id'].toString(), child: Text(t['name'] ?? ''))).toList(),
              onChanged: (v) => selectedTypeId = v,
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _DateField(label: 'من', ctrl: startCtrl, ctx: ctx)),
              const SizedBox(width: 10),
              Expanded(child: _DateField(label: 'إلى', ctrl: endCtrl, ctx: ctx)),
            ]),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'سبب الإجازة (اختياري)', prefixIcon: Icon(Icons.notes_outlined), alignLabelWithHint: true),
            ),
            if (errorMsg != null) Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(errorMsg!, style: const TextStyle(color: kDanger, fontSize: 13)),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                if (selectedTypeId == null) { setS(() => errorMsg = 'اختر نوع الإجازة'); return; }
                if (startCtrl.text.isEmpty || endCtrl.text.isEmpty) { setS(() => errorMsg = 'اختر تاريخ البداية والنهاية'); return; }
                try {
                  await ApiClient().dio.post('/leave/requests', data: {
                    'leaveTypeId': selectedTypeId,
                    'startDate': startCtrl.text,
                    'endDate': endCtrl.text,
                    'reason': reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim(),
                  });
                  if (ctx.mounted) { Navigator.pop(ctx); _load(); }
                } on DioException catch (e) {
                  final msg = e.response?.data?['message'];
                  setS(() => errorMsg = (msg is List ? msg.join(' ') : msg?.toString()) ?? 'حدث خطأ');
                }
              },
              child: const Text('إرسال الطلب'),
            ),
          ]),
        ),
      ),
    );
  }

  void _showNewOtherRequest(String initialType) {
    String selectedType = initialType;
    final detailsCtrl = TextEditingController();
    String? errorMsg;

    final typeLabels = {
      'permission': 'طلب إذن',
      'mission':    'طلب مأمورية',
      'hr_letter':  'خطاب HR',
      'experience_letter': 'خطاب خبرة',
      'salary_certificate': 'شهادة راتب',
      'bank_letter': 'خطاب بنكي',
      'other':      'طلب آخر',
    };

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(typeLabels[selectedType] ?? 'طلب جديد',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
            ]),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: selectedType,
              decoration: const InputDecoration(labelText: 'نوع الطلب', prefixIcon: Icon(Icons.category_outlined)),
              items: typeLabels.entries.map((e) =>
                DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
              onChanged: (v) => setS(() => selectedType = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: detailsCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'تفاصيل / سبب (اختياري)',
                prefixIcon: Icon(Icons.notes_outlined),
                alignLabelWithHint: true,
              ),
            ),
            if (errorMsg != null) Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(errorMsg!, style: const TextStyle(color: kDanger, fontSize: 13)),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                try {
                  await ApiClient().dio.post('/other-requests', data: {
                    'type': selectedType,
                    'details': detailsCtrl.text.trim().isEmpty ? null : detailsCtrl.text.trim(),
                  });
                  if (ctx.mounted) { Navigator.pop(ctx); _load(); _tabs.animateTo(3); }
                } on DioException catch (e) {
                  final msg = e.response?.data?['message'];
                  setS(() => errorMsg = (msg is List ? msg.join(' ') : msg?.toString()) ?? 'حدث خطأ');
                }
              },
              child: const Text('إرسال الطلب'),
            ),
          ]),
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final BuildContext ctx;
  const _DateField({required this.label, required this.ctrl, required this.ctx});

  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    readOnly: true,
    decoration: InputDecoration(labelText: label, prefixIcon: const Icon(Icons.calendar_today_outlined)),
    onTap: () async {
      final d = await showDatePicker(context: ctx, initialDate: DateTime.now(), firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)));
      if (d != null) ctrl.text = d.toIso8601String().substring(0, 10);
    },
  );
}

// ─── Tab: My Leave Requests ───────────────────────────────────────────────────

class _MyRequestsTab extends StatelessWidget {
  final List<dynamic> requests;
  final Future<void> Function() onRefresh;
  final VoidCallback onAdd;
  const _MyRequestsTab({required this.requests, required this.onRefresh, required this.onAdd});

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.event_available_outlined, size: 64, color: kBorder),
        const SizedBox(height: 12),
        const Text('لا توجد طلبات إجازة', style: TextStyle(color: kTextSub, fontSize: 15)),
        const SizedBox(height: 16),
        ElevatedButton.icon(onPressed: onAdd, icon: const Icon(Icons.add), label: const Text('طلب إجازة جديد')),
      ]),
    );

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: requests.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _LeaveRequestCard(requests[i]),
      ),
    );
  }
}

class _LeaveRequestCard extends StatelessWidget {
  final Map<String, dynamic> r;
  const _LeaveRequestCard(this.r);

  @override
  Widget build(BuildContext context) {
    final status   = r['status'] ?? 'pending';
    final typeName = r['leaveType']?['name'] ?? 'إجازة';
    final days     = r['totalDays'] ?? 1;
    final start    = _fmt(r['startDate']);
    final end      = _fmt(r['endDate']);
    final reason   = r['reason'] as String?;
    final info     = _statusInfo(status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(right: BorderSide(color: info.$1, width: 3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(typeName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: info.$3, borderRadius: BorderRadius.circular(20)),
            child: Text(info.$2, style: TextStyle(color: info.$1, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.calendar_today_outlined, size: 13, color: kTextSub),
          const SizedBox(width: 4),
          Text('$start — $end', style: const TextStyle(fontSize: 12, color: kTextSub)),
          const SizedBox(width: 10),
          const Icon(Icons.access_time_rounded, size: 13, color: kTextSub),
          const SizedBox(width: 4),
          Text('$days ${days == 1 ? "يوم" : "أيام"}', style: const TextStyle(fontSize: 12, color: kTextSub, fontWeight: FontWeight.w600)),
        ]),
        if (reason != null && reason.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(reason, style: const TextStyle(fontSize: 12, color: kTextSub), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ]),
    );
  }

  (Color, String, Color) _statusInfo(String s) => switch (s) {
    'approved' => (kSuccess, 'موافق عليه', kSuccessLight),
    'rejected' => (kDanger, 'مرفوض', kDangerLight),
    _ => (kWarning, 'قيد المراجعة', kWarningLight),
  };
  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return ''; } }
}

// ─── Tab: Other Requests (إذن / مأمورية) ──────────────────────────────────────

class _OtherRequestsTab extends StatelessWidget {
  final List<dynamic> requests;
  final Future<void> Function() onRefresh;
  final VoidCallback onAdd;
  const _OtherRequestsTab({required this.requests, required this.onRefresh, required this.onAdd});

  static const _typeLabels = {
    'permission': ('طلب إذن', Icons.exit_to_app_rounded, Color(0xFF8B5CF6)),
    'mission':    ('طلب مأمورية', Icons.work_outline_rounded, Color(0xFF0EA5E9)),
    'hr_letter':  ('خطاب HR', Icons.description_outlined, Color(0xFF10B981)),
    'experience_letter': ('خطاب خبرة', Icons.workspace_premium_outlined, Color(0xFF10B981)),
    'salary_certificate': ('شهادة راتب', Icons.attach_money_rounded, Color(0xFF10B981)),
    'bank_letter': ('خطاب بنكي', Icons.account_balance_outlined, Color(0xFF10B981)),
    'other': ('طلب آخر', Icons.more_horiz_rounded, Color(0xFF6B7280)),
  };

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.assignment_outlined, size: 64, color: kBorder),
        const SizedBox(height: 12),
        const Text('لا توجد طلبات', style: TextStyle(color: kTextSub, fontSize: 15)),
        const SizedBox(height: 16),
        ElevatedButton.icon(onPressed: onAdd, icon: const Icon(Icons.add), label: const Text('طلب جديد')),
      ]),
    );

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: requests.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _OtherRequestCard(requests[i], typeLabels: _typeLabels),
      ),
    );
  }
}

class _OtherRequestCard extends StatelessWidget {
  final Map<String, dynamic> r;
  final Map<String, (String, IconData, Color)> typeLabels;
  const _OtherRequestCard(this.r, {required this.typeLabels});

  @override
  Widget build(BuildContext context) {
    final type      = r['type'] as String? ?? 'other';
    final status    = r['status'] as String? ?? 'submitted';
    final details   = r['details'] as String?;
    final createdAt = _fmt(r['createdAt']);
    final meta      = typeLabels[type] ?? ('طلب', Icons.more_horiz_rounded, const Color(0xFF6B7280));
    final si        = _statusInfo(status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(right: BorderSide(color: si.$1, width: 3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: meta.$3.withAlpha(30), borderRadius: BorderRadius.circular(8)),
            child: Icon(meta.$2, color: meta.$3, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(meta.$1, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText))),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: si.$3, borderRadius: BorderRadius.circular(20)),
            child: Text(si.$2, style: TextStyle(color: si.$1, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),
        if (details != null && details.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(details, style: const TextStyle(fontSize: 12, color: kTextSub), maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.access_time_rounded, size: 13, color: kTextSub),
          const SizedBox(width: 4),
          Text(createdAt, style: const TextStyle(fontSize: 11, color: kTextSub)),
        ]),
      ]),
    );
  }

  (Color, String, Color) _statusInfo(String s) => switch (s) {
    'approved' => (kSuccess, 'موافق عليه', kSuccessLight),
    'rejected' => (kDanger, 'مرفوض', kDangerLight),
    'cancelled' => (kTextSub, 'ملغي', kSurface),
    _ => (kWarning, 'قيد المراجعة', kWarningLight),
  };
  String _fmt(dynamic d) {
    try { return (d as String).substring(0, 10); } catch (_) { return ''; }
  }
}

// ─── Tab: Approvals ──────────────────────────────────────────────────────────

class _ApprovalsTab extends StatelessWidget {
  final List<dynamic> approvals;
  final Future<void> Function() onRefresh;
  const _ApprovalsTab({required this.approvals, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (approvals.isEmpty) return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.task_alt_outlined, size: 64, color: kBorder),
        SizedBox(height: 12),
        Text('لا توجد طلبات تنتظر موافقتك', style: TextStyle(color: kTextSub, fontSize: 15)),
      ]),
    );

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: approvals.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _ApprovalCard(approvals[i], onRefresh: onRefresh),
      ),
    );
  }
}

class _ApprovalCard extends StatefulWidget {
  final Map<String, dynamic> r;
  final Future<void> Function() onRefresh;
  const _ApprovalCard(this.r, {required this.onRefresh});
  @override
  State<_ApprovalCard> createState() => _ApprovalCardState();
}

class _ApprovalCardState extends State<_ApprovalCard> {
  bool _processing = false;

  Future<void> _act(String action) async {
    setState(() => _processing = true);
    try {
      await ApiClient().dio.patch('/leave/requests/${widget.r['id']}/$action');
      await widget.onRefresh();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('حدث خطأ')));
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r        = widget.r;
    final typeName = r['leaveType']?['name'] ?? 'إجازة';
    final empName  = r['employee']?['fullName'] ?? '—';
    final days     = r['totalDays'] ?? 1;
    final start    = _fmt(r['startDate']);
    final end      = _fmt(r['endDate']);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(radius: 18, backgroundColor: kPrimaryLight, child: Text(empName.isNotEmpty ? empName[0] : '?', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800))),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(empName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText)),
            Text('$typeName · $days ${days == 1 ? "يوم" : "أيام"}', style: const TextStyle(fontSize: 12, color: kTextSub)),
          ])),
        ]),
        const SizedBox(height: 8),
        Text('$start — $end', style: const TextStyle(fontSize: 12, color: kTextSub)),
        const SizedBox(height: 12),
        if (_processing)
          const Center(child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2))
        else
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () => _act('reject'),
              style: OutlinedButton.styleFrom(foregroundColor: kDanger, side: const BorderSide(color: kDanger)),
              child: const Text('رفض'),
            )),
            const SizedBox(width: 10),
            Expanded(child: ElevatedButton(
              onPressed: () => _act('approve'),
              child: const Text('موافقة'),
            )),
          ]),
      ]),
    );
  }

  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return ''; } }
}

// ─── Tab: Balance ─────────────────────────────────────────────────────────────

class _BalanceTab extends StatelessWidget {
  final List<dynamic> types;
  final List<dynamic> requests;
  final VoidCallback onAdd;
  const _BalanceTab({required this.types, required this.requests, required this.onAdd});

  @override
  Widget build(BuildContext context) {
    final balanceDefs = [
      ('سنوية',  Icons.beach_access_rounded,    kPrimary,  kPrimaryLight),
      ('مرضية',  Icons.medical_services_rounded, kSuccess,  kSuccessLight),
      ('طارئة',  Icons.warning_amber_rounded,   kWarning,  kWarningLight),
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ...balanceDefs.map((t) {
          final match     = types.where((lt) => (lt['name'] as String? ?? '').contains(t.$1)).firstOrNull;
          final total     = (match?['defaultDays'] as num?)?.toInt() ?? 0;
          final used      = requests.where((r) => r['leaveType']?['name'] == match?['name'] && r['status'] == 'approved').fold<int>(0, (s, r) => s + ((r['totalDays'] as num?)?.toInt() ?? 0));
          final remaining = (total - used).clamp(0, total);
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _BalanceCard(
              label: 'إجازة ${t.$1}',
              icon: t.$2,
              color: t.$3,
              bgColor: t.$4,
              remaining: remaining,
              total: total,
              used: used,
            ),
          );
        }),
        const SizedBox(height: 8),
        ElevatedButton.icon(
          onPressed: onAdd,
          icon: const Icon(Icons.add),
          label: const Text('طلب إجازة جديد'),
        ),
      ],
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color, bgColor;
  final int remaining, total, used;
  const _BalanceCard({required this.label, required this.icon, required this.color, required this.bgColor, required this.remaining, required this.total, required this.used});

  @override
  Widget build(BuildContext context) {
    final pct = total > 0 ? remaining / total : 0.0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Container(width: 48, height: 48, decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)), child: Icon(icon, color: color, size: 24)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText)),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct.clamp(0.0, 1.0),
              backgroundColor: bgColor,
              color: color,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 4),
          Text('متبقي $remaining من $total يوم', style: const TextStyle(fontSize: 11, color: kTextSub)),
        ])),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
          Text('$remaining', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: color)),
          const Text('يوم', style: TextStyle(fontSize: 11, color: kTextSub)),
        ]),
      ]),
    );
  }
}
