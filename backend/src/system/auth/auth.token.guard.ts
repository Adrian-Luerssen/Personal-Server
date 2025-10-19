import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RefreshTokenService } from "./refreshToken.service";
import { Account } from "../accounts/account.entity";

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    private refreshTokenService: RefreshTokenService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const noAuth = this.reflector.get<boolean>("no-auth", context.getHandler());
    const apiKeyAuth = this.reflector.get<boolean>(
      "apikey-auth",
      context.getHandler()
    );

    const request = context.switchToHttp().getRequest();

    if (noAuth || apiKeyAuth) {
      return true;
    }

    if (!request.headers.authorization) {
      return false;
    }
    let accessToken;
    if (request.headers.authorization.includes(" ")) {
      accessToken = request.headers.authorization.split(" ")[1];
    } else {
      accessToken = request.headers.authorization;
    }

    const account: Account = await this.refreshTokenService.validateAccessToken(
      accessToken
    );
    if (!account) {
      return false;
    }

    request.account = account;
    return true;
  }
}
