import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OtherRequestType, RequestStatus, ApprovalChain } from '@prisma/client';

export class CreateOtherRequestDto {
  @IsEnum(OtherRequestType)
  type: OtherRequestType;

  @IsOptional() @IsString()
  details?: string;

  @IsOptional() @IsString()
  fromTime?: string;

  @IsOptional() @IsString()
  toTime?: string;

  @IsOptional() @IsNumber()
  copies?: number;
}

export class UpdateOtherRequestDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional() @IsString()
  adminNote?: string;
}

export class UpsertOtherRequestConfigDto {
  @IsEnum(OtherRequestType)
  type: OtherRequestType;

  @IsEnum(ApprovalChain)
  approvalChain: ApprovalChain;

  @IsOptional() @IsString()
  approverCode?: string;
}

@Injectable()
export class OtherRequestsService {
  constructor(private prisma: PrismaService) {}

  // ── Config ──────────────────────────────────────────

  async getConfigs(tenantId: string) {
    const configs = await this.prisma.otherRequestConfig.findMany({ where: { tenantId } });
    // return all types with defaults for unconfigured ones
    const allTypes: OtherRequestType[] = ['permission', 'mission', 'advance', 'hr_letter',
      'experience_letter', 'mobile_line', 'salary_certificate', 'bank_letter', 'data_change', 'other'];
    return allTypes.map(type => {
      const cfg = configs.find(c => c.type === type);
      return cfg ?? { type, approvalChain: 'manager_then_hr' as ApprovalChain, approverCode: null };
    });
  }

  async upsertConfig(tenantId: string, dto: UpsertOtherRequestConfigDto) {
    if (dto.approvalChain === 'specific_person' && !dto.approverCode) {
      throw new BadRequestException('يجب تحديد كود الموظف المسؤول');
    }
    return this.prisma.otherRequestConfig.upsert({
      where: { tenantId_type: { tenantId, type: dto.type } },
      update: { approvalChain: dto.approvalChain, approverCode: dto.approverCode ?? null },
      create: { tenantId, type: dto.type, approvalChain: dto.approvalChain, approverCode: dto.approverCode ?? null },
    });
  }

  // ── Requests ─────────────────────────────────────────

  async create(tenantId: string, employeeId: string, dto: CreateOtherRequestDto) {
    return this.prisma.otherRequest.create({
      data: {
        tenantId, employeeId,
        type: dto.type,
        details: dto.details,
        fromTime: dto.fromTime,
        toTime: dto.toTime,
        copies: dto.copies ?? 1,
        status: 'submitted',
      },
      include: { employee: { select: { fullName: true, employeeCode: true } } },
    });
  }

  async getMyRequests(employeeId: string) {
    return this.prisma.otherRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllRequests(tenantId: string, status?: RequestStatus, type?: OtherRequestType) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (type)   where.type   = type;
    return this.prisma.otherRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } },
        },
      },
    });
  }

  // طلبات انتظار الموافقة للمدير (status=submitted وسلسلة تمر بالمدير)
  async getPendingForManager(managerId: string, tenantId: string) {
    const team = await this.prisma.employee.findMany({
      where: { directManagerId: managerId, tenantId, status: 'active' },
      select: { id: true },
    });
    const teamIds = team.map(e => e.id);
    if (teamIds.length === 0) return [];

    const configs = await this.prisma.otherRequestConfig.findMany({ where: { tenantId } });
    const managerTypes = ['permission', 'mission', 'advance', 'hr_letter',
      'experience_letter', 'mobile_line', 'salary_certificate', 'bank_letter', 'data_change', 'other']
      .filter(t => {
        const cfg = configs.find(c => c.type === t);
        const chain = cfg?.approvalChain ?? 'manager_then_hr';
        return chain === 'manager_then_hr';
      }) as OtherRequestType[];

    return this.prisma.otherRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: teamIds },
        status: 'submitted',
        type: { in: managerTypes },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, jobTitle: { select: { name: true } } } },
      },
    });
  }

  async managerApprove(tenantId: string, id: string, managerId: string) {
    const req = await this.prisma.otherRequest.findFirst({
      where: { id, tenantId, status: 'submitted' },
      include: { employee: { select: { directManagerId: true } } },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود أو لم يعد في انتظار موافقتك');
    if (req.employee.directManagerId !== managerId) throw new ForbiddenException('لست مدير هذا الموظف');

    const cfg = await this.prisma.otherRequestConfig.findUnique({
      where: { tenantId_type: { tenantId, type: req.type } },
    });
    const chain = cfg?.approvalChain ?? 'manager_then_hr';

    // إذا كانت السلسلة manager_then_hr → ننقل لـ in_review (انتظار HR)
    // غير ذلك لا يُفترض أن يصل المدير هنا
    const newStatus: RequestStatus = chain === 'manager_then_hr' ? 'in_review' : 'approved';
    return this.prisma.otherRequest.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async managerReject(tenantId: string, id: string, managerId: string, note?: string) {
    const req = await this.prisma.otherRequest.findFirst({
      where: { id, tenantId, status: 'submitted' },
      include: { employee: { select: { directManagerId: true } } },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (req.employee.directManagerId !== managerId) throw new ForbiddenException('لست مدير هذا الموظف');
    return this.prisma.otherRequest.update({
      where: { id },
      data: { status: 'rejected', adminNote: note },
    });
  }

  // طلبات انتظار الموافقة للـ HR
  async getPendingForHR(tenantId: string) {
    const configs = await this.prisma.otherRequestConfig.findMany({ where: { tenantId } });

    // اجمع الطلبات التي تنتظر HR:
    // - manager_then_hr: status = in_review
    // - hr_only: status = submitted
    const hrOnlyTypes = ['permission', 'mission', 'advance', 'hr_letter',
      'experience_letter', 'mobile_line', 'salary_certificate', 'bank_letter', 'data_change', 'other']
      .filter(t => {
        const cfg = configs.find(c => c.type === t);
        return (cfg?.approvalChain ?? 'manager_then_hr') === 'hr_only';
      }) as OtherRequestType[];

    const [afterManager, hrOnly] = await Promise.all([
      this.prisma.otherRequest.findMany({
        where: { tenantId, status: 'in_review' },
        orderBy: { createdAt: 'asc' },
        include: { employee: { select: { id: true, fullName: true, employeeCode: true, jobTitle: { select: { name: true } } } } },
      }),
      hrOnlyTypes.length > 0
        ? this.prisma.otherRequest.findMany({
            where: { tenantId, status: 'submitted', type: { in: hrOnlyTypes } },
            orderBy: { createdAt: 'asc' },
            include: { employee: { select: { id: true, fullName: true, employeeCode: true, jobTitle: { select: { name: true } } } } },
          })
        : Promise.resolve([]),
    ]);

    return [...afterManager, ...hrOnly];
  }

  async processRequest(tenantId: string, id: string, dto: UpdateOtherRequestDto) {
    const req = await this.prisma.otherRequest.findFirst({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    return this.prisma.otherRequest.update({
      where: { id },
      data: { status: dto.status, adminNote: dto.adminNote },
    });
  }

  async cancelRequest(tenantId: string, id: string, employeeId: string) {
    const req = await this.prisma.otherRequest.findFirst({ where: { id, tenantId, employeeId } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (!['submitted', 'in_review'].includes(req.status)) throw new ForbiddenException('لا يمكن إلغاء هذا الطلب');
    return this.prisma.otherRequest.update({ where: { id }, data: { status: 'cancelled' } });
  }
}
