import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/auth_provider.dart';
import '../../core/theme.dart';
import '../../core/notification_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _idCtrl  = TextEditingController();
  final _pwCtrl  = TextEditingController();
  bool _obscure  = true;
  bool _loading  = false;
  String? _error;

  Future<void> _submit() async {
    if (_idCtrl.text.trim().isEmpty || _pwCtrl.text.isEmpty) {
      setState(() => _error = 'يرجى إدخال بيانات تسجيل الدخول');
      return;
    }
    setState(() { _loading = true; _error = null; });
    final err = await context.read<AuthProvider>().login(_idCtrl.text.trim(), _pwCtrl.text);
    if (mounted) setState(() { _loading = false; _error = err; });
    if (err == null) NotificationService.instance.init();
  }

  @override
  void dispose() { _idCtrl.dispose(); _pwCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 48),
              Center(
                child: Column(children: [
                  Container(
                    width: 64, height: 64,
                    decoration: BoxDecoration(color: kPrimary, borderRadius: BorderRadius.circular(14)),
                    child: const Center(
                      child: Text('T', style: TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.w900)),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text('Talentstan', style: TextStyle(color: kPrimary, fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
                  const SizedBox(height: 4),
                  const Text('نظام إدارة الموارد البشرية', style: TextStyle(color: kTextSub, fontSize: 14)),
                ]),
              ),
              const SizedBox(height: 40),
              _Field(
                controller: _idCtrl,
                hint: 'البريد الإلكتروني أو كود الموظف',
                keyboardType: TextInputType.emailAddress,
                onSubmit: _submit,
              ),
              const SizedBox(height: 12),
              _Field(
                controller: _pwCtrl,
                hint: 'كلمة المرور',
                obscure: _obscure,
                onSubmit: _submit,
                suffix: IconButton(
                  icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: kTextSub, size: 20),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(8)),
                  child: Text(_error!, style: const TextStyle(color: kDanger, fontSize: 13), textAlign: TextAlign.center),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kPrimary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _loading
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : const Text('تسجيل الدخول', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 14),
              Center(
                child: TextButton(
                  onPressed: () {},
                  child: const Text('هل نسيت كلمة المرور؟', style: TextStyle(color: kPrimary, fontSize: 14, fontWeight: FontWeight.w700)),
                ),
              ),
              const SizedBox(height: 24),
              const Row(children: [
                Expanded(child: Divider(color: kBorder)),
                Padding(padding: EdgeInsets.symmetric(horizontal: 12), child: Text('أو', style: TextStyle(color: kTextSub, fontSize: 13))),
                Expanded(child: Divider(color: kBorder)),
              ]),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(10), border: Border.all(color: kBorder)),
                child: const Text(
                  'للحصول على بيانات الدخول\nتواصل مع قسم الموارد البشرية',
                  style: TextStyle(color: kTextSub, fontSize: 13, height: 1.5),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final bool obscure;
  final TextInputType keyboardType;
  final Widget? suffix;
  final VoidCallback? onSubmit;
  const _Field({required this.controller, required this.hint, this.obscure = false, this.keyboardType = TextInputType.text, this.suffix, this.onSubmit});

  @override
  Widget build(BuildContext context) => TextField(
    controller: controller,
    obscureText: obscure,
    keyboardType: keyboardType,
    textDirection: TextDirection.ltr,
    onSubmitted: (_) => onSubmit?.call(),
    decoration: InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: kTextSub),
      filled: true,
      fillColor: kSurface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kPrimary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      suffixIcon: suffix,
    ),
  );
}
