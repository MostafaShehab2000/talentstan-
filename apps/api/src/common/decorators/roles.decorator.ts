import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: EmployeeRole[]) =>
  SetMetadata(ROLES_KEY, roles);
