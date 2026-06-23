import {
  Controller, Get, Post, Delete, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommunicationService } from './communication.service';
import {
  CreatePostDto, CreateCommentDto, ReactToPostDto,
  CreateGroupDto, SendMessageDto, PostFilterDto,
} from './dto/communication.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';

@ApiTags('Internal Communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ── Feed ──
  @Post('posts')
  @ApiOperation({ summary: 'نشر منشور جديد' })
  createPost(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreatePostDto) {
    return this.communicationService.createPost(tenantId, user.id, dto);
  }

  @Get('feed')
  @ApiOperation({ summary: 'الـ Feed الرئيسي للموظف' })
  getFeed(@TenantId() tenantId: string, @CurrentUser() user: any, @Query() filter: PostFilterDto) {
    return this.communicationService.getFeed(tenantId, user.id, filter);
  }

  @Post('posts/:id/react')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تفاعل مع منشور (Like/إلغاء)' })
  react(@Param('id') postId: string, @CurrentUser() user: any, @Body() dto: ReactToPostDto) {
    return this.communicationService.reactToPost(postId, user.id, dto);
  }

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'إضافة تعليق' })
  addComment(@Param('id') postId: string, @CurrentUser() user: any, @Body() dto: CreateCommentDto) {
    return this.communicationService.addComment(postId, user.id, dto);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'تعليقات منشور' })
  getComments(
    @Param('id') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.communicationService.getComments(postId, +(page ?? 1), +(limit ?? 20));
  }

  @Get('posts/:id/analytics')
  @Roles('hr_admin')
  @ApiOperation({ summary: 'إحصائيات منشور (HR Admin)' })
  getAnalytics(@TenantId() tenantId: string, @Param('id') postId: string) {
    return this.communicationService.getPostAnalytics(tenantId, postId);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'حذف منشور' })
  deletePost(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') postId: string) {
    return this.communicationService.deletePost(tenantId, postId, user.id);
  }

  // ── Chat Groups ──
  @Post('groups')
  @ApiOperation({ summary: 'إنشاء مجموعة شات' })
  createGroup(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateGroupDto) {
    return this.communicationService.createGroup(tenantId, user.id, dto);
  }

  @Get('groups')
  @ApiOperation({ summary: 'مجموعاتي' })
  getMyGroups(@TenantId() tenantId: string, @CurrentUser() user: any) {
    return this.communicationService.getMyGroups(tenantId, user.id);
  }

  @Get('groups/:id/messages')
  @ApiOperation({ summary: 'رسائل مجموعة' })
  getGroupMessages(
    @Param('id') groupId: string,
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.communicationService.getGroupMessages(groupId, user.id, +(page ?? 1), +(limit ?? 50));
  }

  @Post('groups/:id/messages')
  @ApiOperation({ summary: 'إرسال رسالة في مجموعة' })
  sendGroupMessage(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id') groupId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.communicationService.sendMessage(tenantId, user.id, dto, groupId);
  }

  // ── Direct Messages ──
  @Post('dm')
  @ApiOperation({ summary: 'إرسال رسالة مباشرة (1:1)' })
  sendDM(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.communicationService.sendMessage(tenantId, user.id, dto);
  }

  @Get('dm/:peerId')
  @ApiOperation({ summary: 'محادثة فردية مع زميل' })
  getDM(
    @CurrentUser() user: any,
    @Param('peerId') peerId: string,
    @Query('page') page?: number,
  ) {
    return this.communicationService.getDirectMessages(user.id, peerId, +(page ?? 1));
  }
}
