import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateJobTitleDto, UpdateJobTitleDto } from './dto/job-title.dto';

@Injectable()
export class JobTitlesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateJobTitleDto) {
    return this.prisma.jobTitle.create({
      data: { tenantId, ...dto },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.jobTitle.findMany({
      where: { tenantId },
      orderBy: [{ gradeLevel: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { employees: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const jt = await this.prisma.jobTitle.findFirst({
      where: { id, tenantId },
      include: { employees: { select: { id: true, fullName: true, employeeCode: true } } },
    });
    if (!jt) throw new NotFoundException('المسمى الوظيفي غير موجود');
    return jt;
  }

  async update(tenantId: string, id: string, dto: UpdateJobTitleDto) {
    await this.findOne(tenantId, id);
    return this.prisma.jobTitle.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.jobTitle.delete({ where: { id } });
  }
}
