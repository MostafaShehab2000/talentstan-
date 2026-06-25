import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FcmService } from '../../common/notifications/fcm.service';
import { CreatePayslipDto, PayslipFilterDto } from './dto/payslip.dto';

const MONTHS = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

@Injectable()
export class PayslipService {
  constructor(private prisma: PrismaService, private fcm: FcmService) {}

  async uploadPayslip(tenantId: string, uploadedById: string, dto: CreatePayslipDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, tenantId } });
    if (!employee) throw new NotFoundException('الموظف غير موجود');

    const payslip = await this.prisma.payslip.upsert({
      where: { employeeId_month_year: { employeeId: dto.employeeId, month: dto.month, year: dto.year } },
      create: {
        tenantId,
        employeeId: dto.employeeId,
        month: dto.month,
        year: dto.year,
        basicSalary: dto.basicSalary,
        allowances: dto.allowances ?? {},
        deductions: dto.deductions ?? {},
        netSalary: dto.netSalary,
        pdfUrl: dto.pdfUrl,
        uploadedById,
      },
      update: {
        basicSalary: dto.basicSalary,
        allowances: dto.allowances ?? {},
        deductions: dto.deductions ?? {},
        netSalary: dto.netSalary,
        pdfUrl: dto.pdfUrl,
        uploadedById,
      },
    });

    if (employee.fcmToken) {
      const monthName = MONTHS[dto.month] ?? '';
      await this.fcm.send(
        employee.fcmToken,
        '💰 كشف راتب جديد',
        `تم رفع كشف راتب ${monthName} ${dto.year} — صافي: ${dto.netSalary} جنيه`,
      );
    }
    return payslip;
  }

  async bulkUpload(tenantId: string, uploadedById: string, payslips: CreatePayslipDto[]) {
    const results = await Promise.allSettled(
      payslips.map((dto) => this.uploadPayslip(tenantId, uploadedById, dto)),
    );
    return {
      succeeded: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      total: payslips.length,
    };
  }

  async getMyPayslips(tenantId: string, employeeId: string, filter: PayslipFilterDto) {
    const { page = 1, limit = 12, year } = filter;
    const skip = (+page - 1) * +limit;
    const where: any = { tenantId, employeeId };
    if (year) where.year = +year;

    const [payslips, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where, skip, take: +limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      this.prisma.payslip.count({ where }),
    ]);
    return { data: payslips, total, page: +page };
  }

  async getPayslipById(tenantId: string, payslipId: string, actorId: string) {
    const payslip = await this.prisma.payslip.findFirst({
      where: { id: payslipId, tenantId },
      include: { employee: { select: { id: true, fullName: true, jobTitle: true } } },
    });
    if (!payslip) throw new NotFoundException('كشف الراتب غير موجود');

    if (payslip.employeeId !== actorId) {
      const actor = await this.prisma.employee.findFirst({
        where: { id: actorId, tenantId }, include: { roles: true },
      });
      const canView = actor?.roles.some((r) => ['hr_admin', 'super_admin'].includes(r.role));
      if (!canView) throw new ForbiddenException('لا يمكنك الاطلاع على كشف راتب موظف آخر');
    }

    await this.prisma.payslipAccessLog.create({
      data: { payslipId, viewedById: actorId },
    });

    return payslip;
  }

  async getAllPayslips(tenantId: string, filter: PayslipFilterDto) {
    const { employeeId, month, year, page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;
    const where: any = { tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = +month;
    if (year) where.year = +year;

    const [payslips, total] = await Promise.all([
      this.prisma.payslip.findMany({
        where, skip, take: +limit,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          employee: {
            select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } },
          },
        },
      }),
      this.prisma.payslip.count({ where }),
    ]);
    return { data: payslips, total, page: +page, limit: +limit };
  }

  async getPayrollSummary(tenantId: string, month: number, year: number) {
    const payslips = await this.prisma.payslip.findMany({
      where: { tenantId, month: +month, year: +year },
      select: { basicSalary: true, netSalary: true },
    });

    if (!payslips.length) return { month, year, count: 0, totalNet: 0 };

    return {
      month, year,
      count: payslips.length,
      totalBasic: payslips.reduce((s, p) => s + Number(p.basicSalary), 0),
      totalNet: payslips.reduce((s, p) => s + Number(p.netSalary), 0),
    };
  }
}
