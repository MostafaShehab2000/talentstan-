import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeStatus, EmployeeRole } from '@prisma/client';

export class CreateEmployeeDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeCode: string;
  @ApiProperty() @IsString() @IsNotEmpty() fullName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiProperty() @IsString() @IsNotEmpty() password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() directManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isManager?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() profilePhotoUrl?: string;
  @ApiPropertyOptional({ enum: EmployeeRole, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(EmployeeRole, { each: true })
  roles?: EmployeeRole[];
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() directManagerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() hireDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isManager?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() profilePhotoUrl?: string;
  @ApiPropertyOptional({ enum: EmployeeStatus }) @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @ApiPropertyOptional({ enum: EmployeeRole, isArray: true })
  @IsOptional() @IsArray() @IsEnum(EmployeeRole, { each: true }) roles?: EmployeeRole[];
}

export class BulkImportEmployeeDto {
  @ApiProperty({ type: [CreateEmployeeDto] })
  employees: CreateEmployeeDto[];
}

export class UpdateFcmTokenDto {
  @ApiProperty() @IsString() @IsNotEmpty() fcmToken: string;
}
