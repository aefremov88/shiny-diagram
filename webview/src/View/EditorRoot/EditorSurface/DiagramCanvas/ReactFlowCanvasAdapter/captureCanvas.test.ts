import { describe, expect, it, vi } from "vitest";
import {
  materializeSvgPaint,
  pngDataUrlToBase64,
  shouldCaptureElement,
  toCaptureGeometry,
} from "./captureCanvas";

describe("canvas PNG capture geometry", () => {
  it("captures natural-scale full bounds with the configured margin", () => {
    expect(toCaptureGeometry({ x: 100, y: 50, width: 600, height: 300 })).toEqual({
      width: 680,
      height: 380,
      transform: "translate(-60px, -10px) scale(1)",
    });
  });

  it("extracts PNG bytes from the bridge payload data URL", () => {
    expect(pngDataUrlToBase64("data:image/png;base64,cG5n")).toBe("cG5n");
  });

  it("rejects a non-PNG capture result", () => {
    expect(() => pngDataUrlToBase64("data:image/svg+xml;base64,PHN2Zz4=")).toThrow(
      "Capture did not produce a PNG data URL."
    );
  });

  it("keeps non-element nodes that do not expose a class list", () => {
    expect(
      shouldCaptureElement({
        tagName: undefined,
        classList: undefined,
      } as unknown as HTMLElement)
    ).toBe(true);
  });

  it("materializes computed SVG paint for cloning and restores the live markup", () => {
    const attributes = new Map([["stroke", "var(--edge-color)"]]);
    const path = {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
    } as unknown as SVGElement;
    const root = {
      querySelectorAll: () => [path],
    } as unknown as HTMLElement;
    vi.stubGlobal("getComputedStyle", () => ({
      stroke: "rgb(12, 34, 56)",
      strokeWidth: "2px",
      strokeDasharray: "4px 3px",
      fill: "none",
    }));

    const restore = materializeSvgPaint(root);

    expect(path.getAttribute("stroke")).toBe("rgb(12, 34, 56)");
    expect(path.getAttribute("stroke-width")).toBe("2px");
    expect(path.getAttribute("stroke-dasharray")).toBe("4px 3px");
    expect(path.getAttribute("fill")).toBe("none");

    restore();
    expect(path.getAttribute("stroke")).toBe("var(--edge-color)");
    expect(path.getAttribute("stroke-width")).toBeNull();
    expect(path.getAttribute("stroke-dasharray")).toBeNull();
    expect(path.getAttribute("fill")).toBeNull();
    vi.unstubAllGlobals();
  });
});
