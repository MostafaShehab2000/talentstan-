import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { LeaveModule } from './modules/leave/leave.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    EmployeesModule,
    DepartmentsModule,
    WorkflowModule,
    LeaveModule,
  ],
})
export class AppModule {}
