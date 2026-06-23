import { IsOptional, IsNumber, IsNotEmpty, IsUUID, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayslipDto {
  @ApiProperty() @IsUUID() employeeId: string;
  @ApiProperty({ example: 6 }) @IsNumber() @Min(1) @Max(12) month: number;
  @ApiProperty({ example: 2026 }) @IsNumber() @Min(2000) year: number;
  @ApiProperty() @IsNumber() basicSalary: number;
  @ApiPropertyOptional() @IsOptional() allowances?: any; // JSON
  @ApiPropertyOptional() @IsOptional() deductions?: any; // JSON
  @ApiProperty() @IsNumber() netSalary: number;
  @ApiPropertyOptional() @IsOptional() @IsString() pdfUrl?: string;
}

export class BulkUploadPayslipDto {
  @ApiProperty({ type: [CreatePayslipDto] }) payslips: CreatePayslipDto[];
}

export class PayslipFilterDto {
  @ApiPropertyOptional() @IsOptional() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() month?: number;
  @ApiPropertyOptional() @IsOptional() year?: number;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
