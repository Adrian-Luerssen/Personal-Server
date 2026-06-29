import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NoAuth } from '../system/auth/auth.decorator';
import { AppVersionsService } from './app-versions.service';

@ApiTags('App Versions')
@Controller('app/versions')
export class AppVersionsController {
  constructor(private readonly service: AppVersionsService) {}

  @NoAuth()
  @Get('status')
  @ApiOperation({ summary: 'Read app version policy for a native client' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'installedVersion', required: false })
  getStatus(
    @Query('platform') platform?: string,
    @Query('installedVersion') installedVersion?: string,
  ) {
    return this.service.getStatus({ platform, installedVersion });
  }

  @NoAuth()
  @Post('release')
  @ApiOperation({ summary: 'Upsert release metadata from the APK release workflow' })
  upsertRelease(
    @Headers('x-app-release-secret') secret: string | undefined,
    @Body() body: any,
  ) {
    const expected = process.env.APP_RELEASE_SYNC_SECRET;
    if (!expected || secret !== expected) {
      throw new ForbiddenException('invalid app release sync secret');
    }
    return this.service.upsertRelease(body);
  }
}
