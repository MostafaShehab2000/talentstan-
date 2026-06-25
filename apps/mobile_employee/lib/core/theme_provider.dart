import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ThemeProvider extends ChangeNotifier {
  bool _dark = false;
  bool get isDark => _dark;

  final _storage = const FlutterSecureStorage();

  ThemeProvider() { _load(); }

  Future<void> _load() async {
    final v = await _storage.read(key: 'dark_mode');
    if (v == 'true') { _dark = true; notifyListeners(); }
  }

  Future<void> toggle() async {
    _dark = !_dark;
    await _storage.write(key: 'dark_mode', value: _dark.toString());
    notifyListeners();
  }
}
