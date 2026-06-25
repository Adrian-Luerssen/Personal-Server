import { createImportProgressSender, prepareSseResponse } from "./sse";

describe("prepareSseResponse", () => {
  it("sets streaming-safe headers and flushes every event", () => {
    const res = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      flush: jest.fn(),
    } as any;

    const send = prepareSseResponse(res);
    send({ stage: "complete", progress: 100 });

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache, no-transform");
    expect(res.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
    expect(res.setHeader).toHaveBeenCalledWith("X-Accel-Buffering", "no");
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(res.write).toHaveBeenCalledWith(
      'data: {"stage":"complete","progress":100}\n\n'
    );
    expect(res.flush).toHaveBeenCalled();
  });
});

describe("createImportProgressSender", () => {
  it("adds import stream metadata and clamps unsafe progress values", () => {
    const dateNow = jest.spyOn(Date, "now")
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_500);

    const res = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      flush: jest.fn(),
    } as any;

    const send = createImportProgressSender(res);
    send({
      stage: "transactions",
      progress: Number.NaN,
      current: 10,
      total: 20,
      message: "Importing transactions",
    });

    const payload = JSON.parse(
      res.write.mock.calls[0][0].replace(/^data: /, "").trim()
    );
    expect(payload).toEqual(
      expect.objectContaining({
        type: "import-progress",
        sequence: 1,
        stage: "transactions",
        progress: 0,
        current: 10,
        total: 20,
        message: "Importing transactions",
        startedAt: "1970-01-01T00:00:01.000Z",
        emittedAt: "1970-01-01T00:00:02.500Z",
        elapsedMs: 1500,
      })
    );
    dateNow.mockRestore();
  });
});
