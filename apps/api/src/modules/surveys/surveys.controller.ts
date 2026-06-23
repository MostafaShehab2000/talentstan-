import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto, SubmitSurveyResponseDto } from './dto/survey.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Employee Satisfaction Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء استطلاع (HR Admin)' })
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateSurveyDto) {
    return this.surveysService.createSurvey(tenantId, user.id, dto);
  }

  @Get()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل الاستطلاعات (HR Admin)' })
  getAll(@TenantId() tenantId: string) {
    return this.surveysService.getAllSurveys(tenantId);
  }

  @Get('me')
  @ApiOperation({ summary: 'الاستطلاعات المتاحة للموظف' })
  getMySurveys(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.surveysService.getMySurveys(tenantId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل استطلاع' })
  getOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.surveysService.getSurveyById(tenantId, id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'الإجابة على استطلاع' })
  respond(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: SubmitSurveyResponseDto) {
    return this.surveysService.submitResponse(tenantId, id, user.id, dto);
  }

  @Get(':id/results')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'نتائج استطلاع (HR Admin)' })
  getResults(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.surveysService.getSurveyResults(tenantId, id);
  }

  @Patch(':id/close')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إغلاق استطلاع' })
  close(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.surveysService.closeSurvey(tenantId, id);
  }
}
