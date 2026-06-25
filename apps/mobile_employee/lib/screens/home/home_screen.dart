import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth_provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../leave/leave_screen.dart';
import '../payslips/payslips_screen.dart';
import '../profile/profile_screen.dart';
import '../communication/communication_screen.dart';
import '../attendance/attendance_screen.dart';
import '../manager/manager_screen.dart';

// ─── Shell ────────────────────────────────────────────────────────────────────

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => HomeShellState();
}

class HomeShellState extends State<HomeShell> {
  int _tab = 0;
  int _pendingCount = 0;
  final _leaveKey = GlobalKey<LeaveScreenState>();

  void goToTab(int i) => setState(() => _tab = i);
  void goToLeave()    => setState(() => _tab = 2);

  @override
  void initState() { super.initState(); _loadPendingCount(); }

  Future<void> _loadPendingCount() async {
    try {
      final res = await ApiClient().dio.get('/leave/requests/pending-my-approval');
      final data = res.data is List ? res.data : (res.data['data'] ?? []);
      if (mounted) setState(() => _pendingCount = (data as List).length);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final isManager = user?.isManager == true;

    final screens = [
      _HomeTab(key: const ValueKey('home')),
      const CommunicationScreen(),
      LeaveScreen(key: _leaveKey),
      if (isManager) const ManagerScreen() else const _CommunityPlaceholder(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _tab, children: screens),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: kBorder, width: 0.8)),
          boxShadow: [BoxShadow(color: Color(0x0A000000), blurRadius: 12, offset: Offset(0, -4))],
        ),
        child: BottomNavigationBar(
          currentIndex: _tab,
          onTap: (i) { setState(() => _tab = i); if (i == 3 && isManager) _loadPendingCount(); },
          elevation: 0,
          backgroundColor: Colors.transparent,
          selectedItemColor: kPrimary,
          unselectedItemColor: kTextSub,
          showSelectedLabels: true,
          showUnselectedLabels: true,
          selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
          unselectedLabelStyle: const TextStyle(fontSize: 10),
          type: BottomNavigationBarType.fixed,
          items: [
            const BottomNavigationBarItem(icon: Icon(Icons.home_outlined, size: 24), activeIcon: Icon(Icons.home_rounded, size: 24), label: 'الرئيسية'),
            const BottomNavigationBarItem(icon: Icon(Icons.chat_bubble_outline_rounded, size: 24), activeIcon: Icon(Icons.chat_bubble_rounded, size: 24), label: 'الرسائل'),
            const BottomNavigationBarItem(icon: Icon(Icons.assignment_outlined, size: 24), activeIcon: Icon(Icons.assignment_rounded, size: 24), label: 'الطلبات'),
            BottomNavigationBarItem(
              icon: _BadgeIcon(icon: isManager ? Icons.supervisor_account_outlined : Icons.people_outline_rounded, count: isManager ? _pendingCount : 0),
              activeIcon: Icon(isManager ? Icons.supervisor_account_rounded : Icons.people_rounded, size: 24),
              label: isManager ? 'الفريق' : 'المجتمع',
            ),
            const BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded, size: 24), activeIcon: Icon(Icons.person_rounded, size: 24), label: 'الملف الشخصي'),
          ],
        ),
      ),
    );
  }
}

class _BadgeIcon extends StatelessWidget {
  final IconData icon;
  final int count;
  const _BadgeIcon({required this.icon, required this.count});

  @override
  Widget build(BuildContext context) => Stack(
    clipBehavior: Clip.none,
    children: [
      Icon(icon, size: 24),
      if (count > 0) Positioned(
        top: -4, left: -4,
        child: Container(
          padding: const EdgeInsets.all(3),
          decoration: const BoxDecoration(color: kDanger, shape: BoxShape.circle),
          child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w800)),
        ),
      ),
    ],
  );
}

class _CommunityPlaceholder extends StatelessWidget {
  const _CommunityPlaceholder();
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: kSurface,
    appBar: AppBar(title: const Text('المجتمع')),
    body: const Center(child: Text('قريباً...', style: TextStyle(color: kTextSub, fontSize: 16))),
  );
}

// ─── Home Tab ────────────────────────────────────────────────────────────────

class _HomeTab extends StatefulWidget {
  const _HomeTab({super.key});
  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  Map<String, dynamic>? _profile;
  List<dynamic> _announcements = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final api  = ApiClient().dio;
      final user = context.read<AuthProvider>().user!;
      final [profRes, leaveRes] = await Future.wait([
        api.get('/employees/${user.id}'),
        api.get('/leave/requests/me', queryParameters: {'limit': 3}),
      ]);
      if (mounted) setState(() {
        _profile       = profRes.data;
        _announcements = leaveRes.data is List ? leaveRes.data : (leaveRes.data['data'] ?? []);
        _loading       = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user!;
    return Scaffold(
      backgroundColor: kSurface,
      body: RefreshIndicator(
        color: kPrimary,
        onRefresh: _load,
        child: CustomScrollView(slivers: [
          _HomeAppBar(user: user),
          SliverToBoxAdapter(child: Column(children: [
            _GreetingCard(user: user, profile: _profile),
            const SizedBox(height: 16),
            _QuickActions(profile: _profile),
            const SizedBox(height: 16),
            _NewsSection(loading: _loading, items: _announcements, user: user),
            const SizedBox(height: 90),
          ])),
        ]),
      ),
    );
  }
}

// ─── App Bar ─────────────────────────────────────────────────────────────────

class _HomeAppBar extends StatelessWidget {
  final AuthUser user;
  const _HomeAppBar({required this.user});

  @override
  Widget build(BuildContext context) => SliverAppBar(
    pinned: true,
    backgroundColor: Colors.white,
    elevation: 0,
    scrolledUnderElevation: 0.8,
    shadowColor: const Color(0x18000000),
    title: Image.asset('assets/images/logo.png', height: 30),
    actions: [
      _AppBarBtn(icon: Icons.search_rounded, onTap: () {}),
      _AppBarBtn(icon: Icons.notifications_outlined, onTap: () {}),
      const SizedBox(width: 4),
    ],
  );
}

class _AppBarBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _AppBarBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => IconButton(
    onPressed: onTap,
    icon: Icon(icon, color: kText, size: 24),
    splashRadius: 20,
  );
}

// ─── Talentstan Logo (mountain shape) ────────────────────────────────────────

class _TalentLogo extends StatelessWidget {
  final double size;
  const _TalentLogo({this.size = 34});
  @override
  Widget build(BuildContext context) => CustomPaint(
    size: Size(size, size),
    painter: _MountainPainter(),
  );
}

class _MountainPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final gradient = const LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [Color(0xFF60A5FA), Color(0xFF1D4ED8)],
    );
    final rect = Rect.fromLTWH(0, 0, w, h);

    // Outer mountain
    final outerPath = Path()
      ..moveTo(w * 0.5, h * 0.05)
      ..lineTo(w * 0.98, h * 0.95)
      ..lineTo(w * 0.02, h * 0.95)
      ..close();
    canvas.drawPath(outerPath, Paint()..shader = gradient.createShader(rect)..style = PaintingStyle.fill);

    // Inner lighter triangle (creates depth)
    final innerPath = Path()
      ..moveTo(w * 0.5, h * 0.3)
      ..lineTo(w * 0.73, h * 0.78)
      ..lineTo(w * 0.27, h * 0.78)
      ..close();
    canvas.drawPath(innerPath, Paint()..color = Colors.white.withOpacity(0.22)..style = PaintingStyle.fill);

    // Snow cap
    final capPath = Path()
      ..moveTo(w * 0.5, h * 0.05)
      ..lineTo(w * 0.6, h * 0.28)
      ..lineTo(w * 0.4, h * 0.28)
      ..close();
    canvas.drawPath(capPath, Paint()..color = Colors.white.withOpacity(0.55)..style = PaintingStyle.fill);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Greeting Card ────────────────────────────────────────────────────────────

class _GreetingCard extends StatelessWidget {
  final AuthUser user;
  final Map<String, dynamic>? profile;
  const _GreetingCard({required this.user, required this.profile});

  @override
  Widget build(BuildContext context) {
    final firstName = user.fullName.split(' ').first;
    final dept      = profile?['department']?['name'] as String?;
    final jobTitle  = profile?['jobTitle']?['title'] as String?;

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: kPrimary.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('مرحبًا $firstName 👋', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          const Text('نتمنى لك يوماً مميزاً', style: TextStyle(color: Colors.white70, fontSize: 14)),
          if (jobTitle != null || dept != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.18), borderRadius: BorderRadius.circular(20)),
              child: Text(
                [if (jobTitle != null) jobTitle, if (dept != null) dept].join(' · '),
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ])),
        const SizedBox(width: 12),
        CircleAvatar(
          radius: 30,
          backgroundColor: Colors.white.withOpacity(0.2),
          child: Text(user.initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22)),
        ),
      ]),
    );
  }
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  final Map<String, dynamic>? profile;
  const _QuickActions({required this.profile});

  @override
  Widget build(BuildContext context) {
    final shell = context.findAncestorStateOfType<HomeShellState>();
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('الخدمات السريعة', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText)),
        const SizedBox(height: 14),
        Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          _QuickBtn(
            icon: Icons.event_available_rounded,
            label: 'طلب إجازة',
            color: kSuccess,
            bgColor: kSuccessLight,
            onTap: () => shell?.goToLeave(),
          ),
          _QuickBtn(
            icon: Icons.fingerprint_rounded,
            label: 'الحضور',
            color: kPrimary,
            bgColor: kPrimaryLight,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen())),
          ),
          _QuickBtn(
            icon: Icons.account_balance_wallet_rounded,
            label: 'كشف الراتب',
            color: kWarning,
            bgColor: kWarningLight,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PayslipsScreen())),
          ),
          _QuickBtn(
            icon: Icons.folder_copy_rounded,
            label: 'المستندات',
            color: kPurple,
            bgColor: kPurpleLight,
            onTap: () {},
          ),
        ]),
      ]),
    );
  }
}

class _QuickBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color, bgColor;
  final VoidCallback onTap;
  const _QuickBtn({required this.icon, required this.label, required this.color, required this.bgColor, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Column(children: [
      Container(
        width: 56, height: 56,
        decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(14)),
        child: Icon(icon, color: color, size: 26),
      ),
      const SizedBox(height: 6),
      Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kText), textAlign: TextAlign.center),
    ]),
  );
}

// ─── News Section ─────────────────────────────────────────────────────────────

class _NewsSection extends StatelessWidget {
  final bool loading;
  final List<dynamic> items;
  final AuthUser user;
  const _NewsSection({required this.loading, required this.items, required this.user});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('آخر الأخبار', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText)),
          TextButton(onPressed: () {}, child: const Text('عرض الكل', style: TextStyle(color: kPrimary, fontSize: 13, fontWeight: FontWeight.w600))),
        ]),
        const SizedBox(height: 8),
        if (loading) ...[
          _NewsSkeleton(),
          const SizedBox(height: 10),
          _NewsSkeleton(),
        ] else if (items.isEmpty)
          _WelcomeCard(user: user)
        else
          ...items.map((r) => Padding(padding: const EdgeInsets.only(bottom: 10), child: _NewsCard(r, user: user))),
      ]),
    );
  }
}

class _NewsCard extends StatelessWidget {
  final Map<String, dynamic> r;
  final AuthUser user;
  const _NewsCard(this.r, {required this.user});

  @override
  Widget build(BuildContext context) {
    final status   = r['status'] ?? 'pending';
    final typeName = r['leaveType']?['name'] ?? 'إجازة';
    final days     = r['totalDays'] ?? 1;
    final start    = _fmt(r['startDate']);
    final statusInfo = _statusInfo(status);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: kBorder, width: 0.5)),
      child: Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(color: statusInfo.$3, borderRadius: BorderRadius.circular(10)),
          child: Icon(statusInfo.$2, color: statusInfo.$1, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('طلب $typeName', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText)),
          Text('$days ${days == 1 ? "يوم" : "أيام"} · $start', style: const TextStyle(fontSize: 12, color: kTextSub)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: statusInfo.$3, borderRadius: BorderRadius.circular(20)),
          child: Text(statusInfo.$4, style: TextStyle(color: statusInfo.$1, fontSize: 11, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }

  (Color, IconData, Color, String) _statusInfo(String s) => switch (s) {
    'approved' => (kSuccess, Icons.check_circle_rounded, kSuccessLight, 'موافق'),
    'rejected' => (kDanger, Icons.cancel_rounded, kDangerLight, 'مرفوض'),
    _ => (kWarning, Icons.pending_rounded, kWarningLight, 'معلق'),
  };
  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return ''; } }
}

class _WelcomeCard extends StatelessWidget {
  final AuthUser user;
  const _WelcomeCard({required this.user});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: kBorder, width: 0.5)),
    child: Row(children: [
      Container(width: 42, height: 42, decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.waving_hand_rounded, color: kPrimary, size: 22)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('أهلاً ${user.fullName.split(' ').first}!', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText)),
        const Text('استخدم الخدمات السريعة للبدء', style: TextStyle(fontSize: 12, color: kTextSub)),
      ])),
    ]),
  );
}

class _NewsSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    height: 68,
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
    padding: const EdgeInsets.all(14),
    child: Row(children: [
      Container(width: 42, height: 42, decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(10))),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Container(height: 12, width: 120, decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(4))),
        const SizedBox(height: 6),
        Container(height: 10, width: 80, decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(4))),
      ])),
    ]),
  );
}
