import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as httpContext from "express-http-context";
import { RefreshTokenService } from "./refreshToken.service";
import { RequestContextProvider } from "./requestContext.provider";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private requestContextProvider: RequestContextProvider,
    private refreshTokenService: RefreshTokenService
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    httpContext.middleware(req, res, () => {
      try {
        if (req.baseUrl.includes("api/auth/refresh")) {
          return next(); // No validar el token en /refresh, dejamos pasar la solicitud
        }
        if (req.headers.authorization) {
          const [, token] = req.headers.authorization.split(" ");
          const decoded = this.refreshTokenService.decodeAccessToken(token);
          this.requestContextProvider.setAuth(decoded);
          // Also attempt to resolve the full Account entity and attach it to the request
          // so decorators/handlers that expect `request.account` will find it.
          try {
            // validateAccessToken returns the Account entity when valid
            // cast req to any to allow attaching a custom property
            this.refreshTokenService
              .validateAccessToken(token)
              .then((account) => {
                try {
                  (req as any).account = account;
                } catch (e) {
                  // swallow assignment errors
                }
              })
              .catch(() => {
                // ignore validation errors here; guard will handle auth failure
              });
          } catch (e) {
            // ignore
          }
        }
        next();
      } catch (error) {
        // if error is not http exception, return 500
        if (!(error instanceof HttpException)) {
          // try converting to http exception and see if it has a valid status code
          console.error("Internal Server Error:", error); // Log the error for debugging7

          const httpException = new HttpException(
            "Internal Server Error",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
          next(httpException);
        }
        next(error);
      }
    });
  }
}
