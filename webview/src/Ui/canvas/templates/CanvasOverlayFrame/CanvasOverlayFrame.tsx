/**
 * Canvas overlay frame spanning the viewport without intercepting input.
 *
 * Hosts SVG `children` across the full viewport at the supplied `stacking`
 * plane and hides the frame from accessibility.
 *
 * Used by: the note-attachment preview.
 */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "./CanvasOverlayFrame.module.css";

type CanvasOverlayFrameProps = {
  readonly children: ReactNode;
  readonly stacking: number;
};

export default function CanvasOverlayFrame({
  stacking,
  children,
}: CanvasOverlayFrameProps): ReactElement {
  const style = { "--canvas-overlay-stacking": stacking } as CSSProperties;
  return (
    <svg className={styles.frame} style={style} aria-hidden="true">
      {children}
    </svg>
  );
}
