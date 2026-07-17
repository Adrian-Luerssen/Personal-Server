import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
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
    const targets = [context.getHandler(), context.getClass()];
    const noAuth = this.reflector.getAllAndOverride<boolean>(
      "no-auth",
      targets
    );
    const apiKeyAuth = this.reflector.getAllAndOverride<boolean>(
      "apikey-auth",
      targets
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
    const roles =
      this.reflector.getAllAndOverride<string[]>("roles", targets) || [];
    if (roles.length && !roles.includes(account.role)) {
      throw new ForbiddenException("This action requires administrator access");
    }
    return true;
  }
}
