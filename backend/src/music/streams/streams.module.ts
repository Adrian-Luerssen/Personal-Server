import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Stream } from "./stream.entity";
import { StreamsService } from "./streams.service";
import { StreamsController } from "./streams.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Stream])],
  providers: [StreamsService],
  controllers: [StreamsController],
  exports: [StreamsService],
})
export class StreamsModule {}
