import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class CommunicationScreen extends StatefulWidget {
  const CommunicationScreen({super.key});
  @override
  State<CommunicationScreen> createState() => _CommunicationScreenState();
}

class _CommunicationScreenState extends State<CommunicationScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  List<dynamic> _posts = [];
  List<dynamic> _birthdays = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = ApiClient().dio;
      final [feedRes, bdRes] = await Future.wait([
        api.get('/communication/feed'),
        api.get('/employees/birthdays/upcoming'),
      ]);
      if (mounted) setState(() {
        _posts     = feedRes.data is List ? feedRes.data : (feedRes.data['data'] ?? []);
        _birthdays = bdRes.data is List ? bdRes.data : (bdRes.data['data'] ?? []);
        _loading   = false;
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
      title: const Text('التواصل', style: TextStyle(fontWeight: FontWeight.w800, color: kText, fontSize: 18)),
      bottom: TabBar(
        controller: _tabs,
        tabs: [
          Tab(text: 'الأخبار (${_posts.length})'),
          Tab(text: 'أعياد الميلاد 🎂'),
        ],
        indicatorColor: kPrimary,
        dividerColor: kBorder,
        labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
      ),
    ),
    body: _loading
        ? _buildSkeletons()
        : TabBarView(
            controller: _tabs,
            children: [
              _FeedTab(posts: _posts, onRefresh: _load),
              _BirthdaysTab(birthdays: _birthdays, onRefresh: _load),
            ],
          ),
  );

  Widget _buildSkeletons() => ListView(children: List.generate(3, (_) => const _PostSkeleton()));

  void _showNewPost() {
    final contentCtrl = TextEditingController();
    String postType = 'normal';

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
              const Text('منشور جديد', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
            ]),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: postType,
              decoration: const InputDecoration(labelText: 'نوع المنشور', prefixIcon: Icon(Icons.category_outlined)),
              items: const [
                DropdownMenuItem(value: 'normal',       child: Text('إشعار عام')),
                DropdownMenuItem(value: 'announcement', child: Text('قرار إداري')),
              ],
              onChanged: (v) => setS(() => postType = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: contentCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'محتوى المنشور',
                alignLabelWithHint: true,
                prefixIcon: Icon(Icons.notes_outlined),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                if (contentCtrl.text.trim().isEmpty) return;
                try {
                  await ApiClient().dio.post('/communication/posts', data: {
                    'content': contentCtrl.text.trim(),
                    'postType': postType,
                    'targetScope': 'company',
                  });
                  if (ctx.mounted) { Navigator.pop(ctx); _load(); _tabs.animateTo(0); }
                } on DioException catch (_) {}
              },
              child: const Text('نشر'),
            ),
          ]),
        ),
      ),
    );
  }
}

// ─── Feed Tab ─────────────────────────────────────────────────────────────────

class _FeedTab extends StatelessWidget {
  final List<dynamic> posts;
  final Future<void> Function() onRefresh;
  const _FeedTab({required this.posts, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (posts.isEmpty) return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.campaign_outlined, size: 64, color: kBorder),
        SizedBox(height: 12),
        Text('لا توجد إعلانات حالياً', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText)),
        SizedBox(height: 6),
        Text('ستظهر هنا إعلانات الشركة', style: TextStyle(fontSize: 13, color: kTextSub)),
      ]),
    );

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: EdgeInsets.zero,
        itemCount: posts.length,
        itemBuilder: (_, i) => _PostCard(posts[i]),
      ),
    );
  }
}

class _PostCard extends StatefulWidget {
  final Map<String, dynamic> post;
  const _PostCard(this.post);
  @override
  State<_PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<_PostCard> {
  late int _likes;
  bool _liked = false;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _likes = (widget.post['_count']?['reactions'] ?? widget.post['reactionsCount'] ?? 0) as int;
  }

  static const _typeConfig = {
    'announcement': ('قرار إداري', Color(0xFFD97706), Color(0xFFFFFBEB)),
    'birthday':     ('عيد ميلاد',  Color(0xFFEC4899), Color(0xFFFDF2F8)),
    'normal':       ('إشعار عام',  kPrimary,           kPrimaryLight),
  };

  @override
  Widget build(BuildContext context) {
    final post      = widget.post;
    final type      = post['postType'] ?? post['type'] ?? 'normal';
    final isPinned  = post['isPinned'] == true;
    final content   = post['content'] ?? '';
    final isLong    = content.length > 150;
    final comments  = post['_count']?['comments'] ?? post['commentsCount'] ?? 0;
    final date      = _fmt(post['createdAt']);
    final author    = post['author']?['fullName'] ?? 'إدارة';
    final (typeLabel, typeColor, typeBg) = _typeConfig[type] ?? ('إشعار', kPrimary, kPrimaryLight);

    return Container(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (isPinned)
          Container(
            width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            color: kWarningLight,
            child: const Row(children: [
              Icon(Icons.push_pin, size: 12, color: kWarning),
              SizedBox(width: 4),
              Text('مثبت', style: TextStyle(fontSize: 11, color: kWarning, fontWeight: FontWeight.w700)),
            ]),
          ),

        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Row(children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: typeBg,
              child: Text(author.isNotEmpty ? author[0] : 'إ',
                style: TextStyle(color: typeColor, fontWeight: FontWeight.w800, fontSize: 16)),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(author, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: kText)),
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: typeBg, borderRadius: BorderRadius.circular(4)),
                  child: Text(typeLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: typeColor)),
                ),
                const SizedBox(width: 6),
                Text('· $date', style: const TextStyle(fontSize: 11, color: kTextSub)),
              ]),
            ])),
          ]),
        ),

        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              _expanded || !isLong ? content : '${content.substring(0, 150)}...',
              style: const TextStyle(fontSize: 15, color: kText, height: 1.55),
            ),
            if (isLong) GestureDetector(
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(_expanded ? 'عرض أقل' : 'عرض المزيد',
                  style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            ),
          ]),
        ),

        if (_likes > 0 || comments > 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: Row(children: [
              if (_likes > 0) ...[
                Container(width: 20, height: 20, decoration: const BoxDecoration(color: kPrimary, shape: BoxShape.circle),
                  child: const Center(child: Text('👍', style: TextStyle(fontSize: 11)))),
                const SizedBox(width: 4),
                Text('$_likes', style: const TextStyle(fontSize: 13, color: kTextSub)),
              ],
              const Spacer(),
              if (comments > 0) Text('$comments تعليق', style: const TextStyle(fontSize: 13, color: kTextSub)),
            ]),
          ),

        const Divider(height: 0, color: kBorder),
        Row(children: [
          _ActionBtn(icon: _liked ? Icons.thumb_up : Icons.thumb_up_outlined, label: 'إعجاب', active: _liked,
            onTap: () async {
              setState(() { _liked = !_liked; _likes += _liked ? 1 : -1; });
              try { await ApiClient().dio.post('/communication/posts/${post['id']}/react', data: {'type': 'like'}); }
              catch (_) { setState(() { _liked = !_liked; _likes += _liked ? 1 : -1; }); }
            }),
          _ActionBtn(icon: Icons.comment_outlined, label: 'تعليق ($comments)', onTap: () => _showComments(context, post)),
        ]),
        const Divider(height: 0, color: kBorder),
      ]),
    );
  }

  String _fmt(dynamic d) { try { return (d as String).substring(0, 10); } catch (_) { return ''; } }

  void _showComments(BuildContext context, Map<String, dynamic> post) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CommentsSheet(postId: post['id'], postTitle: post['author']?['fullName'] ?? 'إعلان'),
    );
  }
}

// ─── Comments Sheet ───────────────────────────────────────────────────────────

class _CommentsSheet extends StatefulWidget {
  final String postId;
  final String postTitle;
  const _CommentsSheet({required this.postId, required this.postTitle});
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
      if (mounted) setState(() {
        _comments = res.data is List ? res.data : (res.data['data'] ?? []);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    if (_ctrl.text.trim().isEmpty) return;
    setState(() => _sending = true);
    try {
      await ApiClient().dio.post('/communication/posts/${widget.postId}/comments', data: {'content': _ctrl.text.trim()});
      _ctrl.clear();
      await _load();
    } catch (_) {} finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: MediaQuery.of(context).size.height * 0.75,
    child: Column(children: [
      Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kBorder))),
        child: Row(children: [
          Expanded(child: Text('تعليقات — ${widget.postTitle}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText))),
          IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
        ]),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kPrimary))
            : _comments.isEmpty
                ? const Center(child: Text('لا توجد تعليقات — كن أول من يعلّق!', style: TextStyle(color: kTextSub)))
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _comments.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final c = _comments[i];
                      final name = c['author']?['fullName'] ?? 'موظف';
                      return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        CircleAvatar(radius: 16, backgroundColor: kPrimaryLight,
                          child: Text(name.isNotEmpty ? name[0] : '?', style: const TextStyle(color: kPrimary, fontSize: 13, fontWeight: FontWeight.w800))),
                        const SizedBox(width: 10),
                        Expanded(child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(12)),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kText)),
                            const SizedBox(height: 2),
                            Text(c['content'] ?? '', style: const TextStyle(fontSize: 13, color: kText, height: 1.4)),
                          ]),
                        )),
                      ]);
                    },
                  ),
      ),
      Container(
        padding: EdgeInsets.fromLTRB(12, 8, 12, MediaQuery.of(context).viewInsets.bottom + 12),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: kBorder))),
        child: Row(children: [
          Expanded(child: TextField(
            controller: _ctrl,
            decoration: const InputDecoration(hintText: 'اكتب تعليقاً...', contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
            onSubmitted: (_) => _send(),
          )),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _sending ? null : _send,
            icon: _sending
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: kPrimary))
                : const Icon(Icons.send_rounded, color: kPrimary),
          ),
        ]),
      ),
    ]),
  );
}

// ─── Birthdays Tab ────────────────────────────────────────────────────────────

class _BirthdaysTab extends StatelessWidget {
  final List<dynamic> birthdays;
  final Future<void> Function() onRefresh;
  const _BirthdaysTab({required this.birthdays, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (birthdays.isEmpty) return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('🎂', style: TextStyle(fontSize: 60)),
        SizedBox(height: 12),
        Text('لا توجد أعياد ميلاد قريبة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText)),
        SizedBox(height: 6),
        Text('أعياد الميلاد في الأسبوع القادم ستظهر هنا', style: TextStyle(fontSize: 13, color: kTextSub)),
      ]),
    );

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: birthdays.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _BirthdayCard(birthdays[i]),
      ),
    );
  }
}

class _BirthdayCard extends StatelessWidget {
  final Map<String, dynamic> emp;
  const _BirthdayCard(this.emp);

  @override
  Widget build(BuildContext context) {
    final name     = emp['fullName'] ?? '';
    final dept     = emp['department']?['name'] ?? '';
    final jobTitle = emp['jobTitle']?['name'] ?? '';
    final isToday  = emp['isToday'] == true;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isToday ? const Color(0xFFEC4899) : kBorder, width: isToday ? 2 : 0.5),
      ),
      child: Row(children: [
        Container(
          width: 52, height: 52,
          decoration: BoxDecoration(
            color: isToday ? const Color(0xFFFDF2F8) : kSurface,
            shape: BoxShape.circle,
            border: isToday ? Border.all(color: const Color(0xFFEC4899), width: 2) : null,
          ),
          child: Center(
            child: Text(
              name.isNotEmpty ? name[0] : '?',
              style: TextStyle(
                fontSize: 22, fontWeight: FontWeight.w800,
                color: isToday ? const Color(0xFFEC4899) : kTextSub,
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText))),
            if (isToday) Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFFFDF2F8), borderRadius: BorderRadius.circular(20)),
              child: const Text('اليوم 🎂', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFFEC4899))),
            ),
          ]),
          if (jobTitle.isNotEmpty)
            Text(jobTitle, style: const TextStyle(fontSize: 12, color: kTextSub)),
          if (dept.isNotEmpty)
            Text(dept, style: const TextStyle(fontSize: 11, color: kTextSub)),
        ])),
      ]),
    );
  }
}

// ─── Shared Widgets ───────────────────────────────────────────────────────────

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.label, this.active = false, required this.onTap});
  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(icon, size: 20, color: active ? kPrimary : kTextSub),
          const SizedBox(width: 6),
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: active ? kPrimary : kTextSub)),
        ]),
      ),
    ),
  );
}

class _PostSkeleton extends StatelessWidget {
  const _PostSkeleton();
  @override
  Widget build(BuildContext context) => Container(
    color: Colors.white, margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [const _Bone(w: 40, h: 40, circle: true), const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const _Bone(w: 140, h: 13), const SizedBox(height: 6), const _Bone(w: 90, h: 10)])]),
      const SizedBox(height: 14), const _Bone(w: double.infinity, h: 13), const SizedBox(height: 8), const _Bone(w: 220, h: 13),
    ]),
  );
}

class _Bone extends StatelessWidget {
  final double w, h;
  final bool circle;
  const _Bone({required this.w, required this.h, this.circle = false});
  @override
  Widget build(BuildContext context) => Container(
    width: w == double.infinity ? null : w, height: h,
    decoration: BoxDecoration(color: kSurface, borderRadius: circle ? null : BorderRadius.circular(4), shape: circle ? BoxShape.circle : BoxShape.rectangle),
  );
}
