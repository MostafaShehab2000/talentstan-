import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentDepartmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() headEmployeeId?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentDepartmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() headEmployeeId?: string;
}
