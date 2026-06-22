import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  SetLeaveBalanceDto,
  AdjustLeaveBalanceDto,
} from './dto/leave-type.dto';
import {
  CreateLeaveRequestDto,
  LeaveRequestFilterDto,
} from './dto/leave-request.dto';
import { differenceInBusinessDays, differenceInMinutes, parse } from 'date-fns';

@Injectable()
export class LeaveService {
  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
  ) {}

  // ════════════════════════════════════
  // LEAVE TYPES (Admin)
  // ════════════════════════════════════

  async createLeaveType(tenantId: string, dto: CreateLeaveTypeDto) {
    return this.prisma.leaveType.create({
      data: { tenantId, ...dto },
      include: { workflowTemplate: true },
    });
  }

  async getLeaveTypes(tenantId: string) {
    return this.prisma.leaveType.findMany({
      where: { tenantId },
      include: { workflowTemplate: { select: { id: true, name: true } } },
      orderBy: { category: 'asc' },
    });
  }

  async updateLeaveType(tenantId: string, id: string, dto: UpdateLeaveTypeDto) {
    const lt = await this.prisma.leaveType.findFirst({ where: { id, tenantId } });
    if (!lt) throw new NotFoundException('نوع الإجازة غير موجود');
    return this.prisma.leaveType.update({ where: { id }, data: dto });
  }

  // ════════════════════════════════════
  // BALANCES
  // ════════════════════════════════════

  async getMyBalances(employeeId: string, year?: number) {
    const y = year ?? new Date().getFullYear();
    return this.prisma.employeeLeaveBalance.findMany({
      where: { employeeId, year: y },
      include: { leaveType: true },
    });
  }

  async setBalance(tenantId: string, dto: SetLeaveBalanceDto, actorId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId },
    });
    if (!emp) throw new NotFoundException('الموظف غير موجود');

    const balance = await this.prisma.employeeLeaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
      update: { entitled: dto.entitled },
      create: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        entitled: dto.entitled,
        used: 0,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: 'set_leave_balance',
        entityType: 'employee_leave_balance',
        entityId: balance.id,
        details: { employeeId: dto.employeeId, year: dto.year, entitled: dto.entitled },
      },
    });

    return balance;
  }

  async adjustBalance(
    tenantId: string,
    employeeId: string,
    leaveTypeId: string,
    dto: AdjustLeaveBalanceDto,
    actorId: string,
  ) {
    const year = new Date().getFullYear();
    const balance = await this.prisma.employeeLeaveBalance.findFirst({
      where: { employeeId, leaveTypeId, year },
    });
    if (!balance) throw new NotFoundException('رصيد الإجازة غير موجود');

    const newEntitled = Number(balance.entitled) + dto.adjustment;
    if (newEntitled < 0) throw new BadRequestException('الرصيد لا يمكن أن يكون سالبًا');

    const updated = await this.prisma.employeeLeaveBalance.update({
      where: { id: balance.id },
      data: { entitled: newEntitled },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        action: 'adjust_leave_balance',
        entityType: 'employee_leave_balance',
        entityId: balance.id,
        details: { employeeId, adjustment: dto.adjustment, reason: dto.reason },
      },
    });

    return updated;
  }

  async bulkSetBalances(tenantId: string, balances: SetLeaveBalanceDto[], actorId: string) {
    const results = await Promise.allSettled(
      balances.map((b) => this.setBalance(tenantId, b, actorId)),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { succeeded, failed };
  }

  // ════════════════════════════════════
  // LEAVE REQUESTS
  // ════════════════════════════════════

  async createRequest(
    tenantId: string,
    employeeId: string,
    dto: CreateLeaveRequestDto,
  ) {
    const leaveType = await this.prisma.leaveType.findFirst({
      where: { id: dto.leaveTypeId, tenantId },
    });
    if (!leaveType) throw new NotFoundException('نوع الإجازة غير موجود');

    const start = new Date(dto.startDate);
    let totalDays: number | null = null;
    let totalHours: number | null = null;

    // حساب المدة
    if (leaveType.category === 'permission' && dto.startTime && dto.endTime) {
      const startT = parse(dto.startTime, 'HH:mm', start);
      const endT = parse(dto.endTime, 'HH:mm', start);
      totalHours = differenceInMinutes(endT, startT) / 60;
      if (totalHours <= 0) throw new BadRequestException('وقت الانتهاء يجب أن يكون بعد وقت البدء');
    } else if (dto.endDate) {
      const end = new Date(dto.endDate);
      totalDays = differenceInBusinessDays(end, start) + 1;
      if (totalDays <= 0) throw new BadRequestException('تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء');
    } else {
      totalDays = 1;
    }

    // التحقق من حد الإشعار المسبق
    if (leaveType.advanceNoticeDays) {
      const today = new Date();
      const daysUntilLeave = differenceInBusinessDays(start, today);
      if (daysUntilLeave < leaveType.advanceNoticeDays) {
        throw new BadRequestException(
          `يجب التقديم قبل ${leaveType.advanceNoticeDays} أيام على الأقل`,
        );
      }
    }

    // التحقق من الرصيد
    if (leaveType.isBalanceBased && totalDays) {
      const balance = await this.prisma.employeeLeaveBalance.findFirst({
        where: {
          employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: start.getFullYear(),
        },
      });
      const remaining = balance
        ? Number(balance.entitled) - Number(balance.used)
        : 0;
      if (remaining < totalDays) {
        throw new BadRequestException(
          `رصيدك غير كافٍ. المتاح: ${remaining} يوم، المطلوب: ${totalDays} يوم`,
        );
      }
    }

    // التحقق من المرفق المطلوب
    if (leaveType.requiresAttachment && !dto.attachmentUrl) {
      throw new BadRequestException('يجب إرفاق مستند (مثلاً: تقرير طبي)');
    }

    // إنشاء الطلب
    const request = await this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: start,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        startTime: dto.startTime,
        endTime: dto.endTime,
        totalDays,
        totalHours,
        reason: dto.reason,
        attachmentUrl: dto.attachmentUrl,
        status: 'submitted',
      },
      include: { leaveType: true, employee: { select: { fullName: true } } },
    });

    // بدء الـ Workflow لو موجود
    if (leaveType.workflowTemplateId) {
      const wfInstance = await this.workflowService.startWorkflow({
        tenantId,
        workflowTemplateId: leaveType.workflowTemplateId,
        relatedEntityType: 'leave_request',
        relatedEntityId: request.id,
        initiatorId: employeeId,
      });

      await this.prisma.leaveRequest.update({
        where: { id: request.id },
        data: {
          workflowInstanceId: wfInstance.id,
          status: 'in_review',
        },
      });

      return { ...request, workflowInstanceId: wfInstance.id, status: 'in_review' };
    }

    return request;
  }

  async getMyRequests(employeeId: string, filter: LeaveRequestFilterDto) {
    const { status, leaveTypeId, from, to, page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;

    const where: any = { employeeId };
    if (status) where.status = status;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leaveType: true,
          workflowInstance: {
            include: { actionsLog: { orderBy: { actedAt: 'asc' } } },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data: requests, total, page: +page, limit: +limit };
  }

  async getAllRequests(tenantId: string, filter: LeaveRequestFilterDto) {
    const { status, leaveTypeId, employeeId, departmentId, from, to, page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (leaveTypeId) where.leaveTypeId = leaveTypeId;
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { departmentId };
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leaveType: true,
          employee: {
            select: {
              id: true,
              fullName: true,
              employeeCode: true,
              profilePhotoUrl: true,
              department: true,
            },
          },
          workflowInstance: {
            include: { actionsLog: { orderBy: { actedAt: 'asc' } } },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return { data: requests, total, page: +page, limit: +limit };
  }

  async getRequestById(tenantId: string, id: string) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: {
        leaveType: true,
        employee: { select: { id: true, fullName: true, employeeCode: true, profilePhotoUrl: true, department: true } },
        workflowInstance: {
          include: {
            actionsLog: {
              orderBy: { actedAt: 'asc' },
              include: { actor: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
            },
            workflowTemplate: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    return req;
  }

  async cancelRequest(tenantId: string, id: string, employeeId: string) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId, employeeId },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (!['submitted', 'in_review', 'returned'].includes(req.status)) {
      throw new BadRequestException('لا يمكن إلغاء طلب تمت معالجته');
    }

    if (req.workflowInstanceId) {
      await this.workflowService.cancel(req.workflowInstanceId, tenantId, employeeId);
    }

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  // ─── الطلبات المنتظرة اعتماد المدير ───
  async getPendingForManager(managerId: string, tenantId: string) {
    // جيب الموظفين التابعين للمدير
    const team = await this.prisma.employee.findMany({
      where: { directManagerId: managerId, tenantId, status: 'active' },
      select: { id: true },
    });
    const teamIds = team.map((e) => e.id);

    return this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: teamIds },
        status: { in: ['submitted', 'in_review'] },
      },
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true, fullName: true, employeeCode: true, profilePhotoUrl: true,
            leaveBalances: { where: { year: new Date().getFullYear() } },
          },
        },
        workflowInstance: {
          include: { actionsLog: { orderBy: { actedAt: 'asc' } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Team Calendar (للمدير) ───
  async getTeamCalendar(managerId: string, tenantId: string, month: number, year: number) {
    const team = await this.prisma.employee.findMany({
      where: { directManagerId: managerId, tenantId, status: 'active' },
      select: { id: true },
    });
    const teamIds = team.map((e) => e.id);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    return this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: teamIds },
        status: 'approved',
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, fullName: true, profilePhotoUrl: true } },
      },
    });
  }

  // ─── تقرير الإجازات (HR) ───
  async getLeaveReport(tenantId: string, filter: LeaveRequestFilterDto) {
    const where: any = { tenantId, status: 'approved' };
    if (filter.leaveTypeId) where.leaveTypeId = filter.leaveTypeId;
    if (filter.departmentId) where.employee = { departmentId: filter.departmentId };
    if (filter.from || filter.to) {
      where.startDate = {};
      if (filter.from) where.startDate.gte = new Date(filter.from);
      if (filter.to) where.startDate.lte = new Date(filter.to);
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true, fullName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // إجماليات
    const totalDays = requests.reduce((sum, r) => sum + Number(r.totalDays ?? 0), 0);
    const totalHours = requests.reduce((sum, r) => sum + Number(r.totalHours ?? 0), 0);

    return { data: requests, summary: { totalRequests: requests.length, totalDays, totalHours } };
  }

  // ─── تحديث رصيد الموظف بعد اعتماد الطلب (يُستدعى من Workflow callback) ───
  async onRequestApproved(requestId: string) {
    const req = await this.prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true },
    });
    if (!req || !req.leaveType.isBalanceBased) return;

    const year = req.startDate.getFullYear();
    const deduction = Number(req.totalDays ?? 0) || Number(req.totalHours ?? 0) / 8;

    await this.prisma.employeeLeaveBalance.updateMany({
      where: { employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year },
      data: { used: { increment: deduction } },
    });

    await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: 'approved' },
    });
  }
}
