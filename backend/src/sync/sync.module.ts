import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncClientMutation } from './sync-client-mutation.entity';
import { SyncEvent } from './sync-event.entity';
import { SyncService } from './sync.service';

@Module({
  imports: [TypeOrmModule.forFeature([SyncEvent, SyncClientMutation])],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
