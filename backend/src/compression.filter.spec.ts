import { shouldCompressResponse } from "./compression.filter";

describe("shouldCompressResponse", () => {
  it("does not compress event-stream requests", () => {
    const req = { headers: { accept: "text/event-stream" } } as any;
    const res = { getHeader: jest.fn() } as any;

    expect(shouldCompressResponse(req, res)).toBe(false);
  });

  it("does not compress responses already marked as event streams", () => {
    const req = { headers: { accept: "application/json" } } as any;
    const res = { getHeader: jest.fn().mockReturnValue("text/event-stream") } as any;

    expect(shouldCompressResponse(req, res)).toBe(false);
  });

  it("allows normal JSON responses to use the default compression filter", () => {
    const req = { headers: { accept: "application/json" } } as any;
    const res = { getHeader: jest.fn().mockReturnValue("application/json") } as any;

    expect(shouldCompressResponse(req, res)).toBe(true);
  });
});
