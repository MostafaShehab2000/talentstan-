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

  // ── حضور الموظف: اليوم ──
  async getMyToday(tenantId: string, employeeId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId, date: { gte: today, lt: tomorrow } },
    });

    if (!record) return { status: 'absent', checkInTime: null, checkOutTime: null, hoursWorked: 0, lateMinutes: 0 };

    const checkIn  = record.checkIn;
    const checkOut = record.checkOut;
    const workedMinutes = record.workedMinutes ?? 0;
    const hoursWorked = +(workedMinutes / 60).toFixed(1);

    // تأخر لو دخل بعد 9 صباحاً
    const expectedIn = new Date(today); expectedIn.setHours(9, 0, 0, 0);
    const lateMinutes = checkIn && checkIn > expectedIn
      ? Math.round((checkIn.getTime() - expectedIn.getTime()) / 60000)
      : 0;

    const status = !checkIn ? 'absent' : lateMinutes > 15 ? 'late' : 'present';

    return {
      status,
      checkInTime: checkIn?.toISOString() ?? null,
      checkOutTime: checkOut?.toISOString() ?? null,
      hoursWorked,
      actualWorkTime: workedMinutes > 0 ? `${Math.floor(workedMinutes / 60)}:${String(workedMinutes % 60).padStart(2, '0')}` : '—',
      lateMinutes,
    };
  }

  // ── حضور الموظف: الأسبوع ──
  async getMyWeek(tenantId: string, employeeId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId, date: { gte: weekAgo, lte: today } },
      orderBy: { date: 'asc' },
    });

    // أرجع 7 أيام حتى لو مفيش سجل
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAgo); d.setDate(weekAgo.getDate() + i);
      const rec = records.find(r => new Date(r.date).toDateString() === d.toDateString());
      return {
        date: d.toISOString().substring(0, 10),
        hoursWorked: rec ? +((rec.workedMinutes ?? 0) / 60).toFixed(1) : 0,
        status: rec?.checkIn ? 'present' : 'absent',
      };
    });
  }

  // ── تسجيل الحضور اليدوي ──
  async checkIn(tenantId: string, employeeId: string) {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId, date: { gte: today } },
    });
    if (existing?.checkIn) throw new BadRequestException('تم تسجيل الحضور مسبقاً');

    await this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: { tenantId, employeeId, date: today, checkIn: now, source: 'manual' },
      update: { checkIn: now },
    });
    return { success: true, time: now.toISOString() };
  }

  // ── تسجيل الانصراف اليدوي ──
  async checkOut(tenantId: string, employeeId: string) {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendanceRecord.findFirst({
      where: { tenantId, employeeId, date: { gte: today } },
    });
    if (!record?.checkIn) throw new BadRequestException('سجّل حضورك أولاً');
    if (record.checkOut) throw new BadRequestException('تم تسجيل الانصراف مسبقاً');

    const worked = Math.round((now.getTime() - record.checkIn.getTime()) / 60000);
    await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { checkOut: now, workedMinutes: worked },
    });
    return { success: true, time: now.toISOString(), workedMinutes: worked };
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
