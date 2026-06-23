import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HelpdeskService } from './helpdesk.service';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateTicketDto, UpdateTicketDto, AddTicketMessageDto, TicketFilterDto,
} from './dto/helpdesk.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Helpdesk / HR Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private readonly helpdeskService: HelpdeskService) {}

  // ── Categories ──
  @Post('categories')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إنشاء تصنيف تذاكر (HR Admin)' })
  createCategory(@TenantId() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.helpdeskService.createCategory(tenantId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'قائمة تصنيفات التذاكر' })
  getCategories(@TenantId() tenantId: string) {
    return this.helpdeskService.getCategories(tenantId);
  }

  @Patch('categories/:id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تعديل تصنيف' })
  updateCategory(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.helpdeskService.updateCategory(tenantId, id, dto);
  }

  @Delete('categories/:id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'حذف تصنيف' })
  deleteCategory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.helpdeskService.deleteCategory(tenantId, id);
  }

  // ── Tickets ──
  @Post('tickets')
  @ApiOperation({ summary: 'رفع تذكرة جديدة' })
  createTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.helpdeskService.createTicket(tenantId, user.id, dto);
  }

  @Get('tickets')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'كل التذاكر (HR Admin)' })
  getTickets(@TenantId() tenantId: string, @Query() filter: TicketFilterDto) {
    return this.helpdeskService.getTickets(tenantId, filter);
  }

  @Get('tickets/me')
  @ApiOperation({ summary: 'تذاكري' })
  getMyTickets(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.helpdeskService.getMyTickets(tenantId, user.id);
  }

  @Get('tickets/report')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تقرير التذاكر' })
  getReport(@TenantId() tenantId: string) {
    return this.helpdeskService.getReport(tenantId);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'تفاصيل تذكرة' })
  getTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    return this.helpdeskService.getTicketById(tenantId, id, user.id);
  }

  @Patch('tickets/:id')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'تحديث حالة / تعيين (HR Admin)' })
  updateTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.helpdeskService.updateTicket(tenantId, id, user.id, dto);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'إرسال رسالة في التذكرة' })
  addMessage(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: AddTicketMessageDto) {
    return this.helpdeskService.addMessage(tenantId, id, user.id, dto);
  }
}
