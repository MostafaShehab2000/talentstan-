import {
  Controller, Get, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowTemplateDto,
  ProcessWorkflowActionDto,
} from './dto/workflow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('templates')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء قالب Workflow جديد' })
  async createTemplate(
    @TenantId() tenantId: string,
    @Body() dto: CreateWorkflowTemplateDto,
  ) {
    return this.prisma.workflowTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        module: dto.module,
        conditions: dto.conditions,
        steps: {
          create: dto.steps.map((s) => ({
            stepOrder: s.stepOrder,
            approverType: s.approverType,
            approverReference: s.approverReference,
            slaHours: s.slaHours,
            escalationApproverType: s.escalationApproverType,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  @Get('templates')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل قوالب الـ Workflow' })
  async getTemplates(@TenantId() tenantId: string) {
    return this.prisma.workflowTemplate.findMany({
      where: { tenantId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { module: 'asc' },
    });
  }

  @Post('instances/:id/action')
  @ApiOperation({ summary: 'تنفيذ action على طلب (approve/reject/return)' })
  async processAction(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') instanceId: string,
    @Body() dto: ProcessWorkflowActionDto,
  ) {
    return this.workflowService.processAction({
      workflowInstanceId: instanceId,
      actorId: user.id,
      tenantId,
      action: dto.action,
      comment: dto.comment,
    });
  }

  @Get('instances/:id/timeline')
  @ApiOperation({ summary: 'Timeline لأي طلب' })
  async getTimeline(
    @TenantId() tenantId: string,
    @Param('id') instanceId: string,
  ) {
    return this.workflowService.getTimeline(instanceId, tenantId);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'الطلبات المنتظرة اعتمادي' })
  async getPendingApprovals(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
  ) {
    return this.workflowService.getPendingApprovals(user.id, tenantId);
  }
}
