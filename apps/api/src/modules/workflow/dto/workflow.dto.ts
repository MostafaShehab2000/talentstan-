import {
  IsString, IsEnum, IsOptional, IsInt, IsArray,
  IsNotEmpty, IsBoolean, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkflowModule, ApproverType, WorkflowAction } from '@prisma/client';

export class CreateWorkflowStepDto {
  @ApiProperty() @IsInt() @Min(1) stepOrder: number;
  @ApiProperty({ enum: ApproverType }) @IsEnum(ApproverType) approverType: ApproverType;
  @ApiPropertyOptional() @IsOptional() @IsString() approverReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() slaHours?: number;
  @ApiPropertyOptional({ enum: ApproverType }) @IsOptional() @IsEnum(ApproverType) escalationApproverType?: ApproverType;
}

export class CreateWorkflowTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: WorkflowModule }) @IsEnum(WorkflowModule) module: WorkflowModule;
  @ApiPropertyOptional() @IsOptional() conditions?: any;
  @ApiProperty({ type: [CreateWorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowStepDto)
  steps: CreateWorkflowStepDto[];
}

export class ProcessWorkflowActionDto {
  @ApiProperty({ enum: WorkflowAction }) @IsEnum(WorkflowAction) action: WorkflowAction;
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
