/**
 * Sticky-note surface framing content with movable-object treatment.
 *
 * Fills its host with `children`, uses `title` as the tooltip, and reports
 * `onClick` when clicked. `elementRef` exposes the surface host for
 * consumer-owned measurement. `targetRole` and `targetName` are transcribed onto
 * the surface.
 *
 * Gesture targets:
 * - `surface()` — `data-gesture-target=surface`
 *
 * Used by: note surfaces.
 *
 * Lifecycle:
 * - `dragging` — off shows the ready-to-move cursor; on dims the surface and
 *   shows active dragging
 */

import type { MouseEvent, ReactElement, ReactNode, Ref } from "react";
import styles from "./StickyNoteSurfaceFrame.module.css";

type StickyNoteSurfaceFrameProps = {
  readonly title: string;
  readonly children: ReactNode;
  readonly dragging: boolean;
  readonly targetRole?: string;
  readonly targetName?: string;
  readonly onClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly elementRef?: Ref<HTMLDivElement>;
};

export default function StickyNoteSurfaceFrame({
  title,
  dragging,
  targetRole,
  targetName,
  children,
  onClick,
  elementRef,
}: StickyNoteSurfaceFrameProps): ReactElement {
  return (
    <div
      className={`${styles.frame} ${dragging ? styles.dragging : ""}`}
      data-gesture-target="surface"
      data-target-role={targetRole}
      data-target-name={targetName}
      ref={elementRef}
      title={title}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
