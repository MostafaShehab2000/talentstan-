import { IsString, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobTitleDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) gradeLevel?: number;
}

export class UpdateJobTitleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) gradeLevel?: number;
}
