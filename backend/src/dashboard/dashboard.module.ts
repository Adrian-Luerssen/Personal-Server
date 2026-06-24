import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { Stream } from "../music/streams/stream.entity";
import { Track } from "../music/tracks/track.entity";
import { WorkoutSession } from "../workout/sessions/session.entity";
import { SyncModule } from "../sync/sync.module";

@Module({
  imports: [TypeOrmModule.forFeature([Stream, Track, WorkoutSession]), SyncModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
