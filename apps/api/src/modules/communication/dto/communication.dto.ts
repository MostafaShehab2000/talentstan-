import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostType, TargetScope } from '@prisma/client';

export class CreatePostDto {
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() mediaUrls?: any;
  @ApiPropertyOptional({ enum: PostType, default: 'normal' }) @IsOptional() @IsEnum(PostType) postType?: PostType;
  @ApiPropertyOptional({ enum: TargetScope, default: 'company' }) @IsOptional() @IsEnum(TargetScope) targetScope?: TargetScope;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() targetDepartmentIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPinned?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsDateString() publishAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}

export class CreateCommentDto {
  @ApiProperty() @IsString() @IsNotEmpty() comment: string;
}

export class ReactToPostDto {
  @ApiProperty({ example: 'like' }) @IsString() @IsNotEmpty() reactionType: string;
}

export class CreateGroupDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() memberIds?: string[];
}

export class SendMessageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() messageText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() attachmentUrl?: string;
  @ApiPropertyOptional({ description: 'للمحادثات الفردية' }) @IsOptional() @IsString() receiverId?: string;
}

export class PostFilterDto {
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsEnum(PostType) type?: PostType;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
