import { Module } from '@nestjs/common';
import { AppraisalService } from './appraisal.service';
import { AppraisalController } from './appraisal.controller';

@Module({
  providers: [AppraisalService],
  controllers: [AppraisalController],
  exports: [AppraisalService],
})
export class AppraisalModule {}
