import {
  IsString, IsOptional, IsEnum, IsInt,
  IsNotEmpty, IsDateString, IsNumber, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType } from '@prisma/client';

export class CreateRecruitmentRequestDto {
  @ApiProperty() @IsString() @IsNotEmpty() departmentId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobTitleId?: string;
  @ApiPropertyOptional({ description: 'اسم مسمى وظيفي جديد لو مش موجود' })
  @IsOptional() @IsString() newJobTitleName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() jobDescriptionId?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) vacanciesCount?: number;
  @ApiPropertyOptional({ enum: EmploymentType }) @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() proposedSalaryMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() proposedSalaryMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() targetStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional({ description: 'Workflow template ID لمسار الاعتماد' })
  @IsOptional() @IsString() workflowTemplateId?: string;
}

export class RecruitmentFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
