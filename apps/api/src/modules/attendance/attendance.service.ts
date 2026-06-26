import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

  // ── جهاز البصمة ──

  async saveDevice(tenantId: string, dto: { name: string; ip: string; port?: number; password?: string }) {
    return this.prisma.biometricDevice.upsert({
      where: { tenantId_ip: { tenantId, ip: dto.ip } } as any,
      create: { tenantId, name: dto.name, ip: dto.ip, port: dto.port ?? 4370, password: dto.password },
      update: { name: dto.name, port: dto.port ?? 4370, password: dto.password },
    });
  }

  async getDevices(tenantId: string) {
    return this.prisma.biometricDevice.findMany({ where: { tenantId, isActive: true } });
  }

  async syncFromMachine(tenantId: string, ip: string, port = 4370, password?: string) {
    // Dynamic import to avoid build issues if zklib is not available
    let ZKLib: any;
    try {
      ZKLib = require('zklib');
    } catch {
      throw new BadRequestException('مكتبة ZKLib غير متاحة. تأكد من تثبيتها.');
    }

    const device = new ZKLib(ip, port, 10000, 4000);

    try {
      this.logger.log(`Connecting to device ${ip}:${port}...`);
      await device.createSocket();

      const attendanceLogs: any[] = await device.getAttendance();
      this.logger.log(`Got ${attendanceLogs.length} logs from device`);

      // Get all employees for this tenant
      const employees = await this.prisma.employee.findMany({
        where: { tenantId, status: 'active' },
        select: { id: true, employeeCode: true },
      });
      const empMap = new Map(employees.map(e => [e.employeeCode, e.id]));

      let synced = 0;
      const grouped = new Map<string, { checkIn?: Date; checkOut?: Date }>();

      // Group logs by employee+date
      for (const log of attendanceLogs) {
        const userId = log.user_id?.toString() ?? log.userId?.toString();
        const time   = new Date(log.record_time ?? log.time);
        const punch  = log.record_type ?? log.type ?? 0; // 0=in, 1=out
        const dateKey = `${userId}_${time.toISOString().substring(0, 10)}`;

        if (!grouped.has(dateKey)) grouped.set(dateKey, {});
        const entry = grouped.get(dateKey)!;

        if (punch === 0 || punch === '0') {
          if (!entry.checkIn || time < entry.checkIn) entry.checkIn = time;
        } else {
          if (!entry.checkOut || time > entry.checkOut) entry.checkOut = time;
        }
      }

      // Save to DB
      for (const [key, times] of grouped.entries()) {
        const [userId, dateStr] = key.split('_');
        const employeeId = empMap.get(userId);
        if (!employeeId || !times.checkIn) continue;

        const date = new Date(dateStr);
        const worked = times.checkOut
          ? Math.round((times.checkOut.getTime() - times.checkIn.getTime()) / 60000)
          : null;

        await this.prisma.attendanceRecord.upsert({
          where: { employeeId_date: { employeeId, date } },
          create: { tenantId, employeeId, date, checkIn: times.checkIn, checkOut: times.checkOut, workedMinutes: worked, source: 'biometric' },
          update: { checkIn: times.checkIn, checkOut: times.checkOut, workedMinutes: worked },
        });
        synced++;
      }

      // Update last sync
      await this.prisma.biometricDevice.updateMany({
        where: { tenantId, ip },
        data: { lastSync: new Date() },
      });

      await device.disconnect();
      return { synced, total: attendanceLogs.length };

    } catch (err: any) {
      this.logger.error(`Failed to connect to ${ip}:${port} - ${err.message}`);
      throw new BadRequestException(`تعذر الاتصال بالجهاز: ${err.message}`);
    }
  }

  // ── سجل الحضور ──

  async getMyAttendance(tenantId: string, employeeId: string, month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const from = new Date(y, m - 1, 1);
    const to   = new Date(y, m, 0, 23, 59, 59);

    return this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId, date: { gte: from, lte: to } },
      orderBy: { date: 'desc' },
    });
  }

  async getAllAttendance(tenantId: string, date?: string, departmentId?: string) {
    const where: any = { tenantId };
    if (date) where.date = new Date(date);

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    if (departmentId) return records.filter(r => (r.employee as any)?.department?.id === departmentId);
    return records;
  }

  async getTodaySummary(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [present, total] = await Promise.all([
      this.prisma.attendanceRecord.count({ where: { tenantId, date: { gte: today, lt: tomorrow } } }),
      this.prisma.employee.count({ where: { tenantId, status: 'active' } }),
    ]);

    return { present, absent: total - present, total, date: today.toISOString().substring(0, 10) };
  }
}
