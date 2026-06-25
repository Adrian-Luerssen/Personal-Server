import { Request, Response } from "express";

function headerIncludes(value: unknown, needle: string): boolean {
  const text = Array.isArray(value) ? value.join(",") : String(value || "");
  return text.toLowerCase().includes(needle);
}

function isCompressibleContentType(value: unknown): boolean {
  const text = Array.isArray(value) ? value.join(",") : String(value || "");
  const contentType = text.toLowerCase();
  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("xml") ||
    contentType.includes("svg")
  );
}

export function shouldCompressResponse(req: Request, res: Response): boolean {
  if (headerIncludes(req.headers.accept, "text/event-stream")) {
    return false;
  }

  if (headerIncludes(res.getHeader("Content-Type"), "text/event-stream")) {
    return false;
  }

  return isCompressibleContentType(res.getHeader("Content-Type"));
}
