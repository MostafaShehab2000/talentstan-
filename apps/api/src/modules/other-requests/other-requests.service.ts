import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OtherRequestType, RequestStatus } from '@prisma/client';

export class CreateOtherRequestDto {
  type: OtherRequestType;
  details?: string;
  copies?: number;
}

export class UpdateOtherRequestDto {
  status: RequestStatus;
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
