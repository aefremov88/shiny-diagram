/**
 * Pane frame with a persistent edge-control slot and collapsible content.
 *
 * Sets the expanded frame from pixel `width`, renders `edgeControl` against the
 * shell, and arranges `children` vertically in a scrolling content region.
 *
 * Used by: the tool pane and property pane.
 *
 * Lifecycle:
 * - `collapsed` — off renders the frame at `width`; on reduces the shell to zero
 *   width and omits its children while retaining the edge control
 */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "./PaneFrame.module.css";

type PaneFrameProps = {
  readonly edgeControl?: ReactNode;
  readonly children: ReactNode;
  readonly width: number;
  readonly collapsed?: boolean;
};

export default function PaneFrame({
  width,
  collapsed = false,
  edgeControl,
  children,
}: PaneFrameProps): ReactElement {
  const frameStyle: CSSProperties & { "--pane-frame-width": string } = {
    "--pane-frame-width": `${width}px`,
  };

  return (
    <div className={collapsed ? styles.collapsedShell : styles.shell} style={frameStyle}>
      {edgeControl}
      {collapsed ? null : <div className={styles.frame}>{children}</div>}
    </div>
  );
}
