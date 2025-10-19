import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthConfiguration {
  constructor(private configService: ConfigService) {}

  public jwtKey(): string {
    return this.configService.get<string>('JWT_KEY');
  }
  public accessTokenExpire(): number {
    return parseInt(
      this.configService.get<string>('AUTH_ACCESS_EXPIRE') || '600',
      10,
    );
  }
  public refreshTokenExpire(rememberMe: boolean): number {
    if (rememberMe) {
      return parseInt(
        this.configService.get<string>('AUTH_REFRESH_EXPIRE_REMEMBER') ||
          '2592000',
        10,
      );
    }
    return parseInt(
      this.configService.get<string>('AUTH_REFRESH_EXPIRE') || '36000',
      10,
    );
  }
  public hashRounds(): number {
    return (
      parseInt(this.configService.get<string>('AUTH_HASH_ROUNDS'), 10) || 10
    );
  }
}
