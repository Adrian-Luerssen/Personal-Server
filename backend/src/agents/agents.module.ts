import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentKey } from './entities/agent-key.entity';
import { AgentKeysService } from './agent-keys.service';
import { AgentKeysController } from './agent-keys.controller';
import { AgentKeyGuard } from './guards/agent-key.guard';
import { ScopeGuard } from './guards/scope.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AgentKey])],
  providers: [AgentKeysService, AgentKeyGuard, ScopeGuard],
  controllers: [AgentKeysController],
  exports: [AgentKeysService, AgentKeyGuard, ScopeGuard],
})
export class AgentsModule {}
