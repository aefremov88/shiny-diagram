/**
 * Canvas grid frame filling its host with diagram content.
 *
 * Fills the available region with `children` over the canvas grid;
 * `placementCursor` selects the placement cursor.
 *
 * Used by: the diagram canvas.
 *
 * Lifecycle:
 * - `placementCursor` — on shows that placement is available
 * - `frameRef` — exposes the owned canvas frame for full-bounds image capture
 */

import type { ReactElement, ReactNode, Ref } from "react";
import styles from "./CanvasGridFrame.module.css";

type CanvasGridFrameProps = {
  readonly children: ReactNode;
  readonly placementCursor?: boolean;
  readonly frameRef?: Ref<HTMLDivElement>;
};

export default function CanvasGridFrame({
  children,
  placementCursor = false,
  frameRef,
}: CanvasGridFrameProps): ReactElement {
  return (
    <div ref={frameRef} className={`${styles.frame} ${placementCursor ? styles.placement : ""}`}>
      {children}
    </div>
  );
}
