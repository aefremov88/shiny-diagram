import type { Rect } from "../../../../shared/geometry";
import { INCREMENTAL_LAYOUT_MIN_GAP_RATIO } from "../../../config/editorUiConfig";

export type LayoutAxis = "x" | "y";

export function minGap(
  left: Pick<Rect, "w" | "h">,
  right: Pick<Rect, "w" | "h">,
  axis: LayoutAxis
): number {
  const leftSize = axis === "x" ? left.w : left.h;
  const rightSize = axis === "x" ? right.w : right.h;
  return Math.min(
    INCREMENTAL_LAYOUT_MIN_GAP_RATIO * Math.max(leftSize, rightSize),
    Math.min(leftSize, rightSize)
  );
}
