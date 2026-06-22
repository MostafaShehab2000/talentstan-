import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  WorkflowModule,
  WorkflowStatus,
  WorkflowAction,
  ApproverType,
  EmployeeRole,
} from '@prisma/client';

export interface StartWorkflowOptions {
  tenantId: string;
  workflowTemplateId: string;
  relatedEntityType: string;
  relatedEntityId: string;
  initiatorId: string;
}

export interface ProcessActionOptions {
  workflowInstanceId: string;
  actorId: string;
  tenantId: string;
  action: WorkflowAction;
  comment?: string;
}

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  // ─── بدء instance جديد لأي طلب ───
  async startWorkflow(opts: StartWorkflowOptions) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: opts.workflowTemplateId, tenantId: opts.tenantId, isActive: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!template) throw new NotFoundException('قالب الـ Workflow غير موجود');
    if (!template.steps.length) throw new BadRequestException('قالب الـ Workflow لا يحتوي على خطوات');

    const instance = await this.prisma.workflowInstance.create({
      data: {
        tenantId: opts.tenantId,
        workflowTemplateId: opts.workflowTemplateId,
        relatedEntityType: opts.relatedEntityType,
        relatedEntityId: opts.relatedEntityId,
        currentStep: 1,
        status: 'in_review',
      },
    });

    // إرسال إشعار للمعتمد الأول
    await this.notifyCurrentApprover(instance.id, opts.tenantId, opts.initiatorId);

    return instance;
  }

  // ─── تنفيذ action (approve/reject/return/delegate) ───
  async processAction(opts: ProcessActionOptions) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: opts.workflowInstanceId, tenantId: opts.tenantId },
      include: {
        workflowTemplate: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    if (!instance) throw new NotFoundException('Workflow Instance غير موجود');
    if (instance.status !== 'in_review') {
      throw new BadRequestException('هذا الطلب لم يعد في انتظار الاعتماد');
    }

    const currentStepDef = instance.workflowTemplate?.steps.find(
      (s) => s.stepOrder === instance.currentStep,
    );
    if (!currentStepDef) throw new BadRequestException('خطوة الـ Workflow غير موجودة');

    // التحقق أن المستخدم هو المعتمد الصحيح
    await this.validateApprover(opts.actorId, opts.tenantId, currentStepDef);

    // تسجيل الـ action
    await this.prisma.workflowActionLog.create({
      data: {
        workflowInstanceId: instance.id,
        stepOrder: instance.currentStep,
        actorEmployeeId: opts.actorId,
        action: opts.action,
        comment: opts.comment,
      },
    });

    let newStatus: WorkflowStatus = 'in_review';
    let newStep = instance.currentStep;

    switch (opts.action) {
      case 'approve': {
        const nextStep = instance.workflowTemplate?.steps.find(
          (s) => s.stepOrder === instance.currentStep + 1,
        );
        if (nextStep) {
          newStep = instance.currentStep + 1;
          newStatus = 'in_review';
        } else {
          newStatus = 'approved';
        }
        break;
      }
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'return':
        newStatus = 'returned';
        break;
      case 'delegate':
        // تفويض - نفس الخطوة، بس المعتمد اتغيّر (يُعالَج في الـ Leave module)
        newStatus = 'in_review';
        break;
    }

    const updated = await this.prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { status: newStatus, currentStep: newStep },
    });

    // إشعار المعتمد التالي أو الموظف
    if (newStatus === 'in_review' && newStep > instance.currentStep) {
      await this.notifyCurrentApprover(instance.id, opts.tenantId, opts.actorId);
    }

    return { instance: updated, action: opts.action, finalStatus: newStatus };
  }

  // ─── التحقق من صلاحية المعتمد ───
  private async validateApprover(
    actorId: string,
    tenantId: string,
    stepDef: { approverType: ApproverType; approverReference: string | null },
  ) {
    const actor = await this.prisma.employee.findFirst({
      where: { id: actorId, tenantId, status: 'active' },
      include: { roles: true },
    });
    if (!actor) throw new ForbiddenException('المستخدم غير موجود');

    switch (stepDef.approverType) {
      case 'specific_role': {
        const hasRole = actor.roles.some(
          (r) => r.role === stepDef.approverReference,
        );
        if (!hasRole) throw new ForbiddenException('لا تملك صلاحية اعتماد هذا الطلب');
        break;
      }
      case 'specific_user': {
        if (actor.id !== stepDef.approverReference)
          throw new ForbiddenException('أنت لست المعتمد المخصص لهذه الخطوة');
        break;
      }
      case 'direct_manager':
      case 'department_head':
        if (!actor.isManager) {
          const hrRole = actor.roles.some((r) => r.role === 'hr_admin');
          if (!hrRole) throw new ForbiddenException('لا تملك صلاحية اعتماد هذا الطلب');
        }
        break;
    }
  }

  // ─── إيجاد المعتمد الحالي لـ instance معين ───
  async getCurrentApprover(instanceId: string, tenantId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: {
        workflowTemplate: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    if (!instance || instance.status !== 'in_review') return null;

    return instance.workflowTemplate?.steps.find(
      (s) => s.stepOrder === instance.currentStep,
    ) ?? null;
  }

  // ─── Timeline لأي طلب ───
  async getTimeline(instanceId: string, tenantId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
      include: {
        actionsLog: {
          orderBy: { actedAt: 'asc' },
          include: {
            actor: { select: { id: true, fullName: true, profilePhotoUrl: true } },
          },
        },
        workflowTemplate: {
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        },
      },
    });

    if (!instance) throw new NotFoundException('Workflow Instance غير موجود');
    return instance;
  }

  // ─── إرسال إشعار للمعتمد التالي (placeholder — هيتوسّع في Phase Notifications) ───
  private async notifyCurrentApprover(
    instanceId: string,
    tenantId: string,
    _fromEmployeeId: string,
  ) {
    // يُضاف FCM / in-app notification هنا
  }

  // ─── إلغاء workflow ───
  async cancel(instanceId: string, tenantId: string, actorId: string) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId, tenantId },
    });
    if (!instance) throw new NotFoundException('Workflow Instance غير موجود');
    if (!['in_review', 'returned'].includes(instance.status)) {
      throw new BadRequestException('لا يمكن إلغاء طلب بعد اتخاذ قرار بشأنه');
    }

    return this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled' },
    });
  }

  // ─── pending approvals للمدير/HR ───
  async getPendingApprovals(actorId: string, tenantId: string) {
    const actor = await this.prisma.employee.findFirst({
      where: { id: actorId, tenantId },
      include: { roles: true },
    });
    if (!actor) return [];

    // نجيب كل instances اللي حالتها in_review ونفلتر اللي المعتمد فيها هو
    const instances = await this.prisma.workflowInstance.findMany({
      where: { tenantId, status: 'in_review' },
      include: {
        workflowTemplate: {
          include: { steps: true },
        },
      },
    });

    const actorRoles = actor.roles.map((r) => r.role as string);
    const pending = instances.filter((inst) => {
      const step = inst.workflowTemplate?.steps.find(
        (s) => s.stepOrder === inst.currentStep,
      );
      if (!step) return false;

      if (step.approverType === 'specific_user')
        return step.approverReference === actorId;
      if (step.approverType === 'specific_role')
        return actorRoles.includes(step.approverReference ?? '');
      if (step.approverType === 'direct_manager' || step.approverType === 'department_head')
        return actor.isManager || actorRoles.includes('hr_admin');

      return false;
    });

    return pending;
  }
}
