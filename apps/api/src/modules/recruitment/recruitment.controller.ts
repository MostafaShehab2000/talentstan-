import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecruitmentService } from './recruitment.service';
import { CreateRecruitmentRequestDto, RecruitmentFilterDto } from './dto/recruitment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Recruitment Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post()
  @ApiOperation({ summary: 'تقديم طلب توظيف (Manager)' })
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateRecruitmentRequestDto) {
    return this.recruitmentService.create(tenantId, user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'طلبات التوظيف الخاصة بي' })
  getMyRequests(@CurrentUser() user: any, @TenantId() tenantId: string) {
    return this.recruitmentService.getMyRequests(user.id, tenantId);
  }

  @Get()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل طلبات التوظيف (HR Admin)' })
  findAll(@TenantId() tenantId: string, @Query() filter: RecruitmentFilterDto) {
    return this.recruitmentService.findAll(tenantId, filter);
  }

  @Get('report')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تقرير طلبات التوظيف' })
  getReport(@TenantId() tenantId: string) {
    return this.recruitmentService.getReport(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل طلب توظيف' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.recruitmentService.findOne(tenantId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'إلغاء طلب توظيف' })
  cancel(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.recruitmentService.cancel(tenantId, id, user.id);
  }
}
