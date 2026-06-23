import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Stream } from "./stream.entity";
import { StreamsService } from "./streams.service";
import { StreamsController } from "./streams.controller";
import { SyncModule } from "../../sync/sync.module";

@Module({
  imports: [TypeOrmModule.forFeature([Stream]), SyncModule],
  providers: [StreamsService],
  controllers: [StreamsController],
  exports: [StreamsService],
})
export class StreamsModule {}
