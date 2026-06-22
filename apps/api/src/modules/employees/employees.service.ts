import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({
      where: { tenantId, employeeCode: dto.employeeCode },
    });
    if (existing) {
      throw new ConflictException('كود الموظف مستخدم بالفعل');
    }

    // Check tenant capacity
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const activeCount = await this.prisma.employee.count({
      where: { tenantId, status: 'active' },
    });
    if (tenant && activeCount >= tenant.maxEmployees) {
      throw new ConflictException('تجاوزت الحد الأقصى لعدد الموظفين في باقتك');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);
    const roles = dto.roles ?? ['employee'];

    return this.prisma.employee.create({
      data: {
        tenantId,
        employeeCode: dto.employeeCode,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        departmentId: dto.departmentId,
        jobTitleId: dto.jobTitleId,
        directManagerId: dto.directManagerId,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        isManager: dto.isManager ?? false,
        profilePhotoUrl: dto.profilePhotoUrl,
        roles: { create: roles.map((role) => ({ role })) },
      },
      include: {
        roles: true,
        department: true,
        jobTitle: true,
        directManager: { select: { id: true, fullName: true, employeeCode: true } },
      },
    });
  }

  async findAll(
    tenantId: string,
    params: {
      search?: string;
      departmentId?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { search, departmentId, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          phone: true,
          isManager: true,
          status: true,
          profilePhotoUrl: true,
          hireDate: true,
          department: { select: { id: true, name: true } },
          jobTitle: { select: { id: true, title: true, gradeLevel: true } },
          directManager: { select: { id: true, fullName: true } },
          roles: true,
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data: employees, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        roles: true,
        department: true,
        jobTitle: true,
        directManager: { select: { id: true, fullName: true, employeeCode: true } },
        subordinates: {
          select: { id: true, fullName: true, employeeCode: true, jobTitle: true },
        },
      },
    });

    if (!employee) throw new NotFoundException('الموظف غير موجود');
    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(tenantId, id);

    const { roles, hireDate, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (roles) {
        await tx.employeeRoleAssignment.deleteMany({ where: { employeeId: id } });
        await tx.employeeRoleAssignment.createMany({
          data: roles.map((role) => ({ employeeId: id, role })),
        });
      }

      return tx.employee.update({
        where: { id },
        data: {
          ...rest,
          hireDate: hireDate ? new Date(hireDate) : undefined,
        },
        include: { roles: true, department: true, jobTitle: true },
      });
    });
  }

  async getTeam(tenantId: string, managerId: string) {
    return this.prisma.employee.findMany({
      where: { tenantId, directManagerId: managerId, status: 'active' },
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        profilePhotoUrl: true,
        jobTitle: true,
        department: true,
      },
    });
  }

  async getOrgChart(tenantId: string) {
    const departments = await this.prisma.department.findMany({
      where: { tenantId },
      include: {
        headEmployee: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        children: true,
        employees: {
          where: { status: 'active' },
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            profilePhotoUrl: true,
            isManager: true,
            jobTitle: true,
          },
        },
      },
    });

    // Build tree structure
    const buildTree = (parentId: string | null): any[] =>
      departments
        .filter((d) => d.parentDepartmentId === parentId)
        .map((d) => ({ ...d, children: buildTree(d.id) }));

    return buildTree(null);
  }

  async updateFcmToken(id: string, fcmToken: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { fcmToken },
      select: { id: true },
    });
  }
}
