import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';

@Module({
  imports: [ConversationsModule],
  controllers: [ActionsController],
  providers: [ActionsService],
})
export class ActionsModule {}
