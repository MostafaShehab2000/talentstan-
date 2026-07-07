import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OtherRequestsService, CreateOtherRequestDto, UpdateOtherRequestDto, UpsertOtherRequestConfigDto } from './other-requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Other Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('other-requests')
export class OtherRequestsController {
  constructor(private readonly service: OtherRequestsService) {}

  // ── Config (Admin) ──────────────────────────────────

  @Get('configs')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إعدادات سلسلة الموافقة لكل نوع طلب' })
  getConfigs(@TenantId() tenantId: string) {
    return this.service.getConfigs(tenantId);
  }

  @Post('configs')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تحديث سلسلة الموافقة لنوع طلب' })
  upsertConfig(@TenantId() tenantId: string, @Body() dto: UpsertOtherRequestConfigDto) {
    return this.service.upsertConfig(tenantId, dto);
  }

  // ── Employee ────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'تقديم طلب جديد' })
  create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateOtherRequestDto) {
    return this.service.create(tenantId, user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'طلباتي' })
  getMyRequests(@CurrentUser() user: any) {
    return this.service.getMyRequests(user.id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelRequest(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.service.cancelRequest(tenantId, id, user.id);
  }

  // ── Manager ─────────────────────────────────────────

  @Get('pending-manager')
  @ApiOperation({ summary: 'الطلبات المعلقة للمدير' })
  getPendingForManager(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.service.getPendingForManager(user.id, tenantId);
  }

  @Patch(':id/manager-approve')
  @HttpCode(HttpStatus.OK)
  managerApprove(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.service.managerApprove(tenantId, id, user.id);
  }

  @Patch(':id/manager-reject')
  @HttpCode(HttpStatus.OK)
  managerReject(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.service.managerReject(tenantId, id, user.id, note);
  }

  // ── HR Admin ────────────────────────────────────────

  @Get('pending-hr')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'الطلبات المعلقة لـ HR' })
  getPendingForHR(@TenantId() tenantId: string) {
    return this.service.getPendingForHR(tenantId);
  }

  @Get('all')
  @Roles('hr_admin')
  getAllRequests(
    @TenantId() tenantId: string,
    @Query('status') status?: any,
    @Query('type')   type?: any,
  ) {
    return this.service.getAllRequests(tenantId, status, type);
  }

  @Patch(':id/process')
  @Roles('hr_admin')
  processRequest(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateOtherRequestDto) {
    return this.service.processRequest(tenantId, id, dto);
  }
}
