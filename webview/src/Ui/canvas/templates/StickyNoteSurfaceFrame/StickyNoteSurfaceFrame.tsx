/**
 * Sticky-note surface framing content with movable-object treatment.
 *
 * Fills its host with `children`, uses `title` as the tooltip, and reports
 * `onClick` when clicked. `elementRef` exposes the surface host for
 * consumer-owned measurement.
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
  readonly onClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly elementRef?: Ref<HTMLDivElement>;
};

export default function StickyNoteSurfaceFrame({
  title,
  dragging,
  children,
  onClick,
  elementRef,
}: StickyNoteSurfaceFrameProps): ReactElement {
  return (
    <div
      className={`${styles.frame} ${dragging ? styles.dragging : ""}`}
      ref={elementRef}
      title={title}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
