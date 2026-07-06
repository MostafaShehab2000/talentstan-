import { Controller, Get, Post, Delete, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('hr_admin')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('holidays')
  @ApiOperation({ summary: 'قائمة الإجازات الرسمية' })
  getHolidays(@CurrentUser() user: any) {
    return this.settingsService.getHolidays(user.tenantId);
  }

  @Post('holidays')
  @ApiOperation({ summary: 'إضافة إجازة رسمية' })
  createHoliday(@CurrentUser() user: any, @Body() body: { name: string; date: string; isRecurring?: boolean }) {
    return this.settingsService.createHoliday(user.tenantId, body);
  }

  @Delete('holidays/:id')
  @ApiOperation({ summary: 'حذف إجازة رسمية' })
  deleteHoliday(@CurrentUser() user: any, @Param('id') id: string) {
    return this.settingsService.deleteHoliday(user.tenantId, id);
  }

  @Get('work-hours')
  @ApiOperation({ summary: 'إعدادات ساعات العمل' })
  getWorkHours(@CurrentUser() user: any) {
    return this.settingsService.getWorkHours(user.tenantId);
  }

  @Put('work-hours')
  @ApiOperation({ summary: 'تحديث إعدادات ساعات العمل' })
  updateWorkHours(@CurrentUser() user: any, @Body() body: { workDays?: number[]; startTime?: string; endTime?: string; lateAfterMins?: number }) {
    return this.settingsService.upsertWorkHours(user.tenantId, body);
  }
}
