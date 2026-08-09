/**
 * Workspace frame arranging panes around a central content region.
 *
 * Sets the leading track from pixel `leadingWidth`, names the workspace with
 * `ariaLabel`, and arranges `leading`, `content`, and `trailing` from left to
 * right over the editor grid.
 *
 * Used by: the tool pane, canvas, and property pane.
 */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "./WorkspaceFrame.module.css";

type WorkspaceFrameProps = {
  readonly leading: ReactNode;
  readonly content: ReactNode;
  readonly trailing: ReactNode;
  readonly ariaLabel: string;
  readonly leadingWidth: number;
};

export default function WorkspaceFrame({
  leading,
  content,
  trailing,
  leadingWidth,
  ariaLabel,
}: WorkspaceFrameProps): ReactElement {
  const style = { "--workspace-frame-leading-width": `${leadingWidth}px` } as CSSProperties;
  return (
    <section className={styles.frame} style={style} aria-label={ariaLabel}>
      <div className={styles.leading}>{leading}</div>
      <div className={styles.content}>{content}</div>
      <div className={styles.trailing}>{trailing}</div>
    </section>
  );
}
