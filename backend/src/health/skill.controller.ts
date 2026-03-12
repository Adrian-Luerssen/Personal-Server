import { Controller, Get, Header, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAuth } from '../system/auth/auth.decorator';

const SKILL_URL = 'https://raw.githubusercontent.com/Adrian-Luerssen/Personal-Server/main/docs/agent-skill.md';

@Controller('agent-skill')
export class SkillController {
  @Get()
  @NoAuth()
  @Header('Content-Type', 'text/markdown')
  @ApiOperation({ summary: 'Get the agent skill document (no auth required)' })
  @ApiTags('Agent')
  async getSkill() {
    const res = await fetch(SKILL_URL);
    if (!res.ok) {
      throw new InternalServerErrorException('Failed to fetch agent skill document');
    }
    return res.text();
  }
}
