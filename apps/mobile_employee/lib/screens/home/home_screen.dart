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
import '../appraisal/appraisal_screen.dart';
import '../chat/chat_screen.dart';
import '../surveys/surveys_screen.dart';

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
      if (isManager) const ManagerScreen() else const ChatScreen(),
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
              icon: _BadgeIcon(icon: isManager ? Icons.supervisor_account_outlined : Icons.chat_bubble_outline_rounded, count: isManager ? _pendingCount : 0),
              activeIcon: Icon(isManager ? Icons.supervisor_account_rounded : Icons.chat_bubble_rounded, size: 24),
              label: isManager ? 'الفريق' : 'الشات',
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
  List<dynamic> _appraisals    = [];
  int _pendingRequests = 0;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final api  = ApiClient().dio;
      final user = context.read<AuthProvider>().user!;
      final results = await Future.wait([
        api.get('/employees/${user.id}'),
        api.get('/leave/requests/me', queryParameters: {'limit': 10}),
        api.get('/appraisal/me'),
        api.get('/communication/feed', queryParameters: {'limit': 5}),
      ]);
      final leaveData     = results[1].data is List ? results[1].data : (results[1].data['data'] ?? []);
      final appraisalData = results[2].data is List ? results[2].data : (results[2].data['data'] ?? []);
      final feedData      = results[3].data is List ? results[3].data : (results[3].data['data'] ?? []);
      // عداد الطلبات المعلّقة (إجازات + طلبات أخرى)
      final pendingLeave  = (leaveData as List).where((r) => r['status'] == 'submitted' || r['status'] == 'in_review').length;
      if (mounted) setState(() {
        _profile         = results[0].data;
        _announcements   = feedData;
        _appraisals      = appraisalData;
        _pendingRequests = pendingLeave;
        _loading         = false;
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
            _DashboardWidgets(
              loading: _loading,
              announcements: _announcements,
              appraisals: _appraisals,
              pendingRequests: _pendingRequests,
            ),
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

// ─── Dashboard Widgets ────────────────────────────────────────────────────────

class _DashboardWidgets extends StatelessWidget {
  final bool loading;
  final List<dynamic> announcements;
  final List<dynamic> appraisals;
  final int pendingRequests;
  const _DashboardWidgets({required this.loading, required this.announcements, required this.appraisals, required this.pendingRequests});

  @override
  Widget build(BuildContext context) {
    if (loading) return const SizedBox(
      height: 100,
      child: Center(child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2)),
    );

    final approved = announcements.where((r) => r['postType'] != null).length; // عدد الأخبار المقروءة
    final lastAppraisal = appraisals.isNotEmpty ? appraisals.first : null;
    final lastScore = lastAppraisal?['selfScore'];
    final lastCycleName = lastAppraisal?['cycle']?['name'] ?? '—';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(children: [
        Expanded(child: _Widget(
          icon: Icons.assignment_outlined,
          color: pendingRequests > 0 ? kWarning : kSuccess,
          bg: pendingRequests > 0 ? kWarningLight : kSuccessLight,
          label: 'طلبات معلّقة',
          value: '$pendingRequests',
          sub: pendingRequests > 0 ? 'تنتظر المراجعة' : 'لا يوجد معلّق',
        )),
        const SizedBox(width: 10),
        Expanded(child: _Widget(
          icon: Icons.check_circle_outline,
          color: kPrimary,
          bg: kPrimaryLight,
          label: 'طلبات موافَق عليها',
          value: '$approved',
          sub: 'هذا الشهر',
        )),
        const SizedBox(width: 10),
        Expanded(child: _Widget(
          icon: Icons.star_outline_rounded,
          color: kPurple,
          bg: kPurpleLight,
          label: 'آخر تقييم',
          value: lastScore != null ? '${double.tryParse(lastScore.toString())?.round()}%' : '—',
          sub: lastScore != null ? lastCycleName : 'لم يُقيَّم بعد',
        )),
      ]),
    );
  }
}

class _Widget extends StatelessWidget {
  final IconData icon;
  final Color color, bg;
  final String label, value, sub;
  const _Widget({required this.icon, required this.color, required this.bg, required this.label, required this.value, required this.sub});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: kBorder, width: 0.5)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width: 32, height: 32, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: color, size: 17)),
      const SizedBox(height: 8),
      Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: color)),
      Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: kText), maxLines: 1, overflow: TextOverflow.ellipsis),
      Text(sub, style: const TextStyle(fontSize: 9, color: kTextSub), maxLines: 1, overflow: TextOverflow.ellipsis),
    ]),
  );
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
            icon: Icons.star_rounded,
            label: 'التقييم',
            color: kPurple,
            bgColor: kPurpleLight,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AppraisalScreen())),
          ),
        ]),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
          _QuickBtn(
            icon: Icons.poll_outlined,
            label: 'الاستطلاعات',
            color: const Color(0xFF0EA5E9),
            bgColor: const Color(0xFFE0F2FE),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SurveysScreen())),
          ),
          _QuickBtn(
            icon: Icons.access_time_rounded,
            label: 'الحضور',
            color: kSuccess,
            bgColor: kSuccessLight,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen())),
          ),
          const SizedBox(width: 60),
          const SizedBox(width: 60),
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

// Feed Post Card (shown on Home) — with Like + Comments
class _NewsCard extends StatefulWidget {
  final Map<String, dynamic> r;
  final AuthUser user;
  const _NewsCard(this.r, {required this.user});
  @override
  State<_NewsCard> createState() => _NewsCardState();
}

class _NewsCardState extends State<_NewsCard> {
  late bool _liked;
  late int  _likesCount;
  late int  _commentsCount;
  bool _liking = false;

  @override
  void initState() {
    super.initState();
    final reactions = widget.r['reactions'] as List? ?? [];
    _liked = reactions.isNotEmpty;
    _likesCount    = (widget.r['_count']?['reactions'] as num?)?.toInt() ?? 0;
    _commentsCount = (widget.r['_count']?['comments'] as num?)?.toInt() ?? 0;
  }

  Future<void> _toggleLike() async {
    if (_liking) return;
    setState(() { _liking = true; });
    try {
      final was = _liked;
      setState(() { _liked = !was; _likesCount += was ? -1 : 1; });
      await ApiClient().dio.post('/communication/posts/${widget.r['id']}/react', data: {'reactionType': 'like'});
    } catch (_) {
      setState(() { _liked = !_liked; _likesCount += _liked ? 1 : -1; });
    } finally {
      if (mounted) setState(() => _liking = false);
    }
  }

  void _showComments() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CommentsSheet(
        postId: widget.r['id'],
        commentsEnabled: widget.r['commentsEnabled'] != false,
        onCommentAdded: () => setState(() => _commentsCount++),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final r        = widget.r;
    final content  = r['content'] as String? ?? '';
    final author   = r['author']?['fullName'] ?? 'إدارة';
    final postType = r['postType'] ?? 'normal';
    final isPinned = r['isPinned'] == true;
    final date     = _fmt(r['createdAt']);

    final isAnnouncement = postType == 'announcement';
    final color = isAnnouncement ? kWarning : kPrimary;
    final bg    = isAnnouncement ? kWarningLight : kPrimaryLight;
    final icon  = isAnnouncement ? Icons.campaign_rounded : Icons.info_outline_rounded;
    final label = isAnnouncement ? 'قرار إداري' : 'إشعار عام';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border(right: BorderSide(color: color, width: 3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 36, height: 36, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, color: color, size: 18)),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(author, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
              if (isPinned) ...[const SizedBox(width: 4), const Icon(Icons.push_pin, size: 12, color: kWarning)],
            ]),
            Text('$label · $date', style: const TextStyle(fontSize: 11, color: kTextSub)),
          ])),
        ]),
        if (content.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(content, style: const TextStyle(fontSize: 13, color: kText, height: 1.4), maxLines: 3, overflow: TextOverflow.ellipsis),
        ],
        const SizedBox(height: 10),
        const Divider(height: 1, color: kBorder),
        const SizedBox(height: 8),
        Row(children: [
          GestureDetector(
            onTap: _toggleLike,
            child: Row(children: [
              Icon(_liked ? Icons.thumb_up_rounded : Icons.thumb_up_outlined,
                size: 18, color: _liked ? kPrimary : kTextSub),
              const SizedBox(width: 4),
              Text('$_likesCount', style: TextStyle(fontSize: 12, color: _liked ? kPrimary : kTextSub, fontWeight: FontWeight.w600)),
            ]),
          ),
          const SizedBox(width: 20),
          GestureDetector(
            onTap: _showComments,
            child: Row(children: [
              const Icon(Icons.chat_bubble_outline_rounded, size: 17, color: kTextSub),
              const SizedBox(width: 4),
              Text('$_commentsCount', style: const TextStyle(fontSize: 12, color: kTextSub, fontWeight: FontWeight.w600)),
            ]),
          ),
        ]),
      ]),
    );
  }

  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return ''; } }
}

// Comments bottom sheet
class _CommentsSheet extends StatefulWidget {
  final String postId;
  final bool commentsEnabled;
  final VoidCallback onCommentAdded;
  const _CommentsSheet({required this.postId, required this.commentsEnabled, required this.onCommentAdded});
  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  List<dynamic> _comments = [];
  bool _loading = true;
  final _ctrl = TextEditingController();
  bool _sending = false;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/communication/posts/${widget.postId}/comments');
      final data = res.data is List ? res.data : (res.data['data'] ?? []);
      if (mounted) setState(() { _comments = data; _loading = false; });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      final res = await ApiClient().dio.post('/communication/posts/${widget.postId}/comments', data: {'comment': text});
      _ctrl.clear();
      setState(() => _comments.add(res.data));
      widget.onCommentAdded();
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(0, 0, 0, MediaQuery.of(context).viewInsets.bottom),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(height: 4, width: 40, margin: const EdgeInsets.symmetric(vertical: 12), decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2))),
      const Text('التعليقات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText)),
      const SizedBox(height: 8),
      if (_loading)
        const Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: kPrimary, strokeWidth: 2))
      else if (_comments.isEmpty)
        const Padding(padding: EdgeInsets.all(24), child: Text('لا توجد تعليقات بعد', style: TextStyle(color: kTextSub)))
      else
        SizedBox(
          height: 240,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _comments.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final c = _comments[i];
              final name = c['employee']?['fullName'] ?? '';
              final text = c['comment'] ?? '';
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  CircleAvatar(radius: 16, backgroundColor: kPrimaryLight, child: Text(name.isNotEmpty ? name[0] : '?', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800, fontSize: 12))),
                  const SizedBox(width: 8),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText)),
                    Text(text, style: const TextStyle(fontSize: 13, color: kText, height: 1.3)),
                  ])),
                ]),
              );
            },
          ),
        ),
      if (widget.commentsEnabled) ...[
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Row(children: [
            Expanded(child: TextField(
              controller: _ctrl,
              decoration: const InputDecoration(hintText: 'اكتب تعليقاً…', border: OutlineInputBorder(), isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
            )),
            const SizedBox(width: 8),
            _sending
              ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: kPrimary))
              : IconButton(onPressed: _send, icon: const Icon(Icons.send_rounded, color: kPrimary)),
          ]),
        ),
      ] else
        const Padding(padding: EdgeInsets.all(12), child: Text('التعليقات معطّلة على هذا المنشور', style: TextStyle(color: kTextSub, fontSize: 12))),
    ]),
  );
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
