import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateTicketDto, UpdateTicketDto,
  AddTicketMessageDto, TicketFilterDto,
} from './dto/helpdesk.dto';

@Injectable()
export class HelpdeskService {
  constructor(private prisma: PrismaService) {}

  // ── Categories ──
  async createCategory(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.helpdeskCategory.create({
      data: {
        tenantId,
        name: dto.name,
        assignedGroup: dto.assignedGroup,
        defaultPriority: dto.defaultPriority ?? 'medium',
      },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.helpdeskCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { tickets: true } } },
    });
  }

  async updateCategory(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.findCategoryOrThrow(tenantId, id);
    return this.prisma.helpdeskCategory.update({ where: { id }, data: dto });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.findCategoryOrThrow(tenantId, id);
    return this.prisma.helpdeskCategory.delete({ where: { id } });
  }

  private async findCategoryOrThrow(tenantId: string, id: string) {
    const cat = await this.prisma.helpdeskCategory.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('التصنيف غير موجود');
    return cat;
  }

  // ── Tickets ──
  async createTicket(tenantId: string, employeeId: string, dto: CreateTicketDto) {
    await this.findCategoryOrThrow(tenantId, dto.categoryId);

    // Generate unique ticket number
    const count = await this.prisma.helpdeskTicket.count({ where: { tenantId } });
    const ticketNumber = `TKT-${Date.now()}-${(count + 1).toString().padStart(4, '0')}`;

    return this.prisma.helpdeskTicket.create({
      data: {
        tenantId,
        employeeId,
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        categoryId: dto.categoryId,
        priority: dto.priority ?? 'medium',
        status: 'open',
      },
      include: {
        employee: { select: { id: true, fullName: true } },
        category: true,
      },
    });
  }

  async getTickets(tenantId: string, filter: TicketFilterDto) {
    const { status, priority, categoryId, assignedToId, page = 1, limit = 20 } = filter;
    const skip = (+page - 1) * +limit;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (assignedToId) where.assignedToId = assignedToId;

    const [tickets, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where, skip, take: +limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          employee: { select: { id: true, fullName: true } },
          assignedTo: { select: { id: true, fullName: true } },
          category: true,
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ]);
    return { data: tickets, total, page: +page, limit: +limit };
  }

  async getMyTickets(tenantId: string, employeeId: string) {
    return this.prisma.helpdeskTicket.findMany({
      where: { tenantId, employeeId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        assignedTo: { select: { id: true, fullName: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  async getTicketById(tenantId: string, ticketId: string, actorId: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        employee: { select: { id: true, fullName: true, profilePhotoUrl: true } },
        assignedTo: { select: { id: true, fullName: true } },
        category: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة');
    if (ticket.employeeId !== actorId) {
      const actor = await this.prisma.employee.findFirst({
        where: { id: actorId, tenantId }, include: { roles: true },
      });
      const isHR = actor?.roles.some((r) => ['hr_admin', 'super_admin'].includes(r.role));
      if (!isHR && ticket.assignedToId !== actorId)
        throw new ForbiddenException('ليس لديك صلاحية لعرض هذه التذكرة');
    }
    return ticket;
  }

  async updateTicket(tenantId: string, ticketId: string, actorId: string, dto: UpdateTicketDto) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة');

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.assignedToId !== undefined) updateData.assignedToId = dto.assignedToId;
    if (dto.status === 'resolved') updateData.resolvedAt = new Date();
    if (dto.status === 'closed') updateData.closedAt = new Date();

    return this.prisma.helpdeskTicket.update({ where: { id: ticketId }, data: updateData });
  }

  async addMessage(tenantId: string, ticketId: string, senderId: string, dto: AddTicketMessageDto) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({ where: { id: ticketId, tenantId } });
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة');
    if (ticket.status === 'closed') throw new ForbiddenException('التذكرة مغلقة');

    return this.prisma.helpdeskTicketMessage.create({
      data: {
        ticketId,
        senderId,
        message: dto.message,
        attachmentUrl: dto.attachmentUrl,
        isInternalNote: dto.isInternalNote ?? false,
      },
      include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    });
  }

  async getReport(tenantId: string) {
    const [byStatus, byPriority] = await Promise.all([
      this.prisma.helpdeskTicket.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      this.prisma.helpdeskTicket.groupBy({ by: ['priority'], where: { tenantId }, _count: true }),
    ]);

    const resolvedTickets = await this.prisma.helpdeskTicket.findMany({
      where: { tenantId, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    const avgResolutionHours =
      resolvedTickets.length > 0
        ? resolvedTickets.reduce((sum, t) => {
            const diff = (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 1000 / 60 / 60;
            return sum + diff;
          }, 0) / resolvedTickets.length
        : null;

    return { byStatus, byPriority, avgResolutionHours };
  }
}
