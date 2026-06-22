import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateFcmTokenDto,
} from './dto/employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إضافة موظف جديد' })
  create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(tenantId, dto);
  }

  @Get()
  @Roles('hr_admin', 'manager')
  @ApiOperation({ summary: 'قائمة الموظفين' })
  findAll(
    @TenantId() tenantId: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.employeesService.findAll(tenantId, {
      search,
      departmentId,
      status,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Get('org-chart')
  @ApiOperation({ summary: 'الهيكل التنظيمي الكامل' })
  getOrgChart(@TenantId() tenantId: string) {
    return this.employeesService.getOrgChart(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل موظف' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تعديل بيانات موظف' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(tenantId, id, dto);
  }

  @Get(':id/team')
  @ApiOperation({ summary: 'فريق المدير المباشر' })
  getTeam(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.employeesService.getTeam(tenantId, id);
  }

  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'تحديث FCM Token للإشعارات' })
  updateFcmToken(
    @CurrentUser() user: any,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.employeesService.updateFcmToken(user.id, dto.fcmToken);
  }
}
