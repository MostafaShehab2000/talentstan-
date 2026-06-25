import { Module } from '@nestjs/common';
import { PermissionPolicyService } from './permission-policy.service';
import { PermissionPolicyController } from './permission-policy.controller';

@Module({
  providers: [PermissionPolicyService],
  controllers: [PermissionPolicyController],
  exports: [PermissionPolicyService],
})
export class PermissionPolicyModule {}
