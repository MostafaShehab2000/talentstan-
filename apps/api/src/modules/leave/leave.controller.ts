import {
  Controller, Get, Post, Patch, Body,
  Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto, SetLeaveBalanceDto, AdjustLeaveBalanceDto } from './dto/leave-type.dto';
import { CreateLeaveRequestDto, LeaveRequestFilterDto } from './dto/leave-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Leave / Permission / Mission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ════════ LEAVE TYPES (Admin) ════════

  @Post('types')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء نوع إجازة/إذن/مأمورية' })
  createType(@TenantId() tenantId: string, @Body() dto: CreateLeaveTypeDto) {
    return this.leaveService.createLeaveType(tenantId, dto);
  }

  @Get('types')
  @ApiOperation({ summary: 'كل أنواع الإجازات للشركة' })
  getTypes(@TenantId() tenantId: string) {
    return this.leaveService.getLeaveTypes(tenantId);
  }

  @Patch('types/:id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تعديل نوع إجازة' })
  updateType(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.leaveService.updateLeaveType(tenantId, id, dto);
  }

  // ════════ BALANCES ════════

  @Get('balances/me')
  @ApiOperation({ summary: 'رصيد إجازاتي' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getMyBalances(@CurrentUser() user: any, @Query('year') year?: number) {
    return this.leaveService.getMyBalances(user.id, year ? +year : undefined);
  }

  @Get('balances/:employeeId')
  @Roles('hr_admin', 'manager')
  @ApiOperation({ summary: 'رصيد إجازات موظف محدد (HR/Manager)' })
  getEmployeeBalances(
    @Param('employeeId') employeeId: string,
    @Query('year') year?: number,
  ) {
    return this.leaveService.getMyBalances(employeeId, year ? +year : undefined);
  }

  @Post('balances/set')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تحديد رصيد موظف (HR)' })
  setBalance(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: SetLeaveBalanceDto,
  ) {
    return this.leaveService.setBalance(tenantId, dto, user.id);
  }

  @Post('balances/bulk')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'استيراد أرصدة بالجملة (HR)' })
  bulkSetBalances(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() body: { balances: SetLeaveBalanceDto[] },
  ) {
    return this.leaveService.bulkSetBalances(tenantId, body.balances, user.id);
  }

  @Patch('balances/:employeeId/:leaveTypeId/adjust')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تعديل رصيد يدوي لموظف (HR - مع سبب إلزامي)' })
  adjustBalance(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('employeeId') employeeId: string,
    @Param('leaveTypeId') leaveTypeId: string,
    @Body() dto: AdjustLeaveBalanceDto,
  ) {
    return this.leaveService.adjustBalance(tenantId, employeeId, leaveTypeId, dto, user.id);
  }

  // ════════ LEAVE REQUESTS (Employee) ════════

  @Post('requests')
  @ApiOperation({ summary: 'تقديم طلب إجازة/إذن/مأمورية' })
  createRequest(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.leaveService.createRequest(tenantId, user.id, dto);
  }

  @Get('requests/me')
  @ApiOperation({ summary: 'طلباتي' })
  getMyRequests(@CurrentUser() user: any, @Query() filter: LeaveRequestFilterDto) {
    return this.leaveService.getMyRequests(user.id, filter);
  }

  @Get('requests/all')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل الطلبات (HR Admin)' })
  getAllRequests(@TenantId() tenantId: string, @Query() filter: LeaveRequestFilterDto) {
    return this.leaveService.getAllRequests(tenantId, filter);
  }

  @Get('requests/pending-my-approval')
  @ApiOperation({ summary: 'الطلبات المنتظرة اعتمادي (Manager)' })
  getPendingForManager(@CurrentUser() user: any, @TenantId() tenantId: string) {
    return this.leaveService.getPendingForManager(user.id, tenantId);
  }

  @Patch('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'اعتماد طلب (Manager/HR)' })
  approveRequest(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.leaveService.approveRequest(tenantId, id, user.id);
  }

  @Patch('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'رفض طلب (Manager/HR)' })
  rejectRequest(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.leaveService.rejectRequest(tenantId, id, user.id, note);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'تفاصيل طلب + Timeline الاعتماد' })
  getRequestById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leaveService.getRequestById(tenantId, id);
  }

  @Patch('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إلغاء طلب (الموظف - قبل الاعتماد النهائي)' })
  cancelRequest(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.leaveService.cancelRequest(tenantId, id, user.id);
  }

  // ════════ MANAGER VIEWS ════════

  @Get('team-calendar')
  @ApiOperation({ summary: 'تقويم الفريق (Manager) - يوضح إجازات الفريق' })
  @ApiQuery({ name: 'month', type: Number })
  @ApiQuery({ name: 'year', type: Number })
  getTeamCalendar(
    @CurrentUser() user: any,
    @TenantId() tenantId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.leaveService.getTeamCalendar(user.id, tenantId, +month, +year);
  }

  // ════════ REPORTS (HR) ════════

  @Get('reports')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تقرير الإجازات (HR) - قابل للتصدير' })
  getLeaveReport(@TenantId() tenantId: string, @Query() filter: LeaveRequestFilterDto) {
    return this.leaveService.getLeaveReport(tenantId, filter);
  }
}
