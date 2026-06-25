import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OtherRequestsService, CreateOtherRequestDto, UpdateOtherRequestDto } from './other-requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Other Requests (طلبات أخرى)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('other-requests')
export class OtherRequestsController {
  constructor(private readonly service: OtherRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'تقديم طلب آخر (خطاب HR، موبيل لاين، إلخ)' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateOtherRequestDto,
  ) {
    return this.service.create(tenantId, user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'طلباتي الأخرى' })
  getMyRequests(@CurrentUser() user: any) {
    return this.service.getMyRequests(user.id);
  }

  @Get('all')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل الطلبات الأخرى (HR Admin)' })
  getAllRequests(
    @TenantId() tenantId: string,
    @Query('status') status?: any,
    @Query('type')   type?: any,
  ) {
    return this.service.getAllRequests(tenantId, status, type);
  }

  @Patch(':id/process')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'معالجة طلب (قبول/رفض) - HR Admin' })
  processRequest(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOtherRequestDto,
  ) {
    return this.service.processRequest(tenantId, id, dto);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إلغاء طلب (الموظف)' })
  cancelRequest(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.service.cancelRequest(tenantId, id, user.id);
  }
}
