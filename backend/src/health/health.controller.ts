import { Controller, Get, HttpStatus, Response } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAuth } from '../system/auth/auth.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @NoAuth()
  @ApiOperation({ summary: 'Health check for high availability!' })
  @ApiTags('Health')
  health(@Response() resp) {
    return resp.status(HttpStatus.OK).json({ message: 'Service running!!!' });
  }
}
