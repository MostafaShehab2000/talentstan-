import {
  IsString, IsOptional, IsDateString,
  IsNotEmpty, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
  @ApiProperty() @IsString() @IsNotEmpty() leaveTypeId: string;
  @ApiProperty({ example: '2026-07-01' }) @IsDateString() startDate: string;

  @ApiPropertyOptional({ example: '2026-07-05', description: 'للإجازات بالأيام' })
  @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '09:00', description: 'للأذونات بالساعات' })
  @IsOptional() @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '11:00', description: 'للأذونات بالساعات' })
  @IsOptional() @IsString()
  endTime?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
}

export class LeaveRequestFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() leaveTypeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() employeeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
