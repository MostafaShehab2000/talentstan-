import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

const _months = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

class PayslipsScreen extends StatefulWidget {
  const PayslipsScreen({super.key});
  @override
  State<PayslipsScreen> createState() => _PayslipsScreenState();
}

class _PayslipsScreenState extends State<PayslipsScreen> {
  List<dynamic> _payslips = [];
  bool _loading = true;
  int _selectedIndex = 0;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/payslips/me');
      if (mounted) setState(() {
        _payslips = res.data is List ? res.data : (res.data['data'] ?? []);
        _selectedIndex = 0;
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
      title: const Text('كشوف الراتب', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : _payslips.isEmpty
            ? _EmptyPayslips()
            : RefreshIndicator(
                color: kPrimary,
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _MonthNavigator(
                      payslips: _payslips,
                      selectedIndex: _selectedIndex,
                      onChanged: (i) => setState(() => _selectedIndex = i),
                    ),
                    const SizedBox(height: 16),
                    _PayslipDetail(_payslips[_selectedIndex]),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
  );
}

// ─── Month Navigator ──────────────────────────────────────────────────────────

class _MonthNavigator extends StatelessWidget {
  final List<dynamic> payslips;
  final int selectedIndex;
  final ValueChanged<int> onChanged;
  const _MonthNavigator({required this.payslips, required this.selectedIndex, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final p     = payslips[selectedIndex];
    final month = _months[p['month'] ?? 1];
    final year  = p['year'] ?? '';
    final canPrev = selectedIndex < payslips.length - 1;
    final canNext = selectedIndex > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        IconButton(
          onPressed: canPrev ? () => onChanged(selectedIndex + 1) : null,
          icon: Icon(Icons.chevron_right, color: canPrev ? kText : kBorder, size: 28),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
        Column(children: [
          Text('$month $year', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: kText)),
          const Text('كشف الراتب', style: TextStyle(fontSize: 12, color: kTextSub)),
        ]),
        IconButton(
          onPressed: canNext ? () => onChanged(selectedIndex - 1) : null,
          icon: Icon(Icons.chevron_left, color: canNext ? kText : kBorder, size: 28),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
        ),
      ]),
    );
  }
}

// ─── Payslip Detail ───────────────────────────────────────────────────────────

class _PayslipDetail extends StatelessWidget {
  final Map<String, dynamic> p;
  const _PayslipDetail(this.p);

  @override
  Widget build(BuildContext context) {
    final net       = _num(p['netSalary']);
    final basic     = _num(p['basicSalary']);
    final allowance = _num(p['allowances']);
    final bonus     = _num(p['bonus']);
    final deduction = _num(p['deductions']);
    final month     = _months[p['month'] ?? 1];
    final year      = p['year'] ?? '';

    return Column(children: [
      // Salary summary card
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(children: [
          Container(
            width: 60, height: 60,
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
            child: const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 30),
          ),
          const SizedBox(height: 12),
          Text('${_fmtNum(net)} جنيه', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
          const Text('صافي الراتب', style: TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
            child: Text('$month $year', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ]),
      ),
      const SizedBox(height: 16),

      // Breakdown table
      Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
        child: Column(children: [
          _BreakdownHeader(),
          _BreakdownRow(label: 'الراتب الأساسي', value: basic, color: kText),
          if (allowance > 0) _BreakdownRow(label: 'البدلات', value: allowance, color: kSuccess, prefix: '+'),
          if (bonus > 0) _BreakdownRow(label: 'المكافآت', value: bonus, color: kSuccess, prefix: '+'),
          if (deduction > 0) _BreakdownRow(label: 'الخصومات', value: deduction, color: kDanger, prefix: '-'),
          _BreakdownDivider(),
          _BreakdownRow(label: 'صافي الراتب', value: net, color: kPrimary, bold: true),
          const SizedBox(height: 4),
        ]),
      ),
      const SizedBox(height: 16),

      // Download button
      SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: () async {
            final url = p['pdfUrl'] as String?;
            if (url != null && url.isNotEmpty) {
              final uri = Uri.parse(url);
              if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('لا يوجد PDF مرفق لهذا الكشف بعد')));
            }
          },
          style: OutlinedButton.styleFrom(
            foregroundColor: kPrimary,
            side: const BorderSide(color: kPrimary),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          icon: const Icon(Icons.picture_as_pdf_rounded),
          label: Text(p['pdfUrl'] != null ? 'تحميل PDF' : 'لا يوجد PDF', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        ),
      ),
    ]);
  }

  double _num(dynamic v) => double.tryParse(v?.toString() ?? '0') ?? 0;
  String _fmtNum(double v) {
    if (v == v.roundToDouble()) return v.toInt().toString();
    return v.toStringAsFixed(2);
  }
}

class _BreakdownHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: const BoxDecoration(
      color: kSurface,
      borderRadius: BorderRadius.vertical(top: Radius.circular(14)),
    ),
    child: const Row(children: [
      Expanded(child: Text('البند', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSub))),
      Text('المبلغ (جنيه)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kTextSub)),
    ]),
  );
}

class _BreakdownRow extends StatelessWidget {
  final String label;
  final double value;
  final Color color;
  final String prefix;
  final bool bold;
  const _BreakdownRow({required this.label, required this.value, required this.color, this.prefix = '', this.bold = false});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
    child: Row(children: [
      Expanded(child: Text(label, style: TextStyle(fontSize: 14, fontWeight: bold ? FontWeight.w800 : FontWeight.w500, color: bold ? color : kText))),
      Text(
        '$prefix${_fmt(value)}',
        style: TextStyle(fontSize: 14, fontWeight: bold ? FontWeight.w900 : FontWeight.w700, color: color),
      ),
    ]),
  );
  String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
}

class _BreakdownDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.symmetric(horizontal: 16),
    height: 1,
    color: kBorder,
  );
}

class _EmptyPayslips extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 80, height: 80, decoration: const BoxDecoration(color: kSurface, shape: BoxShape.circle), child: const Icon(Icons.receipt_long_outlined, size: 40, color: kTextSub)),
      const SizedBox(height: 16),
      const Text('لا توجد كشوف راتب', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText)),
      const SizedBox(height: 6),
      const Text('ستظهر هنا كشوف الراتب الشهرية', style: TextStyle(fontSize: 14, color: kTextSub)),
    ]),
  );
}
