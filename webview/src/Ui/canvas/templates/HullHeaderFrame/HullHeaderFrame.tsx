/**
 * Hull header frame holding one line of heading content.
 *
 * Places intrinsically sized `children` at the leading edge of a fixed-height,
 * full-width strip with an inset from the hull edge; content may grow to the
 * strip's available width. `targetRole` and `targetName` are transcribed onto the
 * header.
 *
 * Used by: a namespace heading.
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./HullHeaderFrame.module.css";

type HullHeaderFrameProps = {
  readonly children: ReactNode;
  readonly targetRole?: string;
  readonly targetName?: string;
};

export default function HullHeaderFrame({
  children,
  targetRole,
  targetName,
}: HullHeaderFrameProps): ReactElement {
  return (
    <header className={styles.header} data-target-role={targetRole} data-target-name={targetName}>
      {children}
    </header>
  );
}
