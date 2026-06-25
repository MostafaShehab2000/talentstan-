import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobTitlesService } from './job-titles.service';
import { CreateJobTitleDto, UpdateJobTitleDto } from './dto/job-title.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Job Titles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly service: JobTitlesService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء مسمى وظيفي جديد' })
  create(@TenantId() tenantId: string, @Body() dto: CreateJobTitleDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المسميات الوظيفية' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل مسمى وظيفي' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تعديل مسمى وظيفي' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateJobTitleDto) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'حذف مسمى وظيفي' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
