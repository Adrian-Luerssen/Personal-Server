import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReqUser } from '../auth/auth.decorator';
import { Account } from '../accounts/account.entity';
import { DataService } from './data.service';

@ApiTags('Data Management')
@ApiBearerAuth('access-token')
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @ApiOperation({ summary: 'Delete all workout data (sessions, sets, exercises, categories, bodyweight, routines)' })
  @Delete('workout')
  @HttpCode(HttpStatus.OK)
  async deleteWorkout(@ReqUser() account: Account) {
    return this.dataService.deleteWorkoutData(account.id);
  }

  @ApiOperation({ summary: 'Delete all finance data (transactions, wallets, categories, subscriptions)' })
  @Delete('finance')
  @HttpCode(HttpStatus.OK)
  async deleteFinance(@ReqUser() account: Account) {
    return this.dataService.deleteFinanceData(account.id);
  }

  @ApiOperation({ summary: 'Delete all habits data (habits and entries)' })
  @Delete('habits')
  @HttpCode(HttpStatus.OK)
  async deleteHabits(@ReqUser() account: Account) {
    return this.dataService.deleteHabitsData(account.id);
  }

  @ApiOperation({ summary: 'Delete all music data (streams, tracks, albums, artists, playlists)' })
  @Delete('music')
  @HttpCode(HttpStatus.OK)
  async deleteMusic(@ReqUser() account: Account) {
    return this.dataService.deleteMusicData(account.id);
  }

  @ApiOperation({ summary: 'Delete all chat data (conversations and messages)' })
  @Delete('chat')
  @HttpCode(HttpStatus.OK)
  async deleteChat(@ReqUser() account: Account) {
    return this.dataService.deleteChatData(account.id);
  }

  @ApiOperation({ summary: 'Delete all series data (titles, seasons, episodes, and relations)' })
  @Delete('media')
  @HttpCode(HttpStatus.OK)
  async deleteMedia(@ReqUser() account: Account) {
    return this.dataService.deleteMediaData(account.id);
  }
}
