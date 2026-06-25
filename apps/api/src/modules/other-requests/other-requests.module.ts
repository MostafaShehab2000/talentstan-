import { Module } from '@nestjs/common';
import { OtherRequestsService } from './other-requests.service';
import { OtherRequestsController } from './other-requests.controller';

@Module({
  providers: [OtherRequestsService],
  controllers: [OtherRequestsController],
})
export class OtherRequestsModule {}
