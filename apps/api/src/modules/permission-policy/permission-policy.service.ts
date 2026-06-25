import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export class UpsertPermissionPolicyDto {
  maxHoursPerMonth: number;
  maxTimesPerMonth: number;
  monthStartDay: number;
  isActive?: boolean;
}

@Injectable()
export class PermissionPolicyService {
  constructor(private prisma: PrismaService) {}

  async getPolicy(tenantId: string) {
    return this.prisma.permissionPolicy.findUnique({ where: { tenantId } });
  }

  async upsertPolicy(tenantId: string, dto: UpsertPermissionPolicyDto) {
    return this.prisma.permissionPolicy.upsert({
      where: { tenantId },
      update: dto,
      create: { tenantId, ...dto },
    });
  }

  async checkQuota(tenantId: string, employeeId: string, requestedHours: number): Promise<void> {
    const policy = await this.prisma.permissionPolicy.findUnique({ where: { tenantId } });
    if (!policy || !policy.isActive) return;

    const now = new Date();
    const startDay = policy.monthStartDay;
    let periodStart: Date;
    let periodEnd: Date;

    // حساب بداية/نهاية الفترة الشهرية
    if (now.getDate() >= startDay) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
      periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, startDay);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
      periodEnd   = new Date(now.getFullYear(), now.getMonth(), startDay);
    }

    // جيب أذونات الشهر الحالي
    const monthRequests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        leaveType: { category: 'permission' },
        status: { in: ['submitted', 'in_review', 'approved'] },
        startDate: { gte: periodStart, lt: periodEnd },
      },
      select: { totalHours: true },
    });

    const usedTimes = monthRequests.length;
    const usedHours = monthRequests.reduce((sum, r) => sum + Number(r.totalHours ?? 0), 0);

    if (usedTimes >= policy.maxTimesPerMonth) {
      throw new Error(
        `تجاوزت الحد الشهري للأذونات (${policy.maxTimesPerMonth} مرة في الشهر). استُخدم: ${usedTimes} مرة`,
      );
    }

    if (usedHours + requestedHours > Number(policy.maxHoursPerMonth)) {
      const remaining = Number(policy.maxHoursPerMonth) - usedHours;
      throw new Error(
        `تجاوزت حد ساعات الأذونات الشهري. المتاح: ${remaining.toFixed(1)} ساعة، المطلوب: ${requestedHours.toFixed(1)} ساعة`,
      );
    }
  }

  async getMyMonthlyUsage(tenantId: string, employeeId: string) {
    const policy = await this.prisma.permissionPolicy.findUnique({ where: { tenantId } });

    const now = new Date();
    const startDay = policy?.monthStartDay ?? 1;
    let periodStart: Date;

    if (now.getDate() >= startDay) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), startDay);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
    }

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        leaveType: { category: 'permission' },
        status: { in: ['submitted', 'in_review', 'approved'] },
        startDate: { gte: periodStart, lt: periodEnd },
      },
      select: { totalHours: true, status: true, startDate: true },
    });

    const usedTimes = requests.length;
    const usedHours = requests.reduce((sum, r) => sum + Number(r.totalHours ?? 0), 0);

    return {
      policy,
      usedTimes,
      usedHours,
      remainingTimes: policy ? Math.max(0, policy.maxTimesPerMonth - usedTimes) : null,
      remainingHours: policy ? Math.max(0, Number(policy.maxHoursPerMonth) - usedHours) : null,
      periodStart,
      periodEnd,
    };
  }
}
