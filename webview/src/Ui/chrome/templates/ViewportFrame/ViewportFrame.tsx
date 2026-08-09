/**
 * Viewport frame allowing its content to shrink within available height.
 *
 * Expands `children` through the remaining flex space while permitting nested
 * scrolling regions to contract below their content height.
 *
 * Used by: the editor workspace beneath its status region.
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./ViewportFrame.module.css";

type ViewportFrameProps = {
  readonly children: ReactNode;
};

export default function ViewportFrame({ children }: ViewportFrameProps): ReactElement {
  return <div className={styles.frame}>{children}</div>;
}
