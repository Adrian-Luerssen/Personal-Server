import { Controller, Get, Header, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAuth } from '../system/auth/auth.decorator';
import axios from 'axios';

const SKILL_URL = 'https://raw.githubusercontent.com/Adrian-Luerssen/Personal-Server/main/docs/agent-skill.md';

@Controller('agent-skill')
export class SkillController {
  @Get()
  @NoAuth()
  @Header('Content-Type', 'text/markdown')
  @ApiOperation({ summary: 'Get the agent skill document (no auth required)' })
  @ApiTags('Agent')
  async getSkill(): Promise<string> {
    try {
      const { data } = await axios.get<string>(SKILL_URL, {
        responseType: 'text',
        timeout: 10000,
      });
      return data;
    } catch {
      throw new InternalServerErrorException('Failed to fetch agent skill document');
    }
  }
}
