import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PayslipService } from './payslip.service';
import { CreatePayslipDto, BulkUploadPayslipDto, PayslipFilterDto } from './dto/payslip.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Payslips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payslips')
export class PayslipController {
  constructor(private readonly payslipService: PayslipService) {}

  @Post()
  @Roles('hr_admin')
  @ApiOperation({ summary: 'رفع كشف راتب (HR Admin)' })
  upload(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreatePayslipDto) {
    return this.payslipService.uploadPayslip(tenantId, user.id, dto);
  }

  @Post('bulk')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'رفع كشوف رواتب دفعة واحدة' })
  bulkUpload(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: BulkUploadPayslipDto) {
    return this.payslipService.bulkUpload(tenantId, user.id, dto.payslips);
  }

  @Get('me')
  @ApiOperation({ summary: 'كشوف راتبي' })
  getMyPayslips(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() filter: PayslipFilterDto) {
    return this.payslipService.getMyPayslips(tenantId, user.id, filter);
  }

  @Get('summary')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'ملخص الرواتب لشهر معين' })
  getSummary(@TenantId() tenantId: string, @Query('month') month: number, @Query('year') year: number) {
    return this.payslipService.getPayrollSummary(tenantId, +month, +year);
  }

  @Get('all')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل كشوف الرواتب (HR Admin)' })
  getAll(@TenantId() tenantId: string, @Query() filter: PayslipFilterDto) {
    return this.payslipService.getAllPayslips(tenantId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'عرض كشف راتب بالـ ID' })
  getOne(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.payslipService.getPayslipById(tenantId, id, user.id);
  }
}
