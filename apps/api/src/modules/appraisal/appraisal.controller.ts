import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppraisalService } from './appraisal.service';
import {
  CreateAppraisalTemplateDto, CreateAppraisalCycleDto,
  SubmitAppraisalDto, AppraisalFilterDto,
} from './dto/appraisal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Performance Appraisal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appraisal')
export class AppraisalController {
  constructor(private readonly appraisalService: AppraisalService) {}

  // ── Templates ──
  @Post('templates')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء قالب تقييم (HR Admin)' })
  createTemplate(@TenantId() tenantId: string, @Body() dto: CreateAppraisalTemplateDto) {
    return this.appraisalService.createTemplate(tenantId, dto);
  }

  @Get('templates')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'قوالب التقييم' })
  getTemplates(@TenantId() tenantId: string) {
    return this.appraisalService.getTemplates(tenantId);
  }

  // ── Cycles ──
  @Post('cycles')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إطلاق دورة تقييم (HR Admin)' })
  createCycle(@TenantId() tenantId: string, @Body() dto: CreateAppraisalCycleDto) {
    return this.appraisalService.createCycle(tenantId, dto);
  }

  @Get('cycles')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'دورات التقييم' })
  getCycles(@TenantId() tenantId: string) {
    return this.appraisalService.getCycles(tenantId);
  }

  @Get('cycles/:id/bell-curve')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'Bell Curve لدورة تقييم' })
  getBellCurve(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.appraisalService.getBellCurve(tenantId, id);
  }

  // ── Appraisals ──
  @Get('me')
  @ApiOperation({ summary: 'تقييماتي' })
  getMyAppraisals(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.appraisalService.getMyAppraisals(tenantId, user.id);
  }

  @Get('all')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل التقييمات (HR Admin)' })
  getAll(@TenantId() tenantId: string, @Query() filter: AppraisalFilterDto) {
    return this.appraisalService.getAllAppraisals(tenantId, filter);
  }

  @Post(':id/self-assessment')
  @ApiOperation({ summary: 'تقديم التقييم الذاتي' })
  submitSelf(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: SubmitAppraisalDto) {
    return this.appraisalService.submitSelfAssessment(tenantId, id, user.id, dto);
  }

  @Post(':id/manager-assessment')
  @Roles('manager')
  @ApiOperation({ summary: 'تقييم المدير للموظف' })
  submitManager(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: SubmitAppraisalDto) {
    return this.appraisalService.submitManagerAssessment(tenantId, id, user.id, dto);
  }

  @Patch(':id/finalize')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنهاء التقييم (HR Admin)' })
  finalize(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.appraisalService.finalizeAppraisal(tenantId, id);
  }
}
