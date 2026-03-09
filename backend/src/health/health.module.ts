import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SkillController } from './skill.controller';

@Module({
  controllers: [HealthController, SkillController],
})
export class HealthModule {}
