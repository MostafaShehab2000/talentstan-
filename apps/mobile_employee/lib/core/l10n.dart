import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class L10nProvider extends ChangeNotifier {
  String _lang = 'ar';
  String get lang => _lang;
  bool get isAr => _lang == 'ar';
  Locale get locale => Locale(_lang);
  TextDirection get dir => _lang == 'ar' ? TextDirection.rtl : TextDirection.ltr;

  void toggle() {
    _lang = _lang == 'ar' ? 'en' : 'ar';
    notifyListeners();
  }
}

final _ar = <String, String>{
  'app_name':          'Talentstan',
  'home':              'الرئيسية',
  'requests':          'الطلبات',
  'messages':          'الرسائل',
  'team':              'الفريق',
  'chat':              'الشات',
  'profile':           'الملف الشخصي',
  'payslips':          'كشوف الراتب',
  'appraisal':         'التقييم السنوي',
  'leave_request':     'طلب إجازة',
  'permission':        'طلب إذن',
  'mission':           'طلب مأمورية',
  'advance':           'طلب سلفة',
  'submit':            'إرسال',
  'cancel':            'إلغاء',
  'approve':           'موافقة',
  'reject':            'رفض',
  'logout':            'تسجيل الخروج',
  'dark_mode':         'الوضع الداكن',
  'edit_profile':      'تعديل البيانات',
  'notifications':     'الإشعارات',
  'no_data':           'لا توجد بيانات',
  'loading':           'جارٍ التحميل...',
  'save':              'حفظ',
  'send':              'إرسال',
  'welcome':           'مرحباً',
  'pending':           'قيد المراجعة',
  'approved':          'موافق عليه',
  'rejected':          'مرفوض',
  'in_review':         'ينتظر HR',
};

final _en = <String, String>{
  'app_name':          'Talentstan',
  'home':              'Home',
  'requests':          'Requests',
  'messages':          'Messages',
  'team':              'Team',
  'chat':              'Chat',
  'profile':           'Profile',
  'payslips':          'Payslips',
  'appraisal':         'Performance',
  'leave_request':     'Leave Request',
  'permission':        'Permission',
  'mission':           'Mission',
  'advance':           'Salary Advance',
  'submit':            'Submit',
  'cancel':            'Cancel',
  'approve':           'Approve',
  'reject':            'Reject',
  'logout':            'Log Out',
  'dark_mode':         'Dark Mode',
  'edit_profile':      'Edit Profile',
  'notifications':     'Notifications',
  'no_data':           'No data available',
  'loading':           'Loading...',
  'save':              'Save',
  'send':              'Send',
  'welcome':           'Welcome',
  'pending':           'Pending',
  'approved':          'Approved',
  'rejected':          'Rejected',
  'in_review':         'HR Review',
};

extension L10n on BuildContext {
  String tr(String key) {
    final lang = read<L10nProvider>().lang;
    final map = lang == 'ar' ? _ar : _en;
    return map[key] ?? key;
  }
}
