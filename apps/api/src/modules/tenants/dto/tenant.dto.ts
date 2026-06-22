import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TenantType,
  TenantStatus,
  SubscriptionPlan,
} from '@prisma/client';

export class CreateTenantDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: TenantType }) @IsEnum(TenantType) type: TenantType;

  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;

  @ApiProperty() @IsInt() @Min(1) maxEmployees: number;

  @ApiProperty({ enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  subscriptionPlan: SubscriptionPlan;

  @ApiPropertyOptional() @IsOptional() @IsDateString() subscriptionStart?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() subscriptionEnd?: string;

  @ApiPropertyOptional({ default: 'Africa/Cairo' })
  @IsOptional()
  @IsString()
  timezone?: string;

  // First admin account
  @ApiProperty({ description: 'اسم أول مسؤول للشركة' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @ApiProperty() @IsEmail() adminEmail: string;

  @ApiPropertyOptional() @IsOptional() @IsString() adminPhone?: string;

  @ApiProperty({ description: 'كلمة مرور مؤقتة للمسؤول الأول' })
  @IsString()
  @IsNotEmpty()
  adminPassword: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: TenantType }) @IsOptional() @IsEnum(TenantType) type?: TenantType;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) maxEmployees?: number;
  @ApiPropertyOptional({ enum: SubscriptionPlan }) @IsOptional() @IsEnum(SubscriptionPlan) subscriptionPlan?: SubscriptionPlan;
  @ApiPropertyOptional() @IsOptional() @IsDateString() subscriptionEnd?: string;
  @ApiPropertyOptional({ enum: TenantStatus }) @IsOptional() @IsEnum(TenantStatus) status?: TenantStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
}

export class TenantFilterDto {
  @ApiPropertyOptional({ enum: TenantStatus }) @IsOptional() @IsEnum(TenantStatus) status?: TenantStatus;
  @ApiPropertyOptional({ enum: TenantType }) @IsOptional() @IsEnum(TenantType) type?: TenantType;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ description: 'فلتر الاشتراكات المنتهية خلال X يوم' })
  @IsOptional() @IsInt() expiringInDays?: number;
}
