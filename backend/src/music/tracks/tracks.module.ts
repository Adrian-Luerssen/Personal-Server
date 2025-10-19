import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Track } from "./track.entity";
import { TracksService } from "./tracks.service";
import { TracksController } from "./tracks.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Track])],
  providers: [TracksService],
  controllers: [TracksController],
  exports: [TracksService],
})
export class TracksModule {}
