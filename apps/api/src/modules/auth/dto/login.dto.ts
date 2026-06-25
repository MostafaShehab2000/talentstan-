import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'you@company.com', description: 'البريد الإلكتروني أو كود الموظف' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'tenant-uuid', description: 'معرّف الشركة (اختياري — يُستخدم لو نفس الإيميل في أكثر من شركة)' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
