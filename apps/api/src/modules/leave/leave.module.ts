import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  providers: [LeaveService],
  controllers: [LeaveController],
  exports: [LeaveService],
})
export class LeaveModule {}
