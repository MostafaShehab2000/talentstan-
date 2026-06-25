import 'package:flutter/material.dart';

const kPrimary      = Color(0xFF2563EB);
const kPrimaryDark  = Color(0xFF1D4ED8);
const kPrimaryLight = Color(0xFFEFF6FF);
const kSurface      = Color(0xFFF4F6FA);
const kBorder       = Color(0xFFE5E7EB);
const kText         = Color(0xFF111827);
const kTextSub      = Color(0xFF6B7280);
const kSuccess      = Color(0xFF16A34A);
const kSuccessLight = Color(0xFFDCFCE7);
const kWarning      = Color(0xFFD97706);
const kWarningLight = Color(0xFFFEF3C7);
const kDanger       = Color(0xFFDC2626);
const kDangerLight  = Color(0xFFFEE2E2);
const kPurple       = Color(0xFF7C3AED);
const kPurpleLight  = Color(0xFFEDE9FE);

ThemeData buildTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: kPrimary, brightness: Brightness.light),
    scaffoldBackgroundColor: kSurface,
    fontFamily: 'Cairo',
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: kText,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      shadowColor: Color(0x22000000),
      titleTextStyle: TextStyle(color: kText, fontSize: 17, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Colors.white,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kSurface,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kPrimary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      labelStyle: const TextStyle(color: kTextSub, fontSize: 14),
      hintStyle: const TextStyle(color: kTextSub, fontSize: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: kPrimary,
      unselectedItemColor: kTextSub,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
      showSelectedLabels: true,
      showUnselectedLabels: true,
      selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
      unselectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w400, fontFamily: 'Cairo'),
    ),
    dividerTheme: const DividerThemeData(color: kBorder, thickness: 1, space: 0),
    tabBarTheme: const TabBarThemeData(
      labelColor: kPrimary,
      unselectedLabelColor: kTextSub,
      indicatorSize: TabBarIndicatorSize.label,
      labelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, fontFamily: 'Cairo'),
      unselectedLabelStyle: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, fontFamily: 'Cairo'),
    ),
  );
}
