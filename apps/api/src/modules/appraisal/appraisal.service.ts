import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateAppraisalTemplateDto, CreateAppraisalCycleDto,
  SubmitAppraisalDto, AppraisalFilterDto,
} from './dto/appraisal.dto';
import { EvaluatorType } from '@prisma/client';

@Injectable()
export class AppraisalService {
  constructor(private prisma: PrismaService) {}

  // ── Templates ──
  async createTemplate(tenantId: string, dto: CreateAppraisalTemplateDto) {
    return this.prisma.appraisalTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        cycleType: dto.cycleType,
        jobTitleId: dto.jobTitleId,
        sections: {
          create: dto.sections.map((s) => ({
            sectionType: s.sectionType,
            weight: s.weight,
            criteria: {
              create: s.criteria.map((c) => ({
                criterionName: c.criterionName,
                weight: c.weight,
              })),
            },
          })),
        },
      },
      include: { sections: { include: { criteria: true } } },
    });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.appraisalTemplate.findMany({
      where: { tenantId },
      include: { sections: { include: { criteria: true } } },
    });
  }

  // ── Cycles ──
  async createCycle(tenantId: string, dto: CreateAppraisalCycleDto) {
    const template = await this.prisma.appraisalTemplate.findFirst({ where: { id: dto.templateId, tenantId } });
    if (!template) throw new NotFoundException('القالب غير موجود');

    const cycle = await this.prisma.appraisalCycle.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: 'not_started',
      },
    });

    // Generate appraisals for targeted employees
    await this.generateAppraisals(tenantId, cycle.id, dto);

    return cycle;
  }

  private async generateAppraisals(tenantId: string, cycleId: string, dto: CreateAppraisalCycleDto) {
    const where: any = { tenantId, status: 'active' };
    if (dto.targetEmployeeIds?.length) {
      where.id = { in: dto.targetEmployeeIds };
    } else if (dto.targetDepartmentIds?.length) {
      where.departmentId = { in: dto.targetDepartmentIds };
    }

    const employees = await this.prisma.employee.findMany({ where, select: { id: true } });
    if (!employees.length) return;

    await this.prisma.employeeAppraisal.createMany({
      data: employees.map((e) => ({
        cycleId,
        employeeId: e.id,
        templateId: dto.templateId,
        status: 'not_started',
      })),
      skipDuplicates: true,
    });
  }

  async getCycles(tenantId: string) {
    return this.prisma.appraisalCycle.findMany({
      where: { tenantId },
      include: { _count: { select: { appraisals: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  // ── Employee Appraisals ──
  async getMyAppraisals(tenantId: string, employeeId: string) {
    return this.prisma.employeeAppraisal.findMany({
      where: { employeeId, cycle: { tenantId } },
      include: {
        cycle: { select: { id: true, name: true, startDate: true, endDate: true } },
        template: { select: { id: true, name: true } },
        criteriaScores: { include: { criterion: { select: { criterionName: true, weight: true } } } },
      },
    });
  }

  async getAllAppraisals(tenantId: string, filter: AppraisalFilterDto) {
    const { status, cycleId, departmentId, page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;
    const where: any = { cycle: { tenantId } };
    if (status) where.status = status;
    if (cycleId) where.cycleId = cycleId;
    if (departmentId) where.employee = { departmentId };

    const [appraisals, total] = await Promise.all([
      this.prisma.employeeAppraisal.findMany({
        where, skip, take: +limit,
        include: {
          employee: {
            select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } },
          },
          cycle: { select: { name: true } },
        },
      }),
      this.prisma.employeeAppraisal.count({ where }),
    ]);
    return { data: appraisals, total, page: +page, limit: +limit };
  }

  async submitSelfAssessment(tenantId: string, appraisalId: string, employeeId: string, dto: SubmitAppraisalDto) {
    const appraisal = await this.prisma.employeeAppraisal.findFirst({
      where: { id: appraisalId, employeeId, cycle: { tenantId } },
    });
    if (!appraisal) throw new NotFoundException('التقييم غير موجود');

    await this.upsertScores(appraisalId, dto, 'self');
    const avg = this.avgScore(dto);
    return this.prisma.employeeAppraisal.update({
      where: { id: appraisalId },
      data: { status: 'in_progress', selfScore: avg },
    });
  }

  async submitManagerAssessment(tenantId: string, appraisalId: string, managerId: string, dto: SubmitAppraisalDto) {
    const appraisal = await this.prisma.employeeAppraisal.findFirst({
      where: { id: appraisalId, cycle: { tenantId } },
      include: { employee: { select: { directManagerId: true } } },
    });
    if (!appraisal) throw new NotFoundException('التقييم غير موجود');
    if (appraisal.employee.directManagerId !== managerId)
      throw new BadRequestException('لست المدير المباشر لهذا الموظف');

    await this.upsertScores(appraisalId, dto, 'manager');
    const avg = this.avgScore(dto);
    return this.prisma.employeeAppraisal.update({
      where: { id: appraisalId },
      data: { managerId, managerScore: avg },
    });
  }

  async finalizeAppraisal(tenantId: string, appraisalId: string) {
    const appraisal = await this.prisma.employeeAppraisal.findFirst({
      where: { id: appraisalId, cycle: { tenantId } },
    });
    if (!appraisal) throw new NotFoundException('التقييم غير موجود');

    const finalScore = Number(appraisal.managerScore ?? appraisal.selfScore ?? 0);
    return this.prisma.employeeAppraisal.update({
      where: { id: appraisalId },
      data: { status: 'completed', finalScore },
    });
  }

  private async upsertScores(employeeAppraisalId: string, dto: SubmitAppraisalDto, evaluatorType: EvaluatorType) {
    for (const s of dto.scores) {
      await this.prisma.appraisalCriterionScore.upsert({
        where: { employeeAppraisalId_criterionId_evaluatorType: { employeeAppraisalId, criterionId: s.criterionId, evaluatorType } },
        create: { employeeAppraisalId, criterionId: s.criterionId, evaluatorType, score: s.score, comment: s.comment },
        update: { score: s.score, comment: s.comment },
      });
    }
  }

  private avgScore(dto: SubmitAppraisalDto): number {
    if (!dto.scores.length) return 0;
    return dto.scores.reduce((s, c) => s + c.score, 0) / dto.scores.length;
  }

  // ── Bell Curve ──
  async getBellCurve(tenantId: string, cycleId: string) {
    const appraisals = await this.prisma.employeeAppraisal.findMany({
      where: { cycleId, status: 'completed', finalScore: { not: null }, cycle: { tenantId } },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } } },
      },
    });

    if (!appraisals.length) return { cycleId, distribution: [], employees: [] };

    const scores = appraisals.map((a) => Number(a.finalScore));
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const bands = [
      { label: 'Exceptional', minZ: 1.5 },
      { label: 'High', minZ: 0.5 },
      { label: 'Average', minZ: -0.5 },
      { label: 'Low', minZ: -1.5 },
      { label: 'Under-performer', minZ: -Infinity },
    ];

    const distribution: Record<string, number> = Object.fromEntries(bands.map((b) => [b.label, 0]));

    const employeeRatings = appraisals.map((a) => {
      const score = Number(a.finalScore);
      const z = stdDev > 0 ? (score - avg) / stdDev : 0;
      const band = bands.find((b) => z >= b.minZ)?.label ?? 'Average';
      distribution[band]++;
      return { employee: a.employee, finalScore: score, band };
    });

    return {
      cycleId, avg, stdDev,
      distribution: Object.entries(distribution).map(([label, count]) => ({ label, count })),
      employees: employeeRatings,
    };
  }

  async getAppraisalDetails(tenantId: string, id: string, employeeId: string) {
    const appraisal = await this.prisma.employeeAppraisal.findFirst({
      where: { id, employeeId, cycle: { tenantId } },
      include: {
        cycle:  { select: { id: true, name: true, startDate: true, endDate: true, status: true } },
        template: {
          include: {
            sections: {
              include: { criteria: { select: { id: true, criterionName: true, weight: true } } },
              orderBy: { sectionType: 'asc' },
            },
          },
        },
        criteriaScores: {
          include: { criterion: { select: { id: true, criterionName: true, weight: true } } },
          where: { evaluatorType: 'self' },
        },
      },
    });
    if (!appraisal) throw new NotFoundException('التقييم غير موجود');
    return appraisal;
  }
}
