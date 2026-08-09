/**
 * Edge hit path widening pointer access without visible output.
 *
 * Follows `d` with a transparent stroke that receives pointer input across a
 * wider corridor and presents an action cursor.
 *
 * Used by: relationship selection.
 */

import type { ReactElement } from "react";
import styles from "./EdgeHitPath.module.css";

type EdgeHitPathProps = {
  readonly d: string;
};

export default function EdgeHitPath({ d }: EdgeHitPathProps): ReactElement {
  return <path className={styles.path} d={d} />;
}
