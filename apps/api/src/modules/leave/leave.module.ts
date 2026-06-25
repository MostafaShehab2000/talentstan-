import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { PermissionPolicyModule } from '../permission-policy/permission-policy.module';

@Module({
  imports: [WorkflowModule, PermissionPolicyModule],
  providers: [LeaveService],
  controllers: [LeaveController],
  exports: [LeaveService],
})
export class LeaveModule {}
