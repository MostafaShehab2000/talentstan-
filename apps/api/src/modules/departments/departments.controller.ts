import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء قسم جديد' })
  create(@TenantId() tenantId: string, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'الهيكل التنظيمي (شجري)' })
  findAll(@TenantId() tenantId: string) {
    return this.departmentsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل قسم مع موظفيه' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.departmentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تعديل قسم' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'حذف قسم' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.departmentsService.remove(tenantId, id);
  }
}
