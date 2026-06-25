import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  roles: string[];
  isSuperAdmin?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    console.log('[JWT validate]', JSON.stringify(payload));
    if (payload.isSuperAdmin) {
      return { id: payload.sub, roles: payload.roles, isSuperAdmin: true };
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, status: 'active' },
      include: { roles: true },
    });

    if (!employee) {
      throw new UnauthorizedException('الجلسة منتهية أو الحساب غير نشط');
    }

    return {
      id: employee.id,
      tenantId: employee.tenantId,
      employeeCode: employee.employeeCode,
      roles: employee.roles.map((r) => r.role),
      isManager: employee.isManager,
    };
  }
}
