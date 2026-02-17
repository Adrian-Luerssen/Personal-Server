import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AgentKeysService } from './agent-keys.service';
import { CreateAgentKeyDto } from './dto/create-agent-key.dto';
import { UpdateAgentKeyDto } from './dto/update-agent-key.dto';
import { ReqUser } from '../system/auth/auth.decorator';
import { Account } from '../system/accounts/account.entity';

/**
 * Management endpoints for agent API keys.
 * Protected by the global JWT guard (requires authenticated user session).
 *
 * These endpoints let users create, list, update, and revoke API keys
 * that agents (like Claudia) can use to access personal data.
 */
@ApiTags('Agent Keys')
@ApiBearerAuth('access-token')
@Controller('agents/keys')
export class AgentKeysController {
  constructor(private readonly service: AgentKeysService) {}

  @ApiOperation({ summary: 'Create a new API key (raw key returned only once)' })
  @Post()
  async createKey(
    @ReqUser() account: Account,
    @Body() dto: CreateAgentKeyDto,
  ) {
    return this.service.createKey(account, dto);
  }

  @ApiOperation({ summary: 'List all API keys for the authenticated account (masked)' })
  @Get()
  async listKeys(@ReqUser() account: Account) {
    return this.service.listKeys(account.id);
  }

  @ApiOperation({ summary: 'Get a specific API key (masked)' })
  @Get(':id')
  async getKey(@ReqUser() account: Account, @Param('id') id: string) {
    return this.service.getKey(account.id, id);
  }

  @ApiOperation({ summary: 'Update a key (name, scopes, active status, etc.)' })
  @Patch(':id')
  async updateKey(
    @ReqUser() account: Account,
    @Param('id') id: string,
    @Body() dto: UpdateAgentKeyDto,
  ) {
    return this.service.updateKey(account.id, id, dto);
  }

  @ApiOperation({ summary: 'Revoke (deactivate) an API key' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeKey(@ReqUser() account: Account, @Param('id') id: string) {
    await this.service.revokeKey(account.id, id);
  }
}
