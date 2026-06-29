import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../system/auth/auth.decorator';
import { Account } from '../system/accounts/account.entity';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List pending notifications ready for this account' })
  async pending(@ReqUser() account: Account, @Query('limit') limit?: string) {
    return this.notificationsService.listPending(account.id, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id/delivered')
  @ApiOperation({ summary: 'Mark a notification delivered on this device' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async delivered(@ReqUser() account: Account, @Param('id') id: string) {
    return this.notificationsService.markDelivered(id, account.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async read(@ReqUser() account: Account, @Param('id') id: string) {
    return this.notificationsService.markRead(id, account.id);
  }
}
