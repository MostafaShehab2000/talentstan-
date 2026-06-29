import { Module } from '@nestjs/common';
import { OtherRequestsService } from './other-requests.service';
import { OtherRequestsController } from './other-requests.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  providers: [OtherRequestsService],
  controllers: [OtherRequestsController],
})
export class OtherRequestsModule {}
