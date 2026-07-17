jest.mock("./accounts.service", () => ({
  AccountsService: class AccountsService {},
}));
jest.mock("../auth/auth.service", () => ({
  AuthService: class AuthService {},
}));
jest.mock("../common/CrudEntity.decorator", () => ({
  CrudEntity: () => () => undefined,
}));
import { AccountsController } from "./accounts.controller";

describe("AccountsController", () => {
  it("returns the current account role with profile details", async () => {
    const service = {
      getAccountInfo: jest.fn().mockResolvedValue({
        id: "account-1",
        name: "Owner",
        email: "owner@example.com",
        role: "admin",
      }),
    };
    const controller = new AccountsController(service as any, {} as any);

    await expect(controller.getAccount({ id: "account-1" })).resolves.toEqual({
      name: "Owner",
      email: "owner@example.com",
      role: "admin",
    });
  });
});
