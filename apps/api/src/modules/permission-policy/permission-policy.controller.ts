import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionPolicyService, UpsertPermissionPolicyDto } from './permission-policy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Permission Policy (الأذونات الشهرية)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('permission-policy')
export class PermissionPolicyController {
  constructor(private readonly service: PermissionPolicyService) {}

  @Get()
  @ApiOperation({ summary: 'سياسة الأذونات الشهرية للشركة' })
  getPolicy(@TenantId() tenantId: string) {
    return this.service.getPolicy(tenantId);
  }

  @Put()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تحديث سياسة الأذونات (HR Admin)' })
  upsertPolicy(@TenantId() tenantId: string, @Body() dto: UpsertPermissionPolicyDto) {
    return this.service.upsertPolicy(tenantId, dto);
  }

  @Get('my-usage')
  @ApiOperation({ summary: 'استهلاكي من الأذونات هذا الشهر' })
  getMyUsage(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.service.getMyMonthlyUsage(tenantId, user.id);
  }
}
