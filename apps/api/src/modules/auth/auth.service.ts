import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const { identifier, password, tenantId } = dto;

    // البحث عن الموظف — لو tenantId موجود نفلتر عليه، لو لأ نبحث بالإيميل في كل الشركات
    const employee = await this.prisma.employee.findFirst({
      where: {
        status: 'active',
        ...(tenantId ? { tenantId } : {}),
        OR: [{ email: identifier }, { employeeCode: identifier }],
      },
      include: { roles: true, tenant: true },
    });

    if (!employee || !employee.passwordHash) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    // التأكد إن الشركة نشطة
    const tenant = employee.tenant;
    if (!tenant || tenant.status !== 'active') {
      throw new UnauthorizedException('الشركة غير موجودة أو الاشتراك منتهي');
    }

    if (!employee || !employee.passwordHash) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const isValid = await bcrypt.compare(password, employee.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const roles = employee.roles.map((r) => r.role);
    const payload = {
      sub: employee.id,
      tenantId: employee.tenantId,
      roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        email: employee.email,
        profilePhotoUrl: employee.profilePhotoUrl,
        isManager: employee.isManager,
        roles,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const newPayload: any = {
        sub: payload.sub,
        tenantId: payload.tenantId,
        roles: payload.roles,
      };
      if (payload.isSuperAdmin) newPayload.isSuperAdmin = true;

      return {
        accessToken: this.jwtService.sign(newPayload),
        refreshToken: this.jwtService.sign(newPayload, {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
        }),
      };
    } catch {
      throw new UnauthorizedException('Refresh token منتهي أو غير صالح');
    }
  }

  async superAdminLogin(email: string, password: string) {
    // Super admin credentials from env (not stored in DB for security)
    const superAdminEmail = this.configService.get('SUPER_ADMIN_EMAIL');
    const superAdminPassword = this.configService.get('SUPER_ADMIN_PASSWORD');

    if (email !== superAdminEmail || password !== superAdminPassword) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    const payload = {
      sub: 'super-admin',
      tenantId: null,
      roles: ['super_admin'],
      isSuperAdmin: true,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
      }),
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
