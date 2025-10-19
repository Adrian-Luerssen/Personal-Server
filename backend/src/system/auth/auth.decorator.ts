import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { RequestContextProvider } from "./requestContext.provider";

export const NoAuth = () => SetMetadata("no-auth", true);
export const ApiKey = () => SetMetadata("apikey-auth", true);
export const AuthType = (type: "token" | "apikey") =>
  SetMetadata("auth-type", type);

// Prefer request.account (set by AuthTokenGuard), then request.user, then
// fallback to request context provider's 'auth' payload (if present).
export const ReqUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.account) return request.account;
    if (request.user) return request.user;
    // try request context
    try {
      // lazy require to avoid circular deps
      // NOTE: requestContext.provider uses express-http-context, so values are per-request
      // we try to get the auth payload if present
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RequestContextProvider } = require("./requestContext.provider");
      const provider = new RequestContextProvider();
      const auth = provider.get("auth");
      return auth || null;
    } catch (e) {
      return null;
    }
  }
);
