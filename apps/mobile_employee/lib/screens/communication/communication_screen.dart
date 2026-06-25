import 'package:flutter/material.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';

class CommunicationScreen extends StatefulWidget {
  const CommunicationScreen({super.key});
  @override
  State<CommunicationScreen> createState() => _CommunicationScreenState();
}

class _CommunicationScreenState extends State<CommunicationScreen> {
  List<dynamic> _posts = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/communication/posts');
      if (mounted) setState(() {
        _posts = res.data is List ? res.data : (res.data['data'] ?? []);
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
      elevation: 0,
      scrolledUnderElevation: 1,
      shadowColor: const Color(0x22000000),
      title: const Text('الأخبار والإعلانات', style: TextStyle(fontWeight: FontWeight.w800, color: kText, fontSize: 18)),
      actions: [
        Container(
          margin: const EdgeInsets.only(left: 12),
          child: CircleAvatar(
            backgroundColor: kSurface,
            child: IconButton(icon: const Icon(Icons.search, color: kText, size: 22), onPressed: () {}),
          ),
        ),
      ],
    ),
    body: _loading
        ? _buildSkeletons()
        : _posts.isEmpty
            ? const _EmptyFeed()
            : RefreshIndicator(
                color: kPrimary,
                onRefresh: _load,
                child: ListView.builder(
                  padding: EdgeInsets.zero,
                  itemCount: _posts.length,
                  itemBuilder: (_, i) => _FbPostCard(_posts[i]),
                ),
              ),
  );

  Widget _buildSkeletons() => ListView(children: List.generate(3, (_) => const _PostSkeleton()));
}

class _FbPostCard extends StatefulWidget {
  final Map<String, dynamic> post;
  const _FbPostCard(this.post);
  @override
  State<_FbPostCard> createState() => _FbPostCardState();
}

class _FbPostCardState extends State<_FbPostCard> {
  late int _likes;
  bool _liked = false;
  bool _expanded = false;

  @override
  void initState() {
    super.initState();
    _likes = (widget.post['reactionsCount'] ?? 0) as int;
  }

  static const _typeConfig = {
    'announcement': ('قرار إداري', Color(0xFFD97706), Color(0xFFFFFBEB)),
    'normal': ('إشعار عام', kPrimary, kPrimaryLight),
  };

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final type = post['type'] ?? 'normal';
    final (typeLabel, typeColor, typeBg) = _typeConfig[type] ?? ('إشعار', kPrimary, kPrimaryLight);
    final isPinned = post['isPinned'] == true;
    final content = post['content'] ?? '';
    final isLong = content.length > 120;
    final comments = post['commentsCount'] ?? 0;
    final date = _fmt(post['createdAt']);

    return Container(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
          child: Row(children: [
            _TypeAvatar(label: typeLabel[0], color: typeColor),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(post['title'] ?? 'إعلان', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: kText)),
                if (isPinned) ...[
                  const SizedBox(width: 6),
                  const Icon(Icons.push_pin, size: 14, color: kWarning),
                ],
              ]),
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: typeBg, borderRadius: BorderRadius.circular(4)),
                  child: Text(typeLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: typeColor)),
                ),
                const SizedBox(width: 6),
                Text('· $date', style: const TextStyle(fontSize: 11, color: kTextSub)),
                if (isPinned) ...[
                  const SizedBox(width: 4),
                  const Text('· 📌 مثبت', style: TextStyle(fontSize: 11, color: kTextSub)),
                ],
              ]),
            ])),
            const Icon(Icons.more_horiz, color: kTextSub),
          ]),
        ),

        // Content
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              _expanded || !isLong ? content : '${content.substring(0, 120)}...',
              style: const TextStyle(fontSize: 15, color: kText, height: 1.55),
            ),
            if (isLong) GestureDetector(
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  _expanded ? 'عرض أقل' : 'عرض المزيد',
                  style: const TextStyle(color: kTextSub, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ),
          ]),
        ),

        // Reactions summary
        if (_likes > 0 || comments > 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: Row(children: [
              if (_likes > 0) ...[
                Container(
                  width: 20, height: 20,
                  decoration: const BoxDecoration(color: kPrimary, shape: BoxShape.circle),
                  child: const Center(child: Text('👍', style: TextStyle(fontSize: 11))),
                ),
                const SizedBox(width: 4),
                Text('$_likes', style: const TextStyle(fontSize: 13, color: kTextSub)),
              ],
              const Spacer(),
              if (comments > 0)
                Text('$comments تعليق', style: const TextStyle(fontSize: 13, color: kTextSub)),
            ]),
          ),

        const Divider(height: 0, color: kBorder, thickness: 0.5),

        // Action buttons
        Row(children: [
          _ActionBtn(
            icon: _liked ? Icons.thumb_up : Icons.thumb_up_outlined,
            label: 'إعجاب',
            active: _liked,
            onTap: () => setState(() {
              _liked = !_liked;
              _likes += _liked ? 1 : -1;
            }),
          ),
          _ActionBtn(icon: Icons.comment_outlined, label: 'تعليق', onTap: () {}),
          _ActionBtn(icon: Icons.share_outlined, label: 'مشاركة', onTap: () {}),
        ]),

        const Divider(height: 0, color: kBorder, thickness: 0.5),
      ]),
    );
  }

  String _fmt(dynamic d) { if (d == null) return ''; try { return d.toString().substring(0, 10); } catch (_) { return ''; } }
}

class _TypeAvatar extends StatelessWidget {
  final String label;
  final Color color;
  const _TypeAvatar({required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Container(
    width: 44, height: 44,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: color.withValues(alpha: 0.12),
      border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
    ),
    child: Center(
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 18)),
    ),
  );
}

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

class _EmptyFeed extends StatelessWidget {
  const _EmptyFeed();
  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 80, height: 80,
        decoration: const BoxDecoration(color: kSurface, shape: BoxShape.circle),
        child: const Icon(Icons.campaign_outlined, size: 40, color: kTextSub),
      ),
      const SizedBox(height: 16),
      const Text('لا توجد إعلانات حالياً', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText)),
      const SizedBox(height: 6),
      const Text('ستظهر هنا الإعلانات والأخبار الجديدة', style: TextStyle(fontSize: 14, color: kTextSub)),
    ]),
  );
}

class _PostSkeleton extends StatelessWidget {
  const _PostSkeleton();
  @override
  Widget build(BuildContext context) => Container(
    color: Colors.white,
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const _Bone(w: 44, h: 44, circle: true),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const _Bone(w: 140, h: 13),
          const SizedBox(height: 6),
          const _Bone(w: 90, h: 10),
        ]),
      ]),
      const SizedBox(height: 14),
      const _Bone(w: double.infinity, h: 13),
      const SizedBox(height: 8),
      const _Bone(w: 220, h: 13),
      const SizedBox(height: 8),
      const _Bone(w: 160, h: 13),
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
