import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // ── Public Holidays ──

  async getHolidays(tenantId: string) {
    return this.prisma.publicHoliday.findMany({
      where: { tenantId },
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(tenantId: string, dto: { name: string; date: string; isRecurring?: boolean }) {
    return this.prisma.publicHoliday.create({
      data: { tenantId, name: dto.name, date: new Date(dto.date), isRecurring: dto.isRecurring ?? false },
    });
  }

  async deleteHoliday(tenantId: string, id: string) {
    await this.prisma.publicHoliday.findFirstOrThrow({ where: { id, tenantId } });
    return this.prisma.publicHoliday.delete({ where: { id } });
  }

  // ── Work Hours Settings ──

  async getWorkHours(tenantId: string) {
    const settings = await this.prisma.workHoursSettings.findUnique({ where: { tenantId } });
    return settings ?? { tenantId, workDays: [0, 1, 2, 3, 4], startTime: '09:00', endTime: '17:00', lateAfterMins: 15 };
  }

  async upsertWorkHours(tenantId: string, dto: { workDays?: number[]; startTime?: string; endTime?: string; lateAfterMins?: number }) {
    return this.prisma.workHoursSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...dto },
      update: { ...dto },
    });
  }
}
