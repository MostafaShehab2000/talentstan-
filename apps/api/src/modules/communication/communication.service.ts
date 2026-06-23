import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePostDto, CreateCommentDto, ReactToPostDto,
  CreateGroupDto, SendMessageDto, PostFilterDto,
} from './dto/communication.dto';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService) {}

  // ══════════════ FEED ══════════════

  async createPost(tenantId: string, authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        tenantId,
        authorId,
        content: dto.content,
        mediaUrls: dto.mediaUrls,
        postType: dto.postType ?? 'normal',
        targetScope: dto.targetScope ?? 'company',
        targetDepartmentIds: dto.targetDepartmentIds ?? [],
        isPinned: dto.isPinned ?? false,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        author: { select: { id: true, fullName: true, profilePhotoUrl: true, jobTitle: true } },
        _count: { select: { reactions: true, comments: true } },
      },
    });
  }

  async getFeed(tenantId: string, employeeId: string, filter: PostFilterDto) {
    const { page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;
    const now = new Date();

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      select: { departmentId: true },
    });

    const where: any = {
      tenantId,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        {
          OR: [
            { targetScope: 'company' },
            { targetScope: 'department', targetDepartmentIds: { has: employee?.departmentId ?? '' } },
            { authorId: employeeId },
          ],
        },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: +limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          author: { select: { id: true, fullName: true, profilePhotoUrl: true, jobTitle: true } },
          _count: { select: { reactions: true, comments: true, views: true } },
          reactions: { where: { employeeId }, select: { reactionType: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    // تسجيل المشاهدة بشكل async
    const postIds = posts.map((p) => p.id);
    this.prisma.postView.createMany({
      data: postIds.map((postId) => ({ postId, employeeId })),
      skipDuplicates: true,
    }).catch(() => {});

    return { data: posts, total, page: +page, limit: +limit };
  }

  async reactToPost(postId: string, employeeId: string, dto: ReactToPostDto) {
    const existing = await this.prisma.postReaction.findUnique({
      where: { postId_employeeId: { postId, employeeId } },
    });
    if (existing) {
      if (existing.reactionType === dto.reactionType) {
        await this.prisma.postReaction.delete({ where: { postId_employeeId: { postId, employeeId } } });
        return { action: 'removed' };
      }
      await this.prisma.postReaction.update({
        where: { postId_employeeId: { postId, employeeId } },
        data: { reactionType: dto.reactionType },
      });
      return { action: 'updated' };
    }
    await this.prisma.postReaction.create({ data: { postId, employeeId, reactionType: dto.reactionType } });
    return { action: 'added' };
  }

  async addComment(postId: string, employeeId: string, dto: CreateCommentDto) {
    return this.prisma.postComment.create({
      data: { postId, employeeId, comment: dto.comment },
      include: { employee: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    });
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const skip = (+page - 1) * +limit;
    const [comments, total] = await Promise.all([
      this.prisma.postComment.findMany({
        where: { postId },
        skip, take: +limit,
        orderBy: { createdAt: 'asc' },
        include: { employee: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
      }),
      this.prisma.postComment.count({ where: { postId } }),
    ]);
    return { data: comments, total };
  }

  async getPostAnalytics(tenantId: string, postId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, tenantId } });
    if (!post) throw new NotFoundException('المنشور غير موجود');
    const [views, reactions, comments] = await Promise.all([
      this.prisma.postView.count({ where: { postId } }),
      this.prisma.postReaction.groupBy({ by: ['reactionType'], where: { postId }, _count: true }),
      this.prisma.postComment.count({ where: { postId } }),
    ]);
    return { views, reactions, comments };
  }

  async deletePost(tenantId: string, postId: string, actorId: string) {
    const post = await this.prisma.post.findFirst({ where: { id: postId, tenantId } });
    if (!post) throw new NotFoundException('المنشور غير موجود');
    const actor = await this.prisma.employee.findFirst({
      where: { id: actorId, tenantId },
      include: { roles: true },
    });
    const isHR = actor?.roles.some((r) => r.role === 'hr_admin');
    if (post.authorId !== actorId && !isHR)
      throw new ForbiddenException('لا يمكنك حذف هذا المنشور');
    return this.prisma.post.delete({ where: { id: postId } });
  }

  // ══════════════ CHAT ══════════════

  async createGroup(tenantId: string, createdById: string, dto: CreateGroupDto) {
    const group = await this.prisma.chatGroup.create({
      data: {
        tenantId,
        name: dto.name,
        createdById,
        isDepartmentGroup: false,
        members: {
          create: [
            { employeeId: createdById },
            ...(dto.memberIds ?? [])
              .filter((id) => id !== createdById)
              .map((id) => ({ employeeId: id })),
          ],
        },
      },
      include: {
        members: { include: { employee: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
      },
    });
    return group;
  }

  async getMyGroups(tenantId: string, employeeId: string) {
    return this.prisma.chatGroup.findMany({
      where: { tenantId, members: { some: { employeeId } } },
      include: {
        members: { include: { employee: { select: { id: true, fullName: true, profilePhotoUrl: true } } } },
        messages: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroupMessages(groupId: string, employeeId: string, page = 1, limit = 50) {
    const member = await this.prisma.chatGroupMember.findUnique({
      where: { chatGroupId_employeeId: { chatGroupId: groupId, employeeId } },
    });
    if (!member) throw new ForbiddenException('لست عضوًا في هذه المجموعة');

    const skip = (+page - 1) * +limit;
    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { chatGroupId: groupId },
        skip, take: +limit,
        orderBy: { sentAt: 'desc' },
        include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
      }),
      this.prisma.chatMessage.count({ where: { chatGroupId: groupId } }),
    ]);
    return { data: messages.reverse(), total, page: +page, limit: +limit };
  }

  async sendMessage(tenantId: string, senderId: string, dto: SendMessageDto, groupId?: string) {
    return this.prisma.chatMessage.create({
      data: {
        chatGroupId: groupId ?? null,
        senderId,
        receiverId: dto.receiverId,
        messageText: dto.messageText,
        attachmentUrl: dto.attachmentUrl,
      },
      include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    });
  }

  async getDirectMessages(employeeId: string, peerId: string, page = 1, limit = 50) {
    const skip = (+page - 1) * +limit;
    const where = {
      chatGroupId: null,
      OR: [
        { senderId: employeeId, receiverId: peerId },
        { senderId: peerId, receiverId: employeeId },
      ],
    };
    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where, skip, take: +limit,
        orderBy: { sentAt: 'desc' },
        include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
      }),
      this.prisma.chatMessage.count({ where }),
    ]);
    return { data: messages.reverse(), total };
  }

  // إنشاء جروب تلقائي عند إنشاء قسم جديد
  async createDepartmentGroup(tenantId: string, departmentId: string, departmentName: string) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, departmentId, status: 'active' },
      select: { id: true },
    });
    return this.prisma.chatGroup.create({
      data: {
        tenantId,
        name: `${departmentName} — Group`,
        isDepartmentGroup: true,
        departmentId,
        members: { create: employees.map((e) => ({ employeeId: e.id })) },
      },
    });
  }
}
