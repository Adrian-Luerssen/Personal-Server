import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AgentKeyGuard } from '../agents/guards/agent-key.guard';
import { ScopeGuard } from '../agents/guards/scope.guard';
import { RequireScope } from '../agents/decorators/require-scope.decorator';
import { ReqAgentKey } from '../agents/decorators/req-agent-key.decorator';
import { AgentKey } from '../agents/entities/agent-key.entity';
import { ApiKey } from '../system/auth/auth.decorator';
import {
  CreateAgentNotificationDto,
  NotificationsService,
} from './notifications.service';

@ApiTags('API v1 - Notifications')
@ApiSecurity('api-key')
@UseGuards(AgentKeyGuard, ScopeGuard)
@Controller('v1/notifications')
export class NotificationsAgentController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequireScope('notifications:write')
  @ApiKey()
  @ApiOperation({ summary: 'Create a custom notification for the owning user' })
  async create(
    @ReqAgentKey() key: AgentKey,
    @Body() body: CreateAgentNotificationDto,
  ) {
    return this.notificationsService.createAgentNotification(
      key.accountId,
      key.id,
      body,
    );
  }
}
