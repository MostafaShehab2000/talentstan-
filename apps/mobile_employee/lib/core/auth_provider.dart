import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import 'api_client.dart';

class AuthUser {
  final String id;
  final String fullName;
  final String email;
  final String employeeCode;
  final List<String> roles;
  final String? tenantId;
  final String? profilePhotoUrl;
  final bool isManager;

  AuthUser({
    required this.id,
    required this.fullName,
    required this.email,
    required this.employeeCode,
    required this.roles,
    this.tenantId,
    this.profilePhotoUrl,
    this.isManager = false,
  });

  bool get isHrAdmin => roles.contains('hr_admin');
  String get initials {
    final parts = fullName.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return fullName.isNotEmpty ? fullName[0].toUpperCase() : '?';
  }

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        id: j['id'] ?? '',
        fullName: j['fullName'] ?? '',
        email: j['email'] ?? '',
        employeeCode: j['employeeCode'] ?? '',
        roles: List<String>.from((j['roles'] ?? []).map((r) => r is Map ? r['role'] : r)),
        tenantId: j['tenantId'],
        profilePhotoUrl: j['profilePhotoUrl'],
        isManager: j['isManager'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id, 'fullName': fullName, 'email': email, 'employeeCode': employeeCode,
        'roles': roles, 'tenantId': tenantId, 'profilePhotoUrl': profilePhotoUrl,
        'isManager': isManager,
      };
}

class AuthProvider extends ChangeNotifier {
  AuthUser? _user;
  bool _loading = true;
  final _storage = const FlutterSecureStorage();
  final _api = ApiClient();

  AuthUser? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;

  Future<void> init() async {
    final raw = await _storage.read(key: 'user_data');
    if (raw != null) {
      try { _user = AuthUser.fromJson(jsonDecode(raw)); } catch (_) {}
    }
    _loading = false;
    notifyListeners();
  }

  Future<String?> login(String identifier, String password) async {
    try {
      final res = await _api.dio.post('/auth/login', data: {
        'identifier': identifier,
        'password': password,
      });
      final d = res.data;
      await _api.saveTokens(d['accessToken'], d['refreshToken']);
      _user = AuthUser.fromJson(d['employee']);
      await _storage.write(key: 'user_data', value: jsonEncode(_user!.toJson()));
      notifyListeners();
      return null;
    } catch (e) {
      if (e is DioException) {
        final msg = e.response?.data?['message'];
        return msg is List ? msg.join(' — ') : (msg ?? 'خطأ في الاتصال');
      }
      return 'حدث خطأ غير متوقع';
    }
  }

  Future<void> logout() async {
    await _api.clearTokens();
    await _storage.delete(key: 'user_data');
    _user = null;
    notifyListeners();
  }
}
