import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantFilterDto,
} from './dto/tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Super Admin — Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('super-admin/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء شركة/مستأجر جديد' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة كل الشركات' })
  findAll(@Query() filter: TenantFilterDto) {
    return this.tenantsService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل شركة معينة' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تعديل بيانات الشركة' })
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تجميد حساب الشركة' })
  suspend(@Param('id') id: string) {
    return this.tenantsService.suspend(id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تفعيل حساب الشركة' })
  activate(@Param('id') id: string) {
    return this.tenantsService.activate(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'إحصائيات استخدام الشركة' })
  getUsage(@Param('id') id: string) {
    return this.tenantsService.getUsage(id);
  }
}
