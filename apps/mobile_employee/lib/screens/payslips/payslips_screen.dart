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
    final net    = _num(p['netSalary']);
    final basic  = _num(p['basicSalary']);
    final month  = _months[p['month'] ?? 1];
    final year   = p['year'] ?? '';

    // allowances هو JSON object { variable, overtime, incentive, workingDays, other, paymentMethod }
    final al = p['allowances'] is Map ? p['allowances'] as Map : <String, dynamic>{};
    final variable   = _num(al['variable']);
    final overtime   = _num(al['overtime']);
    final incentive  = _num(al['incentive']);
    final otherAl    = _num(al['other']);
    final workDays   = al['workingDays']?.toString() ?? '—';
    final payMethod  = al['paymentMethod']?.toString() ?? 'cash';

    // deductions هو JSON object { healthcare, advances, other }
    final ded = p['deductions'] is Map ? p['deductions'] as Map : <String, dynamic>{};
    final healthcare = _num(ded['healthcare']);
    final advances   = _num(ded['advances']);
    final otherDed   = _num(ded['other']);

    final totalEarnings = basic + variable + overtime + incentive + otherAl;
    final totalDeductions = healthcare + advances + otherDed;

    return Column(children: [
      // بطاقة الصافي
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(children: [
          const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 32),
          const SizedBox(height: 8),
          Text('${_fmtNum(net)} جنيه', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
          const Text('صافي الراتب', style: TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 10),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
              child: Text('$month $year', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(payMethod == 'bank' ? Icons.account_balance_rounded : Icons.payments_rounded, color: Colors.white, size: 14),
                const SizedBox(width: 4),
                Text(payMethod == 'bank' ? 'بنك' : 'كاش', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
              ]),
            ),
          ]),
        ]),
      ),
      const SizedBox(height: 12),

      // معلومات عامة
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
        child: Row(children: [
          const Icon(Icons.calendar_today_outlined, size: 15, color: kTextSub),
          const SizedBox(width: 6),
          Text('أيام العمل: $workDays يوم', style: const TextStyle(fontSize: 13, color: kTextSub)),
        ]),
      ),
      const SizedBox(height: 12),

      // المستحقات
      _Section(
        title: 'المستحقات',
        titleColor: kSuccess,
        rows: [
          _Row('الراتب الأساسي', basic),
          if (variable > 0)   _Row('المتغير', variable),
          if (overtime > 0)   _Row('الوقت الإضافي', overtime),
          if (incentive > 0)  _Row('الحافز', incentive),
          if (otherAl > 0)    _Row('بدلات أخرى', otherAl),
        ],
        total: totalEarnings,
        totalLabel: 'إجمالي المستحقات',
        totalColor: kSuccess,
        prefix: '+',
      ),
      const SizedBox(height: 10),

      // الخصومات
      if (totalDeductions > 0) ...[
        _Section(
          title: 'الخصومات',
          titleColor: kDanger,
          rows: [
            if (healthcare > 0) _Row('الرعاية الصحية', healthcare),
            if (advances > 0)   _Row('السلف', advances),
            if (otherDed > 0)   _Row('خصومات أخرى', otherDed),
          ],
          total: totalDeductions,
          totalLabel: 'إجمالي الخصومات',
          totalColor: kDanger,
          prefix: '-',
        ),
        const SizedBox(height: 10),
      ],

      // الصافي
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: kPrimary.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kPrimary.withOpacity(0.2)),
        ),
        child: Row(children: [
          const Expanded(child: Text('صافي الراتب', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText))),
          Text('${_fmtNum(net)} جنيه', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: kPrimary)),
        ]),
      ),
      const SizedBox(height: 14),

      // PDF
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
          label: Text(p['pdfUrl'] != null && (p['pdfUrl'] as String).isNotEmpty ? 'تحميل PDF' : 'لا يوجد PDF بعد',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        ),
      ),
    ]);
  }

  double _num(dynamic v) => double.tryParse(v?.toString() ?? '0') ?? 0;
  String _fmtNum(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(0);
}

class _Row {
  final String label;
  final double value;
  const _Row(this.label, this.value);
}

class _Section extends StatelessWidget {
  final String title, totalLabel;
  final Color titleColor, totalColor;
  final List<_Row> rows;
  final double total;
  final String prefix;
  const _Section({required this.title, required this.titleColor, required this.rows, required this.total, required this.totalLabel, required this.totalColor, required this.prefix});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
    child: Column(children: [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(color: titleColor.withOpacity(0.06), borderRadius: const BorderRadius.vertical(top: Radius.circular(12))),
        child: Row(children: [
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: titleColor)),
        ]),
      ),
      ...rows.map((r) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: [
          Expanded(child: Text(r.label, style: const TextStyle(fontSize: 13, color: kText))),
          Text('$prefix${_fmt(r.value)} جنيه', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: totalColor)),
        ]),
      )),
      Container(height: 0.5, margin: const EdgeInsets.symmetric(horizontal: 16), color: kBorder),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(children: [
          Expanded(child: Text(totalLabel, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: kText))),
          Text('$prefix${_fmt(total)} جنيه', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: totalColor)),
        ]),
      ),
    ]),
  );

  String _fmt(double v) => v.toInt().toString();
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
