import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSurveyDto, SubmitSurveyResponseDto } from './dto/survey.dto';

@Injectable()
export class SurveysService {
  constructor(private prisma: PrismaService) {}

  async createSurvey(tenantId: string, createdById: string, dto: CreateSurveyDto) {
    return this.prisma.survey.create({
      data: {
        tenantId, createdById,
        title: dto.title,
        description: dto.description,
        targetScope: (dto.targetScope as any) ?? 'company',
        targetDepartmentIds: dto.targetDepartmentIds ?? [],
        isAnonymous: dto.isAnonymous ?? false,
        startDate: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endDate: dto.endsAt ? new Date(dto.endsAt) : null,
        questions: {
          create: dto.questions.map((q, i) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options ?? [],
            displayOrder: q.orderIndex ?? i + 1,
          })),
        },
      },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  async getMySurveys(tenantId: string, employeeId: string) {
    const now = new Date();
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId }, select: { departmentId: true },
    });

    const surveys = await this.prisma.survey.findMany({
      where: {
        tenantId,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          {
            OR: [
              { targetScope: 'company' },
              { targetScope: 'department', targetDepartmentIds: { has: employee?.departmentId ?? '' } },
            ],
          },
        ],
      },
      include: {
        questions: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { responses: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const participatedSurveyIds = (
      await this.prisma.surveyParticipation.findMany({
        where: { employeeId, surveyId: { in: surveys.map((s) => s.id) } },
        select: { surveyId: true },
      })
    ).map((p) => p.surveyId);

    return surveys.map((s) => ({ ...s, hasParticipated: participatedSurveyIds.includes(s.id) }));
  }

  async getAllSurveys(tenantId: string) {
    return this.prisma.survey.findMany({
      where: { tenantId },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { responses: true, questions: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async getSurveyById(tenantId: string, surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, tenantId },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!survey) throw new NotFoundException('الاستطلاع غير موجود');
    return survey;
  }

  async submitResponse(tenantId: string, surveyId: string, employeeId: string, dto: SubmitSurveyResponseDto) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, tenantId },
      include: { questions: true },
    });
    if (!survey) throw new NotFoundException('الاستطلاع غير موجود');

    const now = new Date();
    if (survey.endDate && survey.endDate < now)
      throw new BadRequestException('انتهى وقت الاستطلاع');

    const alreadySubmitted = await this.prisma.surveyParticipation.findUnique({
      where: { surveyId_employeeId: { surveyId, employeeId } },
    });
    if (alreadySubmitted) throw new BadRequestException('لقد شاركت في هذا الاستطلاع من قبل');

    const response = await this.prisma.surveyResponse.create({
      data: {
        surveyId,
        answers: {
          create: dto.answers.map((a) => ({
            questionId: a.questionId,
            answerValue: a.answerText ?? (a.selectedOptions ? JSON.stringify(a.selectedOptions) : null) ?? (a.ratingValue?.toString() ?? null),
          })),
        },
      },
    });

    await this.prisma.surveyParticipation.create({
      data: { surveyId, employeeId, respondedAt: new Date() },
    });

    return response;
  }

  async getSurveyResults(tenantId: string, surveyId: string) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, tenantId },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!survey) throw new NotFoundException('الاستطلاع غير موجود');

    const totalResponses = await this.prisma.surveyResponse.count({ where: { surveyId } });
    const totalParticipants = await this.prisma.surveyParticipation.count({ where: { surveyId } });

    const questionAnalysis = await Promise.all(
      survey.questions.map(async (q) => {
        const answers = await this.prisma.surveyAnswer.findMany({
          where: { questionId: q.id },
          select: { answerValue: true },
        });
        return {
          questionId: q.id,
          questionText: q.questionText,
          type: q.questionType,
          totalAnswers: answers.filter((a) => a.answerValue).length,
          responses: answers.map((a) => a.answerValue),
        };
      }),
    );

    return { surveyId, title: survey.title, totalResponses, totalParticipants, questions: questionAnalysis };
  }

  async closeSurvey(tenantId: string, surveyId: string) {
    const survey = await this.prisma.survey.findFirst({ where: { id: surveyId, tenantId } });
    if (!survey) throw new NotFoundException('الاستطلاع غير موجود');
    // Mark ended by setting endDate to now
    return this.prisma.survey.update({ where: { id: surveyId }, data: { endDate: new Date() } });
  }
}
