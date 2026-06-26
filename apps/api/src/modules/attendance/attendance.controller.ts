import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── جهاز البصمة ──

  @Post('devices')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إضافة/تحديث جهاز بصمة' })
  saveDevice(
    @TenantId() tenantId: string,
    @Body() dto: { name: string; ip: string; port?: number; password?: string },
  ) {
    return this.attendanceService.saveDevice(tenantId, dto);
  }

  @Get('devices')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'أجهزة البصمة المسجلة' })
  getDevices(@TenantId() tenantId: string) {
    return this.attendanceService.getDevices(tenantId);
  }

  @Post('sync')
  @Roles('hr_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'سحب بيانات الحضور من مكينة البصمة' })
  sync(
    @TenantId() tenantId: string,
    @Body() dto: { ip: string; port?: number; password?: string },
  ) {
    return this.attendanceService.syncFromMachine(tenantId, dto.ip, dto.port, dto.password);
  }

  // ── سجل الحضور ──

  @Get('me')
  @ApiOperation({ summary: 'حضوري الشهري' })
  getMyAttendance(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.attendanceService.getMyAttendance(tenantId, user.id, month ? +month : undefined, year ? +year : undefined);
  }

  @Get('all')
  @Roles('hr_admin', 'manager')
  @ApiOperation({ summary: 'كل سجلات الحضور (HR/Manager)' })
  getAll(
    @TenantId() tenantId: string,
    @Query('date') date?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.attendanceService.getAllAttendance(tenantId, date, departmentId);
  }

  @Get('today')
  @Roles('hr_admin', 'manager')
  @ApiOperation({ summary: 'ملخص حضور اليوم' })
  getToday(@TenantId() tenantId: string) {
    return this.attendanceService.getTodaySummary(tenantId);
  }
}
