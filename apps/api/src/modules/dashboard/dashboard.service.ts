import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, addDays } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

    const [
      totalEmployees,
      activeEmployees,
      newThisMonth,
      newLastMonth,
      todayAttendance,
      pendingLeave,
      pendingOtherRequests,
      openTickets,
      upcomingLeaves,
      monthlyLeave,
      recentActivities,
      leaveByType,
    ] = await Promise.all([
      // إجمالي الموظفين
      this.prisma.employee.count({ where: { tenantId } }),

      // الموظفين النشطين
      this.prisma.employee.count({ where: { tenantId, status: 'active' } }),

      // جدد هذا الشهر
      this.prisma.employee.count({ where: { tenantId, createdAt: { gte: monthStart, lte: monthEnd } } }),

      // جدد الشهر الماضي
      this.prisma.employee.count({ where: { tenantId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),

      // حضور اليوم
      this.prisma.attendanceRecord.findMany({
        where: { tenantId, date: { gte: todayStart, lte: todayEnd } },
        select: { status: true, checkInTime: true },
      }),

      // طلبات إجازة معلقة
      this.prisma.leaveRequest.count({
        where: { tenantId, status: { in: ['submitted', 'in_review'] } },
      }),

      // طلبات إذن/مأمورية معلقة
      this.prisma.otherRequest.count({
        where: { tenantId, status: { in: ['submitted', 'in_review'] } },
      }),

      // تذاكر دعم مفتوحة
      this.prisma.helpdeskTicket.count({
        where: { tenantId, status: { in: ['open', 'in_progress'] } },
      }),

      // إجازات هذا الأسبوع
      this.prisma.leaveRequest.findMany({
        where: {
          tenantId,
          status: 'approved',
          startDate: { lte: weekEnd },
          endDate: { gte: weekStart },
        },
        include: { employee: { select: { fullName: true } }, leaveType: { select: { name: true } } },
        orderBy: { startDate: 'asc' },
        take: 8,
      }),

      // إجازات آخر 6 شهور (trend)
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const m = subMonths(today, 5 - i);
          return this.prisma.leaveRequest.count({
            where: {
              tenantId,
              status: 'approved',
              startDate: { gte: startOfMonth(m), lte: endOfMonth(m) },
            },
          }).then(count => ({ month: format(m, 'MMM'), count }));
        }),
      ),

      // آخر 8 أنشطة (leave requests)
      this.prisma.leaveRequest.findMany({
        where: { tenantId },
        include: { employee: { select: { fullName: true } }, leaveType: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),

      // توزيع الإجازات بالنوع هذا الشهر
      this.prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: { tenantId, startDate: { gte: monthStart, lte: monthEnd } },
        _count: { id: true },
      }).then(async (groups) => {
        const types = await this.prisma.leaveType.findMany({ where: { tenantId }, select: { id: true, name: true } });
        return groups.map(g => ({
          name: types.find(t => t.id === g.leaveTypeId)?.name ?? 'أخرى',
          count: g._count.id,
        }));
      }),
    ]);

    const present = todayAttendance.filter(a => a.status === 'present' || a.checkInTime).length;
    const late = todayAttendance.filter(a => a.status === 'late').length;
    const absent = activeEmployees - present;

    return {
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        newThisMonth,
        trend: newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : 0,
      },
      attendance: {
        present,
        late,
        absent: absent < 0 ? 0 : absent,
        rate: activeEmployees > 0 ? Math.round((present / activeEmployees) * 100) : 0,
      },
      pending: {
        leave: pendingLeave,
        otherRequests: pendingOtherRequests,
        total: pendingLeave + pendingOtherRequests,
      },
      tickets: { open: openTickets },
      upcomingLeaves,
      monthlyLeave,
      recentActivities: recentActivities.map(r => ({
        id: r.id,
        employee: r.employee.fullName,
        type: r.leaveType?.name ?? '—',
        status: r.status,
        date: r.createdAt,
      })),
      leaveByType,
    };
  }
}
