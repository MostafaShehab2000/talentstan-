import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { LeaveModule } from './modules/leave/leave.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module';
import { PayslipModule } from './modules/payslip/payslip.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { AppraisalModule } from './modules/appraisal/appraisal.module';
import { JobTitlesModule } from './modules/job-titles/job-titles.module';
import { PermissionPolicyModule } from './modules/permission-policy/permission-policy.module';
import { OtherRequestsModule } from './modules/other-requests/other-requests.module';
import { FcmModule } from './common/notifications/fcm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FcmModule,
    PrismaModule,
    AuthModule,
    TenantsModule,
    EmployeesModule,
    DepartmentsModule,
    JobTitlesModule,
    WorkflowModule,
    LeaveModule,
    RecruitmentModule,
    CommunicationModule,
    HelpdeskModule,
    PayslipModule,
    SurveysModule,
    AppraisalModule,
    PermissionPolicyModule,
    OtherRequestsModule,
  ],
})
export class AppModule {}
