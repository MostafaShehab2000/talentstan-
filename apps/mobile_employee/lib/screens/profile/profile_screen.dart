import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:provider/provider.dart';
import '../../core/auth_provider.dart';
import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../core/theme_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final user = context.read<AuthProvider>().user!;
      final res = await ApiClient().dio.get('/employees/${user.id}');
      if (mounted) setState(() { _profile = res.data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user!;
    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: const Color(0x22000000),
        title: const Text('ملفي الشخصي', style: TextStyle(fontWeight: FontWeight.w800, color: kText)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: kPrimary),
            onPressed: () => _showEditProfile(context),
            tooltip: 'تعديل البيانات',
          ),
          TextButton.icon(
            onPressed: () => _confirmLogout(context),
            icon: const Icon(Icons.logout, size: 18, color: kDanger),
            label: const Text('خروج', style: TextStyle(color: kDanger, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kPrimary))
          : RefreshIndicator(color: kPrimary, onRefresh: _load, child: _body(user)),
    );
  }

  Widget _body(AuthUser user) => ListView(
    padding: EdgeInsets.zero,
    children: [
      // Cover + avatar
      Stack(clipBehavior: Clip.none, children: [
        Container(height: 120, color: kPrimary),
        Positioned(bottom: -40, right: 16,
          child: Container(
            decoration: BoxDecoration(border: Border.all(color: Colors.white, width: 4), shape: BoxShape.circle),
            child: CircleAvatar(
              radius: 44,
              backgroundColor: kPrimary.withValues(alpha: 0.85),
              child: Text(user.initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 30)),
            ),
          ),
        ),
      ]),
      const SizedBox(height: 52),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(user.fullName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: kText)),
          if (_profile?['jobTitle']?['title'] != null) ...[
            const SizedBox(height: 2),
            Text(_profile!['jobTitle']['title'], style: const TextStyle(fontSize: 15, color: kTextSub)),
          ],
          if (user.isManager) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(6)),
              child: const Text('مدير', style: TextStyle(color: kPrimary, fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ],
        ]),
      ),
      const SizedBox(height: 16),
      const _Divider8(),

      // Info section
      _FbSection(children: [
        if (_profile?['department']?['name'] != null)
          _InfoRow(icon: Icons.folder_rounded, label: _profile!['department']['name'], sub: 'القسم', color: kWarning),
        _InfoRow(icon: Icons.badge_outlined, label: user.employeeCode, sub: 'كود الموظف', color: kPrimary),
        if (user.email.isNotEmpty)
          _InfoRow(icon: Icons.email_outlined, label: user.email, sub: 'البريد الإلكتروني', color: kPrimary),
        if (_profile?['phone'] != null)
          _InfoRow(icon: Icons.phone_outlined, label: _profile!['phone'], sub: 'رقم الجوال', color: kSuccess),
        if (_profile?['hireDate'] != null)
          _InfoRow(icon: Icons.calendar_today_outlined, label: _fmt(_profile!['hireDate']), sub: 'تاريخ التعيين', color: kTextSub),
        if (_profile?['directManager']?['fullName'] != null)
          _InfoRow(icon: Icons.supervisor_account_outlined, label: _profile!['directManager']['fullName'], sub: 'المدير المباشر', color: kTextSub),
      ]),
      const _Divider8(),

      // Roles
      _FbSection(header: 'الصلاحيات', children: [
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Wrap(spacing: 8, runSpacing: 8, children: user.roles.map((r) =>
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(20)),
              child: Text(r.replaceAll('_', ' '), style: const TextStyle(color: kPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
            )).toList()),
        ),
      ]),
      const _Divider8(),

      // Settings
      _FbSection(children: [
        _DarkModeRow(),
        _SettingRow(icon: Icons.lock_outline, label: 'تغيير كلمة المرور', color: kPrimary, onTap: () => _showChangePassword(context)),
        _SettingRow(icon: Icons.help_outline, label: 'الدعم الفني', color: kTextSub, onTap: () {}),
        _SettingRow(icon: Icons.logout, label: 'تسجيل الخروج', color: kDanger, onTap: () => _confirmLogout(context)),
      ]),
      const SizedBox(height: 80),
    ],
  );

  void _showEditProfile(BuildContext context) {
    final phoneCtrl   = TextEditingController(text: _profile?['phone']      ?? '');
    final emailCtrl   = TextEditingController(text: _profile?['email']      ?? '');
    final birthCtrl   = TextEditingController(text: _profile?['birthDate'] != null ? (_profile!['birthDate'] as String).substring(0, 10) : '');
    final natCtrl     = TextEditingController(text: _profile?['nationalId'] ?? '');
    final addressCtrl = TextEditingController(text: _profile?['address']    ?? '');
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('تعديل البيانات الشخصية', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              IconButton(onPressed: () => Navigator.pop(ctx), icon: const Icon(Icons.close)),
            ]),
            const SizedBox(height: 4),
            const Text('البيانات القابلة للتعديل فقط', style: TextStyle(fontSize: 12, color: kTextSub)),
            const SizedBox(height: 16),
            TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'رقم الهاتف', prefixIcon: Icon(Icons.phone_outlined)), keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'البريد الإلكتروني', prefixIcon: Icon(Icons.mail_outline)), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 12),
            TextField(
              controller: birthCtrl,
              readOnly: true,
              decoration: const InputDecoration(labelText: 'تاريخ الميلاد', prefixIcon: Icon(Icons.cake_outlined)),
              onTap: () async {
                final d = await showDatePicker(context: ctx, initialDate: DateTime(1990), firstDate: DateTime(1950), lastDate: DateTime.now());
                if (d != null) birthCtrl.text = d.toIso8601String().substring(0, 10);
              },
            ),
            const SizedBox(height: 12),
            TextField(controller: natCtrl, decoration: const InputDecoration(labelText: 'الرقم القومي', prefixIcon: Icon(Icons.badge_outlined))),
            const SizedBox(height: 12),
            TextField(controller: addressCtrl, decoration: const InputDecoration(labelText: 'العنوان', prefixIcon: Icon(Icons.home_outlined)), maxLines: 2),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: saving ? null : () async {
                setS(() => saving = true);
                try {
                  await ApiClient().dio.patch('/employees/me/profile', data: {
                    if (phoneCtrl.text.isNotEmpty)   'phone':      phoneCtrl.text,
                    if (emailCtrl.text.isNotEmpty)   'email':      emailCtrl.text,
                    if (birthCtrl.text.isNotEmpty)   'birthDate':  birthCtrl.text,
                    if (natCtrl.text.isNotEmpty)     'nationalId': natCtrl.text,
                    if (addressCtrl.text.isNotEmpty) 'address':    addressCtrl.text,
                  });
                  if (ctx.mounted) { Navigator.pop(ctx); _load(); }
                } catch (_) {
                  if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('حدث خطأ')));
                } finally {
                  setS(() => saving = false);
                }
              },
              child: saving ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('حفظ التغييرات'),
            ),
          ])),
        ),
      ),
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(context: context, builder: (_) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('تسجيل الخروج', style: TextStyle(fontWeight: FontWeight.w800)),
      content: const Text('هل أنت متأكد من الخروج؟', style: TextStyle(color: kTextSub)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء', style: TextStyle(color: kTextSub))),
        TextButton(
          onPressed: () { Navigator.pop(context); context.read<AuthProvider>().logout(); },
          child: const Text('خروج', style: TextStyle(color: kDanger, fontWeight: FontWeight.w700)),
        ),
      ],
    ));
  }

  void _showChangePassword(BuildContext context) {
    final oldCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    String? error;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text('تغيير كلمة المرور', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 20),
            TextField(controller: oldCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'كلمة المرور الحالية')),
            const SizedBox(height: 10),
            TextField(controller: newCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'كلمة المرور الجديدة')),
            const SizedBox(height: 10),
            TextField(controller: confirmCtrl, obscureText: true, decoration: const InputDecoration(labelText: 'تأكيد كلمة المرور')),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(error!, style: const TextStyle(color: kDanger, fontSize: 13))),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                if (newCtrl.text != confirmCtrl.text) { setS(() => error = 'كلمتا المرور غير متطابقتين'); return; }
                if (newCtrl.text.length < 6) { setS(() => error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
                try {
                  final user = context.read<AuthProvider>().user!;
                  await ApiClient().dio.patch('/employees/${user.id}', data: {'password': newCtrl.text});
                  if (ctx.mounted) { Navigator.pop(ctx); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم تغيير كلمة المرور'))); }
                } catch (_) { setS(() => error = 'حدث خطأ'); }
              },
              child: const Text('حفظ'),
            ),
          ]),
        ),
      ),
    );
  }

  String _fmt(dynamic d) { if (d == null) return '—'; try { return d.toString().substring(0, 10); } catch (_) { return d.toString(); } }
}

class _FbSection extends StatelessWidget {
  final String? header;
  final List<Widget> children;
  const _FbSection({this.header, required this.children});
  @override
  Widget build(BuildContext context) => Container(
    color: Colors.white,
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      if (header != null) ...[
        Text(header!, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: kText)),
        const SizedBox(height: 10),
      ],
      ...children,
    ]),
  );
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label, sub;
  final Color color;
  const _InfoRow({required this.icon, required this.label, required this.sub, required this.color});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle), child: Icon(icon, color: color, size: 18)),
      const SizedBox(width: 14),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: kText)),
        Text(sub, style: const TextStyle(fontSize: 12, color: kTextSub)),
      ]),
    ]),
  );
}

class _DarkModeRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final tp = context.watch<ThemeProvider>();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(children: [
        Container(width: 36, height: 36,
          decoration: BoxDecoration(color: const Color(0xFF1A1D27).withAlpha(15), shape: BoxShape.circle),
          child: const Icon(Icons.dark_mode_outlined, color: Color(0xFF1A1D27), size: 18)),
        const SizedBox(width: 14),
        const Expanded(child: Text('الوضع الداكن', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: kText))),
        Switch(value: tp.isDark, onChanged: (_) => tp.toggle(), activeColor: kPrimary),
      ]),
    );
  }
}

class _SettingRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _SettingRow({required this.icon, required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(10),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle), child: Icon(icon, color: color, size: 18)),
        const SizedBox(width: 14),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: kText))),
        const Icon(Icons.chevron_left, color: kTextSub),
      ]),
    ),
  );
}

class _Divider8 extends StatelessWidget {
  const _Divider8();
  @override
  Widget build(BuildContext context) => const SizedBox(height: 8, child: ColoredBox(color: kSurface));
}
