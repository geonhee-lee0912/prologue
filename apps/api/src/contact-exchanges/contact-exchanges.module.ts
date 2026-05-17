import { Module } from '@nestjs/common';
import { ContactExchangesController } from './contact-exchanges.controller';
import { ContactExchangesService } from './contact-exchanges.service';

@Module({
  controllers: [ContactExchangesController],
  providers: [ContactExchangesService],
})
export class ContactExchangesModule {}
