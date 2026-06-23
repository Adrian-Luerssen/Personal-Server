import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../system/auth/auth.decorator';
import { Account } from '../system/accounts/account.entity';
import { SyncService } from './sync.service';

@ApiTags('Sync')
@ApiBearerAuth('access-token')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('changes')
  @ApiOperation({ summary: 'Get account-scoped changes after a sync cursor' })
  @ApiQuery({ name: 'since', required: false, description: 'Last applied event sequence' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum events to return' })
  getChanges(
    @ReqUser() account: Account,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
  ) {
    return this.syncService.getChanges(
      account.id,
      since ? Number(since) : 0,
      limit ? Number(limit) : 500,
    );
  }

  @Get('watermarks')
  @ApiOperation({ summary: 'Get per-domain sync watermarks for local data validity checks' })
  async getWatermarks(@ReqUser() account: Account) {
    return {
      accountId: account.id,
      watermarks: await this.syncService.getWatermarks(account.id),
      checkedAt: new Date().toISOString(),
    };
  }

  @Get('bootstrap')
  @ApiOperation({ summary: 'Get initial sync metadata and first change batch' })
  async bootstrap(@ReqUser() account: Account) {
    const [changes, watermarks] = await Promise.all([
      this.syncService.getChanges(account.id, 0, 1000),
      this.syncService.getWatermarks(account.id),
    ]);

    return {
      accountId: account.id,
      cursor: changes.nextCursor,
      watermarks,
      events: changes.events,
      checkedAt: new Date().toISOString(),
    };
  }
}
