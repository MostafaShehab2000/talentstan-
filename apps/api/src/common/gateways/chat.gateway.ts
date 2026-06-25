import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.query?.token;
      const payload = this.jwt.verify(token as string, { secret: this.config.get('JWT_SECRET') });
      client.data.userId   = payload.sub;
      client.data.tenantId = payload.tenantId;
      client.join(`tenant:${payload.tenantId}`);
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    client.rooms.forEach(r => client.leave(r));
  }

  @SubscribeMessage('join_group')
  async joinGroup(@ConnectedSocket() client: Socket, @MessageBody() groupId: string) {
    client.join(`group:${groupId}`);
    return { ok: true };
  }

  @SubscribeMessage('group_message')
  async groupMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { groupId: string; content: string }) {
    const { groupId, content } = data;
    const msg = await this.prisma.chatMessage.create({
      data: { senderId: client.data.userId, groupId, content },
      include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    });
    this.server.to(`group:${groupId}`).emit('new_message', msg);
    return msg;
  }

  @SubscribeMessage('dm_message')
  async dmMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { recipientId: string; content: string }) {
    const { recipientId, content } = data;
    const msg = await this.prisma.chatMessage.create({
      data: { senderId: client.data.userId, recipientId, content },
      include: { sender: { select: { id: true, fullName: true, profilePhotoUrl: true } } },
    });
    this.server.to(`user:${recipientId}`).to(`user:${client.data.userId}`).emit('new_dm', msg);
    return msg;
  }
}
