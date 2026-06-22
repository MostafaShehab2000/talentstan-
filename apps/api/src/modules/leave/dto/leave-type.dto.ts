import {
  IsString, IsEnum, IsOptional, IsBoolean,
  IsNumber, IsInt, IsNotEmpty, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveCategory, AccrualType } from '@prisma/client';

export class CreateLeaveTypeDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;

  @ApiProperty({ enum: LeaveCategory })
  @IsEnum(LeaveCategory)
  category: LeaveCategory;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isBalanceBased?: boolean;

  @ApiPropertyOptional({ enum: AccrualType })
  @IsOptional() @IsEnum(AccrualType)
  accrualType?: AccrualType;

  @ApiPropertyOptional({ description: 'الرصيد السنوي (بالأيام أو الساعات)' })
  @IsOptional() @IsNumber()
  annualQuota?: number;

  @ApiPropertyOptional({ description: 'الحد الأقصى للترحيل للسنة التالية' })
  @IsOptional() @IsNumber()
  carryOverCap?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  requiresAttachment?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  workflowTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  minDays?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  maxDays?: number;

  @ApiPropertyOptional({ description: 'التقديم المسبق (بالأيام)' })
  @IsOptional() @IsInt() @Min(0)
  advanceNoticeDays?: number;
}

export class UpdateLeaveTypeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBalanceBased?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() annualQuota?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() carryOverCap?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresAttachment?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() workflowTemplateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() minDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() advanceNoticeDays?: number;
}

export class SetLeaveBalanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() employeeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() leaveTypeId: string;
  @ApiProperty() @IsInt() year: number;
  @ApiProperty() @IsNumber() @Min(0) entitled: number;
}

export class AdjustLeaveBalanceDto {
  @ApiProperty({ description: 'موجب للإضافة، سالب للخصم' })
  @IsNumber()
  adjustment: number;

  @ApiProperty({ description: 'سبب التعديل (إلزامي للـ Audit)' })
  @IsString() @IsNotEmpty()
  reason: string;
}
