import {
  IsString, IsOptional, IsEnum, IsArray,
  IsNotEmpty, IsUUID, IsNumber,
  Min, Max, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppraisalStatus, CycleType, SectionType } from '@prisma/client';

export class CreateCriterionDto {
  @ApiProperty() @IsString() @IsNotEmpty() criterionName: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(100) weight: number;
}

export class CreateAppraisalSectionDto {
  @ApiProperty({ enum: SectionType }) @IsEnum(SectionType) sectionType: SectionType;
  @ApiProperty() @IsNumber() @Min(1) @Max(100) weight: number;
  @ApiProperty({ type: [CreateCriterionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateCriterionDto)
  criteria: CreateCriterionDto[];
}

export class CreateAppraisalTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: CycleType }) @IsEnum(CycleType) cycleType: CycleType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() jobTitleId?: string;
  @ApiProperty({ type: [CreateAppraisalSectionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateAppraisalSectionDto)
  sections: CreateAppraisalSectionDto[];
}

export class CreateAppraisalCycleDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsUUID() templateId: string; // stored at EmployeeAppraisal level
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetDepartmentIds?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetEmployeeIds?: string[];
}

export class ScoreCriterionDto {
  @ApiProperty() @IsUUID() criterionId: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) score: number;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

export class SubmitAppraisalDto {
  @ApiProperty({ type: [ScoreCriterionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ScoreCriterionDto)
  scores: ScoreCriterionDto[];
}

export class AppraisalFilterDto {
  @ApiPropertyOptional({ enum: AppraisalStatus }) @IsOptional() @IsEnum(AppraisalStatus) status?: AppraisalStatus;
  @ApiPropertyOptional() @IsOptional() cycleId?: string;
  @ApiPropertyOptional() @IsOptional() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
