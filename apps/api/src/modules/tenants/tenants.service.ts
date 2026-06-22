import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantFilterDto,
} from './dto/tenant.dto';
import { addDays } from 'date-fns';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(dto: CreateTenantDto) {
    // Check email not used in another tenant
    const existingEmployee = await this.prisma.employee.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existingEmployee) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const passwordHash = await this.authService.hashPassword(dto.adminPassword);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          type: dto.type,
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor,
          secondaryColor: dto.secondaryColor,
          maxEmployees: dto.maxEmployees,
          subscriptionPlan: dto.subscriptionPlan,
          subscriptionStart: dto.subscriptionStart
            ? new Date(dto.subscriptionStart)
            : new Date(),
          subscriptionEnd: dto.subscriptionEnd
            ? new Date(dto.subscriptionEnd)
            : undefined,
          timezone: dto.timezone ?? 'Africa/Cairo',
          status: 'trial',
        },
      });

      // Create first HR Admin employee
      const admin = await tx.employee.create({
        data: {
          tenantId: newTenant.id,
          employeeCode: 'ADMIN001',
          fullName: dto.adminName,
          email: dto.adminEmail,
          phone: dto.adminPhone,
          passwordHash,
          status: 'active',
          roles: {
            create: [{ role: 'hr_admin' }],
          },
        },
      });

      return { ...newTenant, adminEmployee: admin };
    });

    return tenant;
  }

  async findAll(filter: TenantFilterDto) {
    const where: any = {};

    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }
    if (filter.expiringInDays) {
      const cutoffDate = addDays(new Date(), filter.expiringInDays);
      where.subscriptionEnd = { lte: cutoffDate, gte: new Date() };
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { employees: { where: { status: 'active' } } } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      data: tenants.map((t) => ({
        ...t,
        activeEmployees: t._count.employees,
        isExpiringSoon:
          t.subscriptionEnd &&
          t.subscriptionEnd <= addDays(new Date(), 30) &&
          t.subscriptionEnd >= new Date(),
      })),
      total,
    };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: { where: { status: 'active' } },
            departments: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('الشركة غير موجودة');

    return {
      ...tenant,
      activeEmployees: tenant._count.employees,
      departments: tenant._count.departments,
    };
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        subscriptionEnd: dto.subscriptionEnd
          ? new Date(dto.subscriptionEnd)
          : undefined,
      },
    });
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { status: 'suspended' },
    });
  }

  async activate(id: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { status: 'active' },
    });
  }

  async getUsage(id: string) {
    const tenant = await this.findOne(id);

    const [activeEmployees, departments, leaveRequests, auditLogs] =
      await Promise.all([
        this.prisma.employee.count({
          where: { tenantId: id, status: 'active' },
        }),
        this.prisma.department.count({ where: { tenantId: id } }),
        this.prisma.leaveRequest.count({ where: { tenantId: id } }),
        this.prisma.auditLog.findMany({
          where: { tenantId: id },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    return {
      tenant,
      usage: {
        activeEmployees,
        maxEmployees: tenant.maxEmployees,
        utilizationPercent: Math.round((activeEmployees / tenant.maxEmployees) * 100),
        departments,
        totalLeaveRequests: leaveRequests,
      },
      recentAuditLogs: auditLogs,
    };
  }

  async softDelete(id: string) {
    // Soft delete: suspend + mark for deletion
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { status: 'suspended' },
    });
  }
}
