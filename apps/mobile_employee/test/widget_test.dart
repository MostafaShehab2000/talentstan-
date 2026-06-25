import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_employee/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const TalentStanApp());
  });
}
