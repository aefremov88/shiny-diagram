import type { Rect } from "../../../../shared/geometry";
import type { DiagramDirection } from "../../../../shared/uml";
import {
  INCREMENTAL_LAYOUT_BBOX_GROWTH_WEIGHT,
  INCREMENTAL_LAYOUT_CANDIDATE_PITCH,
  INCREMENTAL_LAYOUT_MAX_WINDOW_WIDENINGS,
  INCREMENTAL_LAYOUT_MIN_GAP_RATIO,
  INCREMENTAL_LAYOUT_OWN_NAMESPACE_BONUS,
  INCREMENTAL_LAYOUT_WINDOW_SIZE_MULTIPLIER,
  INCREMENTAL_LAYOUT_WRONG_SIDE_MULTIPLIER,
} from "../../../config/editorUiConfig";
import { isHorizontal } from "./anchorWishes";
import { minGap } from "./spacing";
import type { IncrementalElement, Wish } from "./types";

export function findCandidate(
  element: IncrementalElement,
  wishes: readonly Wish[],
  obstacles: readonly Rect[],
  diagramBounds: Rect,
  ownHull: Rect | null,
  direction: DiagramDirection | null
): Rect {
  const paddingIncrement =
    INCREMENTAL_LAYOUT_WINDOW_SIZE_MULTIPLIER * Math.max(element.w, element.h);
  for (let widening = 0; widening <= INCREMENTAL_LAYOUT_MAX_WINDOW_WIDENINGS; widening++) {
    const padding = paddingIncrement * (widening + 1);
    const window = wishWindow(wishes, padding);
    let best: { bounds: Rect; score: number } | null = null;
    for (
      let x = snapDown(window.x, INCREMENTAL_LAYOUT_CANDIDATE_PITCH);
      x <= window.x + window.w;
      x += INCREMENTAL_LAYOUT_CANDIDATE_PITCH
    ) {
      for (
        let y = snapDown(window.y, INCREMENTAL_LAYOUT_CANDIDATE_PITCH);
        y <= window.y + window.h;
        y += INCREMENTAL_LAYOUT_CANDIDATE_PITCH
      ) {
        const bounds = { x: x - element.w / 2, y: y - element.h / 2, w: element.w, h: element.h };
        if (obstacles.some((obstacle) => !hasClearance(bounds, obstacle))) continue;
        const score = candidateScore(bounds, wishes, diagramBounds, ownHull, direction);
        if (!best || score < best.score) best = { bounds, score };
      }
    }
    if (best) return best.bounds;
  }
  return fallbackBounds(element, obstacles, diagramBounds, direction);
}

function candidateScore(
  bounds: Rect,
  wishes: readonly Wish[],
  diagramBounds: Rect,
  ownHull: Rect | null,
  direction: DiagramDirection | null
): number {
  const x = bounds.x + bounds.w / 2;
  const y = bounds.y + bounds.h / 2;
  const horizontal = isHorizontal(direction);
  const flow = horizontal ? x : y;
  let score = 0;
  wishes.forEach((wish) => {
    const wrongSide = wish.flowSide !== 0 && Math.sign(flow - wish.anchorFlow) !== wish.flowSide;
    score +=
      wish.weight *
      (wrongSide ? INCREMENTAL_LAYOUT_WRONG_SIDE_MULTIPLIER : 1) *
      ((x - wish.x) ** 2 + (y - wish.y) ** 2);
  });
  score +=
    INCREMENTAL_LAYOUT_BBOX_GROWTH_WEIGHT *
    (unionArea(diagramBounds, bounds) - diagramBounds.w * diagramBounds.h);
  if (ownHull && contains(ownHull, bounds)) score -= INCREMENTAL_LAYOUT_OWN_NAMESPACE_BONUS;
  return score;
}

function fallbackBounds(
  element: IncrementalElement,
  obstacles: readonly Rect[],
  diagramBounds: Rect,
  direction: DiagramDirection | null
): Rect {
  const horizontal = isHorizontal(direction);
  const reversed = direction === "BT" || direction === "RL";
  const flowSize = horizontal ? element.w : element.h;
  const fallbackGap = INCREMENTAL_LAYOUT_MIN_GAP_RATIO * flowSize;
  let step = 0;
  while (true) {
    const flow = reversed
      ? (horizontal ? diagramBounds.x : diagramBounds.y) -
        fallbackGap -
        (horizontal ? element.w : element.h)
      : (horizontal ? diagramBounds.x + diagramBounds.w : diagramBounds.y + diagramBounds.h) +
        fallbackGap;
    const cross =
      (horizontal ? diagramBounds.y : diagramBounds.x) + step * INCREMENTAL_LAYOUT_CANDIDATE_PITCH;
    const bounds = horizontal
      ? { x: flow, y: cross, w: element.w, h: element.h }
      : { x: cross, y: flow, w: element.w, h: element.h };
    if (!obstacles.some((obstacle) => !hasClearance(bounds, obstacle))) return bounds;
    step++;
  }
}

const wishWindow = (wishes: readonly Wish[], padding: number): Rect => {
  const xs = wishes.map((wish) => wish.x);
  const ys = wishes.map((wish) => wish.y);
  return {
    x: Math.min(...xs) - padding,
    y: Math.min(...ys) - padding,
    w: Math.max(...xs) - Math.min(...xs) + padding * 2,
    h: Math.max(...ys) - Math.min(...ys) + padding * 2,
  };
};
const snapDown = (value: number, pitch: number): number => Math.floor(value / pitch) * pitch;
export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const hasClearance = (a: Rect, b: Rect): boolean => {
  const xGap = minGap(a, b, "x");
  const yGap = minGap(a, b, "y");
  const separatedX = a.x + a.w + xGap <= b.x || b.x + b.w + xGap <= a.x;
  const separatedY = a.y + a.h + yGap <= b.y || b.y + b.h + yGap <= a.y;
  return separatedX || separatedY;
};
const contains = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;
const unionArea = (a: Rect, b: Rect): number =>
  (Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x)) *
  (Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y));
