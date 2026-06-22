import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: { tenantId, ...dto },
      include: {
        parentDepartment: true,
        headEmployee: { select: { id: true, fullName: true } },
      },
    });
  }

  async findAll(tenantId: string) {
    const depts = await this.prisma.department.findMany({
      where: { tenantId },
      include: {
        headEmployee: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        _count: { select: { employees: { where: { status: 'active' } } } },
      },
      orderBy: { name: 'asc' },
    });

    const buildTree = (parentId: string | null): any[] =>
      depts
        .filter((d) => d.parentDepartmentId === parentId)
        .map((d) => ({
          ...d,
          activeEmployees: d._count.employees,
          children: buildTree(d.id),
        }));

    return buildTree(null);
  }

  async findOne(tenantId: string, id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, tenantId },
      include: {
        parentDepartment: true,
        children: true,
        headEmployee: { select: { id: true, fullName: true } },
        employees: {
          where: { status: 'active' },
          select: {
            id: true,
            fullName: true,
            employeeCode: true,
            profilePhotoUrl: true,
            jobTitle: true,
            isManager: true,
          },
        },
      },
    });

    if (!dept) throw new NotFoundException('القسم غير موجود');
    return dept;
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    await this.findOne(tenantId, id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: { parentDepartment: true, headEmployee: { select: { id: true, fullName: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.department.delete({ where: { id } });
  }
}
