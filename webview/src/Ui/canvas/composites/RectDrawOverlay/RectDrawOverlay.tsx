/**
 * Rectangle-draw overlay capturing pointer gestures across its complete surface.
 *
 * Routes pointer phases through `onPointerDown`, `onPointerMove`, and
 * `onPointerUp` at the supplied `stacking` plane. Text selection and native
 * dragging do not engage while drawing. When `rect` is non-null, it also renders
 * the pending rectangle.
 *
 * Used by: class and namespace placement gestures.
 */

import type { CSSProperties, PointerEvent, ReactElement } from "react";
import type { Rect } from "../../../../shared/geometry";
import DraftRect from "../../primitives/DraftRect/DraftRect";
import styles from "./RectDrawOverlay.module.css";

type RectDrawOverlayProps = {
  readonly rect: Rect | null;
  readonly stacking: number;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

export default function RectDrawOverlay({
  rect,
  stacking,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: RectDrawOverlayProps): ReactElement {
  const style = { zIndex: stacking } satisfies CSSProperties;
  return (
    <div
      className={styles.overlay}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {rect ? <DraftRect rect={rect} /> : null}
    </div>
  );
}
