import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SystemModule } from "./system/system.module";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AppExceptionFilter } from "./app-exception.filter";
import { HealthModule } from "./health/health.module";
import { TimeoutInterceptor } from "./timeout.interceptor";
import { AppDataSource } from "./dataSource";
import { Tool } from "./tools/tool.entity";
import { ToolService } from "./tools/tool.service";
import { ToolController } from "./tools/tool.controller";
import { MusicModule } from "./music/music.module";

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    ToolService,
  ],
  exports: [],
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    }),

    SystemModule,
    MusicModule,
    HealthModule,
    TypeOrmModule.forFeature([Tool]),
  ],
  controllers: [ToolController],
})
export class AppModule {}
