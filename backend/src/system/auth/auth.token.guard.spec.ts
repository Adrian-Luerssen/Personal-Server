import { ForbiddenException } from "@nestjs/common";
jest.mock("./refreshToken.service", () => ({
  RefreshTokenService: class RefreshTokenService {},
}));
import { AuthTokenGuard } from "./auth.token.guard";

describe("AuthTokenGuard roles", () => {
  function context(account: any) {
    const request: any = { headers: { authorization: "Bearer token" } };
    return {
      request,
      executionContext: {
        getHandler: () => "handler",
        getClass: () => "controller",
        switchToHttp: () => ({ getRequest: () => request }),
      } as any,
    };
  }

  it("allows an admin account to use an admin route", async () => {
    const { request, executionContext } = context({
      id: "admin",
      role: "admin",
    });
    const tokens = {
      validateAccessToken: jest
        .fn()
        .mockResolvedValue({ id: "admin", role: "admin" }),
    };
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === "roles" ? ["admin"] : false
      ),
    };
    const guard = new AuthTokenGuard(tokens as any, reflector as any);

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(request.account).toMatchObject({ role: "admin" });
  });

  it("rejects a regular account from an admin route", async () => {
    const { executionContext } = context({ id: "regular", role: "regular" });
    const tokens = {
      validateAccessToken: jest
        .fn()
        .mockResolvedValue({ id: "regular", role: "regular" }),
    };
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === "roles" ? ["admin"] : false
      ),
    };
    const guard = new AuthTokenGuard(tokens as any, reflector as any);

    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });
});
