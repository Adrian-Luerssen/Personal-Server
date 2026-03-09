import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAuth } from '../system/auth/auth.decorator';
import * as fs from 'fs';
import * as path from 'path';

@Controller('agent-skill')
export class SkillController {
  @Get()
  @NoAuth()
  @Header('Content-Type', 'text/markdown')
  @ApiOperation({ summary: 'Get the agent skill document (no auth required)' })
  @ApiTags('Agent')
  getSkill() {
    const skillPath = path.join(process.cwd(), 'docs', 'agent-skill.md');
    return fs.readFileSync(skillPath, 'utf-8');
  }
}
