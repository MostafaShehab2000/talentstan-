import { Module } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentController } from './recruitment.controller';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [WorkflowModule],
  providers: [RecruitmentService],
  controllers: [RecruitmentController],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
