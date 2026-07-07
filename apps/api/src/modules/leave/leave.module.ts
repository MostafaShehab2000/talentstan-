import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { PermissionPolicyModule } from '../permission-policy/permission-policy.module';

@Module({
  imports: [PermissionPolicyModule],
  providers: [LeaveService],
  controllers: [LeaveController],
  exports: [LeaveService],
})
export class LeaveModule {}
