import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api_client.dart';
import '../../core/auth_provider.dart';
import '../../core/theme.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  List<dynamic> _groups = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/communication/groups');
      if (mounted) setState(() {
        _groups = res.data is List ? res.data : (res.data['data'] ?? []);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('المحادثات', style: TextStyle(fontWeight: FontWeight.w800)),
      actions: [
        IconButton(
          icon: const Icon(Icons.group_add_outlined),
          onPressed: _showNewGroup,
          tooltip: 'مجموعة جديدة',
        ),
      ],
      bottom: TabBar(
        controller: _tabs,
        tabs: const [Tab(text: 'مجموعاتي'), Tab(text: 'رسائل مباشرة')],
        indicatorColor: kPrimary,
      ),
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: kPrimary))
        : TabBarView(
            controller: _tabs,
            children: [
              _GroupsTab(groups: _groups, onRefresh: _load),
              _DmsTab(),
            ],
          ),
  );

  void _showNewGroup() {
    final nameCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('مجموعة جديدة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'اسم المجموعة', prefixIcon: Icon(Icons.group_outlined))),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              try {
                await ApiClient().dio.post('/communication/groups', data: {'name': nameCtrl.text.trim()});
                if (context.mounted) { Navigator.pop(context); _load(); }
              } catch (_) {}
            },
            child: const Text('إنشاء المجموعة'),
          ),
        ]),
      ),
    );
  }
}

// ─── Groups Tab ───────────────────────────────────────────────────────────────

class _GroupsTab extends StatelessWidget {
  final List<dynamic> groups;
  final Future<void> Function() onRefresh;
  const _GroupsTab({required this.groups, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    if (groups.isEmpty) return const Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.group_outlined, size: 64, color: kBorder),
        SizedBox(height: 12),
        Text('لا توجد مجموعات', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText)),
        SizedBox(height: 6),
        Text('أنشئ مجموعة للتواصل مع فريقك', style: TextStyle(fontSize: 13, color: kTextSub)),
      ]),
    );

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: groups.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final g = groups[i];
          final name = g['name'] ?? 'مجموعة';
          final members = g['_count']?['members'] ?? g['memberCount'] ?? 0;
          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: Theme.of(context).colorScheme.surface,
            leading: CircleAvatar(
              backgroundColor: kPrimaryLight,
              child: Text(name.isNotEmpty ? name[0] : 'م', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800)),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            subtitle: Text('$members عضو', style: const TextStyle(fontSize: 12, color: kTextSub)),
            trailing: const Icon(Icons.chevron_left, color: kTextSub),
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => ChatRoomScreen(groupId: g['id'], groupName: name),
            )),
          );
        },
      ),
    );
  }
}

// ─── DMs Tab ─────────────────────────────────────────────────────────────────

class _DmsTab extends StatefulWidget {
  @override
  State<_DmsTab> createState() => _DmsTabState();
}

class _DmsTabState extends State<_DmsTab> {
  List<dynamic> _employees = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/employees', queryParameters: {'limit': 50});
      if (mounted) setState(() {
        _employees = res.data is List ? res.data : (res.data['data'] ?? []);
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = context.read<AuthProvider>().user?.id;
    final filtered = _employees.where((e) {
      if (e['id'] == me) return false;
      if (_search.isEmpty) return true;
      return (e['fullName'] as String? ?? '').contains(_search);
    }).toList();

    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: TextField(
          decoration: const InputDecoration(hintText: 'ابحث عن موظف...', prefixIcon: Icon(Icons.search), contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
          onChanged: (v) => setState(() => _search = v),
        ),
      ),
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kPrimary))
            : filtered.isEmpty
                ? const Center(child: Text('لا توجد نتائج', style: TextStyle(color: kTextSub)))
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final e = filtered[i];
                      final name = e['fullName'] ?? '—';
                      final title = e['jobTitle']?['name'] ?? e['department']?['name'] ?? '';
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        tileColor: Theme.of(context).colorScheme.surface,
                        leading: CircleAvatar(
                          backgroundColor: kPrimaryLight,
                          child: Text(name.isNotEmpty ? name[0] : '?', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800)),
                        ),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        subtitle: title.isNotEmpty ? Text(title, style: const TextStyle(fontSize: 12, color: kTextSub)) : null,
                        trailing: const Icon(Icons.chat_bubble_outline_rounded, color: kPrimary, size: 20),
                        onTap: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => DmChatScreen(peerId: e['id'], peerName: name),
                        )),
                      );
                    },
                  ),
      ),
    ]);
  }
}

// ─── Group Chat Room ──────────────────────────────────────────────────────────

class ChatRoomScreen extends StatefulWidget {
  final String groupId;
  final String groupName;
  const ChatRoomScreen({super.key, required this.groupId, required this.groupName});
  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  List<dynamic> _messages = [];
  bool _loading = true;
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  Timer? _timer;

  @override
  void initState() { super.initState(); _load(); _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load()); }

  @override
  void dispose() { _timer?.cancel(); _ctrl.dispose(); _scroll.dispose(); super.dispose(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/communication/groups/${widget.groupId}/messages');
      if (mounted) {
        final msgs = res.data is List ? res.data : (res.data['data'] ?? []);
        setState(() { _messages = msgs; _loading = false; });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
        });
      }
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _send() async {
    if (_ctrl.text.trim().isEmpty) return;
    final text = _ctrl.text.trim();
    _ctrl.clear();
    try {
      await ApiClient().dio.post('/communication/groups/${widget.groupId}/messages', data: {'content': text});
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.groupName, style: const TextStyle(fontWeight: FontWeight.w800))),
    body: Column(children: [
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kPrimary))
            : _messages.isEmpty
                ? const Center(child: Text('لا توجد رسائل — ابدأ المحادثة!', style: TextStyle(color: kTextSub)))
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _MessageBubble(
                      msg: _messages[i],
                      isMe: _messages[i]['senderId'] == context.read<AuthProvider>().user?.id,
                    ),
                  ),
      ),
      _InputBar(ctrl: _ctrl, onSend: _send),
    ]),
  );
}

// ─── DM Chat Screen ───────────────────────────────────────────────────────────

class DmChatScreen extends StatefulWidget {
  final String peerId;
  final String peerName;
  const DmChatScreen({super.key, required this.peerId, required this.peerName});
  @override
  State<DmChatScreen> createState() => _DmChatScreenState();
}

class _DmChatScreenState extends State<DmChatScreen> {
  List<dynamic> _messages = [];
  bool _loading = true;
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  Timer? _timer;

  @override
  void initState() { super.initState(); _load(); _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load()); }

  @override
  void dispose() { _timer?.cancel(); _ctrl.dispose(); _scroll.dispose(); super.dispose(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().dio.get('/communication/dm/${widget.peerId}');
      if (mounted) {
        final msgs = res.data is List ? res.data : (res.data['data'] ?? []);
        setState(() { _messages = msgs; _loading = false; });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
        });
      }
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  Future<void> _send() async {
    if (_ctrl.text.trim().isEmpty) return;
    final text = _ctrl.text.trim();
    _ctrl.clear();
    try {
      await ApiClient().dio.post('/communication/dm', data: {'recipientId': widget.peerId, 'content': text});
      await _load();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      leading: const BackButton(),
      title: Row(children: [
        CircleAvatar(radius: 16, backgroundColor: kPrimaryLight,
          child: Text(widget.peerName.isNotEmpty ? widget.peerName[0] : '?', style: const TextStyle(color: kPrimary, fontSize: 14, fontWeight: FontWeight.w800))),
        const SizedBox(width: 8),
        Text(widget.peerName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
      ]),
    ),
    body: Column(children: [
      Expanded(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: kPrimary))
            : _messages.isEmpty
                ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.chat_bubble_outline_rounded, size: 56, color: kBorder),
                    const SizedBox(height: 12),
                    Text('ابدأ محادثة مع ${widget.peerName}', style: const TextStyle(color: kTextSub)),
                  ]))
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _MessageBubble(
                      msg: _messages[i],
                      isMe: _messages[i]['senderId'] == context.read<AuthProvider>().user?.id,
                    ),
                  ),
      ),
      _InputBar(ctrl: _ctrl, onSend: _send),
    ]),
  );
}

// ─── Shared Widgets ───────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Map<String, dynamic> msg;
  final bool isMe;
  const _MessageBubble({required this.msg, required this.isMe});

  @override
  Widget build(BuildContext context) {
    final content = msg['content'] as String? ?? '';
    final senderName = msg['sender']?['fullName'] ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.start : MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            CircleAvatar(radius: 14, backgroundColor: kPrimaryLight,
              child: Text(senderName.isNotEmpty ? senderName[0] : '?', style: const TextStyle(color: kPrimary, fontSize: 11, fontWeight: FontWeight.w800))),
            const SizedBox(width: 6),
          ],
          Flexible(child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isMe
                  ? (isDark ? const Color(0xFF1A2744) : kPrimaryLight)
                  : (isDark ? const Color(0xFF1A1D27) : Colors.white),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isMe ? 4 : 16),
                bottomRight: Radius.circular(isMe ? 16 : 4),
              ),
              border: Border.all(color: isMe ? kPrimary.withAlpha(40) : kBorder, width: 0.5),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (!isMe && senderName.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(senderName, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kPrimary)),
                ),
              Text(content, style: TextStyle(fontSize: 14, color: isMe ? kPrimary : null, height: 1.4)),
            ]),
          )),
          if (isMe) const SizedBox(width: 6),
        ],
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController ctrl;
  final VoidCallback onSend;
  const _InputBar({required this.ctrl, required this.onSend});

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).appBarTheme.backgroundColor,
        border: const Border(top: BorderSide(color: kBorder, width: 0.5)),
      ),
      child: Row(children: [
        Expanded(child: TextField(
          controller: ctrl,
          textInputAction: TextInputAction.send,
          onSubmitted: (_) => onSend(),
          decoration: InputDecoration(
            hintText: 'اكتب رسالة...',
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kBorder)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kBorder)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: const BorderSide(color: kPrimary)),
          ),
        )),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: onSend,
          child: Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: kPrimary, shape: BoxShape.circle),
            child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
          ),
        ),
      ]),
    ),
  );
}
