import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsModule } from '../agents/agents.module';
import { AppNotification } from './notification.entity';
import { NotificationsAgentController } from './notifications-agent.controller';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppNotification]), AgentsModule],
  providers: [NotificationsService],
  controllers: [NotificationsController, NotificationsAgentController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
