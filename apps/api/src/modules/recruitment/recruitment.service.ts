import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { CreateRecruitmentRequestDto, RecruitmentFilterDto } from './dto/recruitment.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    private prisma: PrismaService,
    private workflowService: WorkflowService,
  ) {}

  async create(tenantId: string, requestedById: string, dto: CreateRecruitmentRequestDto) {
    const dept = await this.prisma.department.findFirst({ where: { id: dto.departmentId, tenantId } });
    if (!dept) throw new NotFoundException('القسم غير موجود');

    const request = await this.prisma.recruitmentRequest.create({
      data: {
        tenantId,
        requestedById,
        departmentId: dto.departmentId,
        jobTitleId: dto.jobTitleId,
        newJobTitleName: dto.newJobTitleName,
        jobDescriptionId: dto.jobDescriptionId,
        vacanciesCount: dto.vacanciesCount ?? 1,
        employmentType: dto.employmentType,
        reason: dto.reason,
        proposedSalaryMin: dto.proposedSalaryMin,
        proposedSalaryMax: dto.proposedSalaryMax,
        targetStartDate: dto.targetStartDate ? new Date(dto.targetStartDate) : null,
        attachmentUrl: dto.attachmentUrl,
        status: 'submitted',
      },
      include: {
        jobTitle: true,
        requestedBy: { select: { id: true, fullName: true, employeeCode: true } },
      },
    });

    if (dto.workflowTemplateId) {
      const wf = await this.workflowService.startWorkflow({
        tenantId,
        workflowTemplateId: dto.workflowTemplateId,
        relatedEntityType: 'recruitment_request',
        relatedEntityId: request.id,
        initiatorId: requestedById,
      });
      await this.prisma.recruitmentRequest.update({
        where: { id: request.id },
        data: { workflowInstanceId: wf.id, status: 'in_review' },
      });
      return { ...request, workflowInstanceId: wf.id, status: 'in_review' };
    }

    return request;
  }

  async findAll(tenantId: string, filter: RecruitmentFilterDto) {
    const { status, departmentId, employmentType, page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (employmentType) where.employmentType = employmentType;

    const [data, total] = await Promise.all([
      this.prisma.recruitmentRequest.findMany({
        where, skip, take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, fullName: true, profilePhotoUrl: true } },
          jobTitle: true,
          jobDescription: { select: { id: true, jobPurpose: true } },
          workflowInstance: { include: { actionsLog: { orderBy: { actedAt: 'asc' } } } },
        },
      }),
      this.prisma.recruitmentRequest.count({ where }),
    ]);
    return { data, total, page: +page, limit: +limit };
  }

  async findOne(tenantId: string, id: string) {
    const req = await this.prisma.recruitmentRequest.findFirst({
      where: { id, tenantId },
      include: {
        requestedBy: { select: { id: true, fullName: true, profilePhotoUrl: true, department: true } },
        jobTitle: true,
        jobDescription: true,
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
    if (!req) throw new NotFoundException('طلب التوظيف غير موجود');
    return req;
  }

  async cancel(tenantId: string, id: string, actorId: string) {
    const req = await this.prisma.recruitmentRequest.findFirst({ where: { id, tenantId, requestedById: actorId } });
    if (!req) throw new NotFoundException('الطلب غير موجود');
    if (!['submitted', 'in_review', 'returned'].includes(req.status))
      throw new BadRequestException('لا يمكن إلغاء هذا الطلب');
    if (req.workflowInstanceId)
      await this.workflowService.cancel(req.workflowInstanceId, tenantId, actorId);
    return this.prisma.recruitmentRequest.update({ where: { id }, data: { status: 'cancelled' } });
  }

  async getMyRequests(requestedById: string, tenantId: string) {
    return this.prisma.recruitmentRequest.findMany({
      where: { requestedById, tenantId },
      orderBy: { createdAt: 'desc' },
      include: { jobTitle: true, workflowInstance: { select: { status: true, currentStep: true } } },
    });
  }

  async getReport(tenantId: string) {
    const [total, byStatus, byDept] = await Promise.all([
      this.prisma.recruitmentRequest.count({ where: { tenantId } }),
      this.prisma.recruitmentRequest.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      this.prisma.recruitmentRequest.groupBy({ by: ['departmentId'], where: { tenantId, status: 'approved' }, _count: true }),
    ]);
    return { total, byStatus, byDept };
  }
}
