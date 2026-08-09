/**
 * @fileoverview Captures the full React Flow content plane as a PNG data URL.
 */

import { toPng } from "html-to-image";
import type { Node, Rect } from "@xyflow/react";
import { getNodesBounds } from "@xyflow/react";
import { EXPORT_IMAGE_MARGIN, EXPORT_IMAGE_PIXEL_RATIO } from "../../../../config/editorUiConfig";

export type CaptureGeometry = {
  readonly width: number;
  readonly height: number;
  readonly transform: string;
};

export function toCaptureGeometry(bounds: Rect): CaptureGeometry {
  return {
    width: Math.ceil(bounds.width + EXPORT_IMAGE_MARGIN * 2),
    height: Math.ceil(bounds.height + EXPORT_IMAGE_MARGIN * 2),
    transform: `translate(${EXPORT_IMAGE_MARGIN - bounds.x}px, ${
      EXPORT_IMAGE_MARGIN - bounds.y
    }px) scale(1)`,
  };
}

export async function captureReactFlowCanvas(
  viewport: HTMLElement,
  nodes: readonly Node[],
  backgroundColor: string
): Promise<string> {
  if (nodes.length === 0) throw new Error("React Flow reported zero nodes.");
  const bounds = getNodesBounds([...nodes]);
  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    throw new Error(`React Flow returned invalid node bounds: ${JSON.stringify(bounds)}.`);
  }
  const geometry = toCaptureGeometry(bounds);
  await document.fonts.ready;

  const restoreSvgPaint = materializeSvgPaint(viewport);
  try {
    return await toPng(viewport, {
      backgroundColor,
      width: geometry.width,
      height: geometry.height,
      pixelRatio: EXPORT_IMAGE_PIXEL_RATIO,
      // Fonts are already loaded in the live webview. html-to-image's embedding
      // pass fetches font URLs, which the webview CSP intentionally blocks.
      skipFonts: true,
      filter: shouldCaptureElement,
      style: {
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
        transform: geometry.transform,
      },
    });
  } finally {
    restoreSvgPaint();
  }
}

const SVG_PAINT_ATTRIBUTES = [
  ["stroke", "stroke"],
  ["stroke-width", "strokeWidth"],
  ["stroke-dasharray", "strokeDasharray"],
  ["fill", "fill"],
] as const;

/**
 * html-to-image clones SVG markup without reliably preserving paint inherited
 * through the webview's CSS variables. Materialize computed paint for the
 * capture, then restore the live canvas byte-for-byte.
 */
export function materializeSvgPaint(root: HTMLElement): () => void {
  const restorations: Array<() => void> = [];
  const elements = root.querySelectorAll<SVGElement>(
    "svg path, svg polygon, svg polyline, svg line, svg circle, svg ellipse, svg rect"
  );

  for (const element of elements) {
    const computedStyle = getComputedStyle(element);
    for (const [attribute, property] of SVG_PAINT_ATTRIBUTES) {
      const previous = element.getAttribute(attribute);
      element.setAttribute(attribute, computedStyle[property]);
      restorations.push(() => {
        if (previous === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, previous);
      });
    }
  }

  return () => {
    for (const restore of restorations.reverse()) restore();
  };
}

export function shouldCaptureElement(node: HTMLElement): boolean {
  if (node.tagName === "BUTTON") return false;
  const classList = node.classList;
  if (!classList) return true;
  if (
    classList.contains("react-flow__handle") ||
    classList.contains("react-flow__resize-control")
  ) {
    return false;
  }
  return ![...classList].some((className) => className.includes("_hover_"));
}

export function pngDataUrlToBase64(dataUrl: string): string {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) throw new Error("Capture did not produce a PNG data URL.");
  return dataUrl.slice(prefix.length);
}
