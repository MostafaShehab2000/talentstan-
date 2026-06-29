import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OtherRequestType, RequestStatus } from '@prisma/client';

export class CreateOtherRequestDto {
  @IsEnum(OtherRequestType)
  type: OtherRequestType;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  fromTime?: string;

  @IsOptional()
  @IsString()
  toTime?: string;

  @IsOptional()
  @IsNumber()
  copies?: number;
}

export class UpdateOtherRequestDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

@Injectable()
export class OtherRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, employeeId: string, dto: CreateOtherRequestDto) {
    return this.prisma.otherRequest.create({
      data: {
        tenantId,
        employeeId,
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

  async getPendingForManager(managerId: string, tenantId: string) {
    const team = await this.prisma.employee.findMany({
      where: { directManagerId: managerId, tenantId, status: 'active' },
      select: { id: true },
    });
    const teamIds = team.map((e) => e.id);
    return this.prisma.otherRequest.findMany({
      where: {
        tenantId,
        employeeId: { in: teamIds },
        status: 'submitted',
        type: { in: ['permission', 'mission'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
      },
    });
  }

  async managerApprove(tenantId: string, id: string, managerId: string) {
    const req = await this.prisma.otherRequest.findFirst({
      where: { id, tenantId, status: 'submitted' },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    return this.prisma.otherRequest.update({
      where: { id },
      data: { status: 'approved' },
    });
  }

  async managerReject(tenantId: string, id: string, managerId: string, note?: string) {
    const req = await this.prisma.otherRequest.findFirst({
      where: { id, tenantId, status: 'submitted' },
    });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    return this.prisma.otherRequest.update({
      where: { id },
      data: { status: 'rejected', adminNote: note },
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
          select: {
            id: true, fullName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
    });
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
    if (req.status !== 'submitted') throw new ForbiddenException('لا يمكن إلغاء هذا الطلب');

    return this.prisma.otherRequest.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
