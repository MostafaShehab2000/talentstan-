import {
  IsOptional, IsNumber, IsArray, IsUUID, IsString, IsEnum,
  Min, Max, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayslipAllowancesDto {
  @IsOptional() @IsNumber() variable?: number;     // المتغير
  @IsOptional() @IsNumber() overtime?: number;     // الوقت الإضافي
  @IsOptional() @IsNumber() incentive?: number;    // الحافز
  @IsOptional() @IsNumber() workingDays?: number;  // عدد أيام العمل
  @IsOptional() @IsNumber() other?: number;        // أخرى
}

export class PayslipDeductionsDto {
  @IsOptional() @IsNumber() healthcare?: number;   // الرعاية الصحية
  @IsOptional() @IsNumber() advances?: number;     // السلف
  @IsOptional() @IsNumber() other?: number;        // خصومات أخرى
}

export class CreatePayslipDto {
  @ApiProperty() @IsUUID() employeeId: string;
  @ApiProperty({ example: 6 }) @IsNumber() @Min(1) @Max(12) month: number;
  @ApiProperty({ example: 2026 }) @IsNumber() @Min(2000) year: number;
  @ApiProperty() @IsNumber() basicSalary: number;
  @ApiPropertyOptional() @IsOptional() allowances?: PayslipAllowancesDto;
  @ApiPropertyOptional() @IsOptional() deductions?: PayslipDeductionsDto;
  @ApiProperty() @IsNumber() netSalary: number;
  @ApiPropertyOptional() @IsOptional() @IsString() pdfUrl?: string;
  @ApiPropertyOptional({ enum: ['bank', 'cash'] }) @IsOptional() @IsEnum(['bank', 'cash']) paymentMethod?: string;
}

export class BulkUploadPayslipDto {
  @ApiProperty({ type: [CreatePayslipDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePayslipDto)
  payslips: CreatePayslipDto[];
}

export class PayslipFilterDto {
  @ApiPropertyOptional() @IsOptional() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() month?: number;
  @ApiPropertyOptional() @IsOptional() year?: number;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
