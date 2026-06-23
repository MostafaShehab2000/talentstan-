import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsNotEmpty, IsUUID, ValidateNested, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class CreateSurveyQuestionDto {
  @ApiProperty() @IsString() @IsNotEmpty() questionText: string;
  @ApiProperty({ enum: QuestionType }) @IsEnum(QuestionType) questionType: QuestionType;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() options?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) orderIndex?: number;
}

export class CreateSurveyDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetScope?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetDepartmentIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAnonymous?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endsAt?: string;
  @ApiProperty({ type: [CreateSurveyQuestionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateSurveyQuestionDto)
  questions: CreateSurveyQuestionDto[];
}

export class SurveyAnswerDto {
  @ApiProperty() @IsUUID() questionId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() answerText?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() selectedOptions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(10) ratingValue?: number;
}

export class SubmitSurveyResponseDto {
  @ApiProperty({ type: [SurveyAnswerDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => SurveyAnswerDto)
  answers: SurveyAnswerDto[];
}
