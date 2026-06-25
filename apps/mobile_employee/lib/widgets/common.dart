import 'package:flutter/material.dart';
import '../core/theme.dart';

// ── Status Badge ──
class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    final map = {
      'pending': ('قيد المراجعة', kWarning, const Color(0xFFFFFBEB)),
      'approved': ('موافق', kSuccess, const Color(0xFFF0FDF4)),
      'rejected': ('مرفوض', kDanger, const Color(0xFFFEF2F2)),
      'active': ('نشط', kSuccess, const Color(0xFFF0FDF4)),
      'inactive': ('غير نشط', kTextSub, kSurface),
      'open': ('مفتوح', kPrimary, kPrimaryLight),
      'closed': ('مغلق', kTextSub, kSurface),
    };
    final (label, color, bg) = map[status] ?? (status, kTextSub, kSurface);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
    );
  }
}

// ── Section Header ──
class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;
  const SectionHeader(this.title, {this.action, super.key});

  @override
  Widget build(BuildContext context) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: kText)),
          if (action != null) action!,
        ],
      );
}

// ── Info Row ──
class InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const InfoRow({required this.icon, required this.label, required this.value, super.key});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(color: kPrimaryLight, borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, size: 18, color: kPrimary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: const TextStyle(fontSize: 11, color: kTextSub)),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: kText)),
              ]),
            ),
          ],
        ),
      );
}

// ── Avatar ──
class UserAvatar extends StatelessWidget {
  final String name;
  final double size;
  final String? photoUrl;
  const UserAvatar({required this.name, this.size = 44, this.photoUrl, super.key});

  String get _initials {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  @override
  Widget build(BuildContext context) {
    if (photoUrl != null) {
      return CircleAvatar(radius: size / 2, backgroundImage: NetworkImage(photoUrl!));
    }
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: kPrimary,
      child: Text(_initials, style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: size * 0.35)),
    );
  }
}

// ── Empty State ──
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const EmptyState({required this.icon, required this.message, super.key});

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 52, color: kBorder),
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(color: kTextSub, fontSize: 14), textAlign: TextAlign.center),
          ]),
        ),
      );
}

// ── Loading Shimmer ──
class LoadingCard extends StatelessWidget {
  const LoadingCard({super.key});
  @override
  Widget build(BuildContext context) => Container(
        height: 80, margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(color: kBorder.withOpacity(0.3), borderRadius: BorderRadius.circular(12)),
      );
}

// ── Stat Card ──
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const StatCard({required this.label, required this.value, required this.icon, required this.color, super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kBorder),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: kTextSub)),
        ]),
      );
}
