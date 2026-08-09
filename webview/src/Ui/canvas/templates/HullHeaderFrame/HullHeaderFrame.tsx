/**
 * Hull header frame holding one line of heading content.
 *
 * Places intrinsically sized `children` at the leading edge of a fixed-height,
 * full-width strip with an inset from the hull edge; content may grow to the
 * strip's available width.
 *
 * Used by: a namespace heading.
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./HullHeaderFrame.module.css";

type HullHeaderFrameProps = {
  readonly children: ReactNode;
};

export default function HullHeaderFrame({ children }: HullHeaderFrameProps): ReactElement {
  return <header className={styles.header}>{children}</header>;
}
