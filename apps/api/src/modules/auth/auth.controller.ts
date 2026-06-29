import { Controller, Post, Patch, Body, HttpCode, HttpStatus, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/tenant.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

class ChangePasswordDto {
  @ApiProperty() @IsString() @IsNotEmpty() oldPassword: string;
  @ApiProperty() @IsString() @MinLength(6) newPassword: string;
}

class SuperAdminLoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل دخول الموظف' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تجديد الـ Access Token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تغيير كلمة مرور الموظف' })
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    const emp = await this.prisma.employee.findUnique({ where: { id: user.id } });
    if (!emp?.password) throw new BadRequestException('الموظف غير موجود');
    const valid = await bcrypt.compare(dto.oldPassword, emp.password);
    if (!valid) throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.employee.update({ where: { id: user.id }, data: { password: hashed } });
    return { success: true };
  }

  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل دخول Super Admin' })
  superAdminLogin(@Body() dto: SuperAdminLoginDto) {
    return this.authService.superAdminLogin(dto.email, dto.password);
  }
}
