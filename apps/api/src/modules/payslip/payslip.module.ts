import { Module } from '@nestjs/common';
import { PayslipService } from './payslip.service';
import { PayslipController } from './payslip.controller';

@Module({
  providers: [PayslipService],
  controllers: [PayslipController],
  exports: [PayslipService],
})
export class PayslipModule {}
