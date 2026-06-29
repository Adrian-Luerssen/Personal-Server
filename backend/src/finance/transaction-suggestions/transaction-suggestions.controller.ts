import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../../system/auth/auth.decorator';
import { Account } from '../../system/accounts/account.entity';
import {
  TransactionSuggestionStatus,
} from '../entities/transaction-suggestion.entity';
import { TransactionSuggestionsService } from './transaction-suggestions.service';

@ApiTags('Finance - Transaction Suggestions')
@ApiBearerAuth('access-token')
@Controller('finance/transaction-suggestions')
export class TransactionSuggestionsController {
  constructor(private readonly service: TransactionSuggestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get detected transaction suggestions' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@ReqUser() account: Account, @Query('status') status?: TransactionSuggestionStatus) {
    return this.service.findAll(account, status || TransactionSuggestionStatus.PENDING);
  }

  @Post()
  @ApiOperation({ summary: 'Create a detected transaction suggestion' })
  create(@ReqUser() account: Account, @Body() body: any) {
    return this.service.createFromDetection(account, body || {});
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a detected transaction suggestion' })
  accept(@ReqUser() account: Account, @Param('id') id: string, @Body() body: any) {
    return this.service.accept(account, id, body || {});
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a detected transaction suggestion' })
  reject(@ReqUser() account: Account, @Param('id') id: string) {
    return this.service.reject(account, id);
  }
}
