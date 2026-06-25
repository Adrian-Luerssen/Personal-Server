import { Response } from "express";

export type SseSend = (data: object) => void;

export type ImportProgressPayload = {
  stage: string;
  progress?: number;
  current?: number;
  total?: number;
  message?: string;
  error?: string;
  summary?: object;
  [key: string]: unknown;
};

function clampProgress(value: unknown): number {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, progress));
}

export function prepareSseResponse(res: Response): SseSend {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  return (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    const flush = (res as any).flush;
    if (typeof flush === "function") {
      flush.call(res);
    }
  };
}

export function createImportProgressSender(res: Response): (data: ImportProgressPayload) => void {
  const send = prepareSseResponse(res);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  let sequence = 0;

  return (data: ImportProgressPayload) => {
    const emittedAtMs = Date.now();
    sequence += 1;

    send({
      type: "import-progress",
      ...data,
      sequence,
      progress: clampProgress(data.progress),
      startedAt,
      emittedAt: new Date(emittedAtMs).toISOString(),
      elapsedMs: Math.max(0, emittedAtMs - startedAtMs),
    });
  };
}
