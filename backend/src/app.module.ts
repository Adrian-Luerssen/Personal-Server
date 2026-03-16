import { CacheModule, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
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
import { WorkoutModule } from "./workout/workout.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { FinanceModule } from "./finance/finance.module";
import { HabitsModule } from "./habits/habits.module";
import { AgentsModule } from "./agents/agents.module";
import { ApiV1Module } from "./api/v1/api-v1.module";
import { ChatModule } from "./chat/chat.module";
import { MediaModule } from "./media/media.module";

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
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
      ttl: 30,
      max: 500,
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    }),

    SystemModule,
    MusicModule,
    WorkoutModule,
    DashboardModule,
    FinanceModule,
    HabitsModule,
    AgentsModule,
    ApiV1Module,
    ChatModule,
    MediaModule,
    HealthModule,
    TypeOrmModule.forFeature([Tool]),
  ],
  controllers: [ToolController],
})
export class AppModule {}
