import { PreferencesService } from "./preferences.service";

describe("PreferencesService", () => {
  function createRepo(existing: any = null) {
    const saved: any[] = [];
    return {
      saved,
      repo: {
        findOne: jest.fn().mockResolvedValue(existing),
        create: jest.fn((value) => ({ id: "pref-1", ...value })),
        save: jest.fn(async (value) => {
          saved.push(value);
          return value;
        }),
      },
    };
  }

  it("updates only allowlisted account preference fields", async () => {
    const existing = {
      id: "pref-1",
      accountId: "account-1",
      accentColor: "#7dd3fc",
      featureModules: null,
      homeLayout: null,
      widgetLayout: null,
    };
    const { repo, saved } = createRepo(existing);
    const service = new PreferencesService(repo as any);

    await service.update("account-1", {
      accountId: "account-2",
      featureModules: { finance: { enabled: false } },
      homeLayout: { widgets: [{ id: "habits-today", module: "habits", visible: true, order: 1 }] },
      widgetLayout: { today: { metrics: ["habits"] } },
      unknownField: true,
    } as any);

    expect(saved[0].accountId).toBe("account-1");
    expect(saved[0].featureModules).toEqual({ finance: { enabled: false } });
    expect(saved[0].homeLayout).toEqual({ widgets: [{ id: "habits-today", module: "habits", visible: true, order: 1 }] });
    expect(saved[0].widgetLayout).toEqual({ today: { metrics: ["habits"] } });
    expect(saved[0].unknownField).toBeUndefined();
  });
});
