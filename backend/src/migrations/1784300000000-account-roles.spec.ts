import { AccountRoles1784300000000 } from "./1784300000000-account-roles";

describe("AccountRoles1784300000000", () => {
  it("adds a regular-by-default role and promotes the bootstrap owner", async () => {
    const queryRunner = {
      query: jest.fn().mockResolvedValue(undefined),
    } as any;

    await new AccountRoles1784300000000().up(queryRunner);

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement)
      .join("\n");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "role"');
    expect(sql).toContain("DEFAULT 'regular'");
    expect(sql).toContain("CHECK");
    expect(sql).toContain("root@gmail.com");
    expect(sql).toContain("'admin'");
  });
});
