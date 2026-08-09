/**
 * Canvas viewport frame clipping positioned content.
 *
 * Names the full-height region with `ariaLabel` and clips `children` at its
 * boundary.
 *
 * Used by: the diagram canvas inside the editor workspace.
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./CanvasViewportFrame.module.css";

type CanvasViewportFrameProps = {
  readonly children: ReactNode;
  readonly ariaLabel: string;
};

export default function CanvasViewportFrame({
  children,
  ariaLabel,
}: CanvasViewportFrameProps): ReactElement {
  return (
    <section className={styles.frame} aria-label={ariaLabel}>
      {children}
    </section>
  );
}
