import { describe, expect, it } from "vitest";
import type { ExportPngErrorMessage, ExportPngMessage } from "./protocol";

describe("PNG export bridge contract", () => {
  it("carries base64 PNG bytes from webview to host", () => {
    const message: ExportPngMessage = {
      type: "exportPng",
      requestId: 7,
      base64: "iVBORw0KGgo=",
    };

    expect(message).toEqual({
      type: "exportPng",
      requestId: 7,
      base64: "iVBORw0KGgo=",
    });
  });

  it("reports the exact failed stage to the host", () => {
    const message: ExportPngErrorMessage = {
      type: "exportPngError",
      requestId: 8,
      stage: "canvas-capture",
      message: "React Flow reported zero nodes.",
    };

    expect(message.stage).toBe("canvas-capture");
    expect(message.message).toContain("zero nodes");
  });
});
