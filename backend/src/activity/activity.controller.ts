import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../system/auth/auth.decorator';
import { Account } from '../system/accounts/account.entity';
import { ActivityService } from './activity.service';

@ApiTags('Activity')
@ApiBearerAuth('access-token')
@Controller('activity/daily')
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'Get daily activity metrics' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'source', required: false })
  findDaily(
    @ReqUser() account: Account,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('source') source?: string,
  ) {
    return this.service.findDaily(account, { from, to, source });
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync daily activity metrics from a mobile provider' })
  syncDaily(@ReqUser() account: Account, @Body() body: any) {
    return this.service.syncDailyMetrics(account, body || {});
  }
}
