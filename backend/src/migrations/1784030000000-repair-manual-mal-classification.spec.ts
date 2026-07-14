import { RepairManualMalClassification1784030000000 } from "./1784030000000-repair-manual-mal-classification";

describe("RepairManualMalClassification1784030000000", () => {
  it("repairs only deliberate MAL matches without creating duplicate anime titles", async () => {
    const query = jest.fn();
    await new RepairManualMalClassification1784030000000().up({ query } as any);
    const sql = query.mock.calls[0][0];

    expect(sql).toContain(`item."metadata"->>'manualMatch' = 'true'`);
    expect(sql).toContain(`item."externalIds" ? 'malId'`);
    expect(sql).toContain(`NOT EXISTS`);
    expect(sql).toContain(`"type" = 'anime'`);
  });
});
