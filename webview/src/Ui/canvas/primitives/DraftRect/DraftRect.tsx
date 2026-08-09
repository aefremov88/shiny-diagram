/**
 * Draft rectangle showing a pending box extent.
 *
 * Places the noninteractive rectangle at `rect` and applies `stacking` when
 * supplied.
 *
 * Modifiers:
 * - `tone` — the draft's status treatment:
 *   - `accent` uses pending placement treatment. Used by: class placement
 *   - `positive` uses success treatment. Used by: namespace drawing
 * - `positioning` — the draft's containing coordinate space:
 *   - `absolute` positions within the containing surface. Used by: class
 *     placement
 *   - `fixed` positions against the viewport. Used by: namespace drawing
 */

import type { CSSProperties, ReactElement } from "react";
import type { Rect } from "../../../../shared/geometry";
import styles from "./DraftRect.module.css";

type DraftRectProps = {
  readonly rect: Rect;
  readonly stacking?: number;
  readonly tone?: "accent" | "positive";
  readonly positioning?: "absolute" | "fixed";
};

export default function DraftRect({
  rect,
  tone = "accent",
  positioning = "absolute",
  stacking,
}: DraftRectProps): ReactElement {
  const style = {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    zIndex: stacking,
  } satisfies CSSProperties;

  return (
    <div className={`${styles.draftRect} ${styles[tone]} ${styles[positioning]}`} style={style} />
  );
}
