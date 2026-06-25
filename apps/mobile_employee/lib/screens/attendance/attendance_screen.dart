import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});
  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  Map<String, dynamic>? _today;
  List<dynamic> _week = [];
  bool _loading = true;
  bool _checkingIn = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final api = ApiClient().dio;
      final [todayRes, weekRes] = await Future.wait([
        api.get('/attendance/today'),
        api.get('/attendance/week'),
      ]);
      if (mounted) setState(() {
        _today   = todayRes.data is Map ? todayRes.data as Map<String,dynamic> : null;
        _week    = weekRes.data is List ? weekRes.data : (weekRes.data?['data'] ?? []);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkIn() async {
    setState(() => _checkingIn = true);
    try {
      await ApiClient().dio.post('/attendance/check-in');
      await _load();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('خطأ في تسجيل الحضور')));
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  Future<void> _checkOut() async {
    setState(() => _checkingIn = true);
    try {
      await ApiClient().dio.post('/attendance/check-out');
      await _load();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('خطأ في تسجيل الانصراف')));
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kSurface,
    appBar: AppBar(
      title: const Text('الحضور والانصراف'),
      backgroundColor: Colors.white,
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : RefreshIndicator(
            color: kPrimary,
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _StatusCard(today: _today, onCheckIn: _checkIn, onCheckOut: _checkOut, loading: _checkingIn),
                const SizedBox(height: 16),
                _StatsRow(today: _today),
                const SizedBox(height: 16),
                _WeeklyChart(week: _week),
                const SizedBox(height: 80),
              ],
            ),
          ),
  );
}

// ─── Status Card ──────────────────────────────────────────────────────────────

class _StatusCard extends StatelessWidget {
  final Map<String, dynamic>? today;
  final VoidCallback onCheckIn, onCheckOut;
  final bool loading;
  const _StatusCard({required this.today, required this.onCheckIn, required this.onCheckOut, required this.loading});

  @override
  Widget build(BuildContext context) {
    final checkIn  = today?['checkInTime']  as String?;
    final checkOut = today?['checkOutTime'] as String?;
    final status   = today?['status']       as String? ?? 'absent';
    final statusInfo = _statusLabel(status);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(begin: Alignment.topRight, end: Alignment.bottomLeft, colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: kPrimary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('اليوم', style: TextStyle(color: Colors.white70, fontSize: 14)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
            child: Text(statusInfo.$1, style: TextStyle(color: statusInfo.$2, fontSize: 12, fontWeight: FontWeight.w700)),
          ),
        ]),
        const SizedBox(height: 16),
        Text(
          checkIn != null ? _fmtTime(checkIn) : '--:--',
          style: const TextStyle(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w900, letterSpacing: 2),
        ),
        Text(checkIn != null ? 'وقت الحضور' : 'لم تسجل حضورك بعد', style: const TextStyle(color: Colors.white70, fontSize: 13)),
        const SizedBox(height: 20),
        if (!loading)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: checkIn == null ? onCheckIn : (checkOut == null ? onCheckOut : null),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: kPrimary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: Icon(checkIn == null ? Icons.login_rounded : Icons.logout_rounded),
              label: Text(
                checkIn == null ? 'تسجيل الحضور' : (checkOut == null ? 'تسجيل الانصراف' : 'تم الانصراف'),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
              ),
            ),
          )
        else
          const CircularProgressIndicator(color: Colors.white),
      ]),
    );
  }

  (String, Color) _statusLabel(String s) => switch (s) {
    'present'  => ('حاضر', Colors.greenAccent),
    'late'     => ('متأخر', Colors.yellowAccent),
    'absent'   => ('غائب', Colors.redAccent),
    'leave'    => ('إجازة', Colors.lightBlueAccent),
    _          => ('—', Colors.white70),
  };
  String _fmtTime(String iso) { try { final t = DateTime.parse(iso).toLocal(); return '${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}'; } catch (_) { return iso; } }
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  final Map<String, dynamic>? today;
  const _StatsRow({required this.today});

  @override
  Widget build(BuildContext context) {
    final hoursWorked = today?['hoursWorked']     ?? '—';
    final actualTime  = today?['actualWorkTime']  ?? '—';
    final lateMinutes = today?['lateMinutes']     ?? 0;
    final checkOut    = today?['checkOutTime']    as String?;

    return Row(children: [
      _StatBox(label: 'ساعات العمل', value: '$hoursWorked'),
      const SizedBox(width: 10),
      _StatBox(label: 'الوقت الفعلي', value: '$actualTime'),
      const SizedBox(width: 10),
      _StatBox(label: 'التأخير', value: lateMinutes > 0 ? '$lateMinutes د' : '—', color: lateMinutes > 0 ? kDanger : kSuccess),
      const SizedBox(width: 10),
      _StatBox(label: 'الخروج', value: checkOut != null ? _fmtTime(checkOut) : '—'),
    ]);
  }

  String _fmtTime(String iso) { try { final t = DateTime.parse(iso).toLocal(); return '${t.hour.toString().padLeft(2,'0')}:${t.minute.toString().padLeft(2,'0')}'; } catch (_) { return iso; } }
}

class _StatBox extends StatelessWidget {
  final String label, value;
  final Color? color;
  const _StatBox({required this.label, required this.value, this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color ?? kText)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: kTextSub), textAlign: TextAlign.center),
      ]),
    ),
  );
}

// ─── Weekly Chart ─────────────────────────────────────────────────────────────

class _WeeklyChart extends StatelessWidget {
  final List<dynamic> week;
  const _WeeklyChart({required this.week});

  @override
  Widget build(BuildContext context) {
    final days = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي'];
    final maxHours = 9.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('ساعات العمل الأسبوعية', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText)),
        const SizedBox(height: 20),
        SizedBox(
          height: 100,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(5, (i) {
              final entry = i < week.length ? week[i] : null;
              final hours = (entry?['hoursWorked'] as num?)?.toDouble() ?? 0;
              final ratio = (hours / maxHours).clamp(0.0, 1.0);
              final isToday = i == DateTime.now().weekday - 1;
              return Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                Text(hours > 0 ? '${hours.toStringAsFixed(0)}h' : '', style: const TextStyle(fontSize: 10, color: kTextSub, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                AnimatedContainer(
                  duration: Duration(milliseconds: 400 + i * 60),
                  width: 28,
                  height: (ratio * 80).clamp(4.0, 80.0),
                  decoration: BoxDecoration(
                    color: isToday ? kPrimary : (hours > 0 ? kPrimary.withOpacity(0.4) : kSurface),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
                const SizedBox(height: 6),
                Text(days[i], style: TextStyle(fontSize: 10, color: isToday ? kPrimary : kTextSub, fontWeight: isToday ? FontWeight.w700 : FontWeight.w400)),
              ]);
            }),
          ),
        ),
      ]),
    );
  }
}
