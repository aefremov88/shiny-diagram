/**
 * Halo extending beyond a box without intercepting input.
 *
 * Paints behind or among siblings at `stacking`, using `tint` when supplied and
 * otherwise the selected tone's default.
 *
 * Modifiers:
 * - `tone` — the fallback halo wash:
 *   - `canvas` matches the canvas ground. Used by: selected classes on plain
 *     canvas ground
 *   - `faint` uses a translucent wash. Used by: selected classes with inherited
 *     styling
 */

import type { CSSProperties, ReactElement } from "react";
import styles from "./HaloRing.module.css";

type HaloRingProps = {
  readonly tint?: string;
  readonly stacking: number;
  readonly tone?: "canvas" | "faint";
};

export default function HaloRing({ tint, tone = "faint", stacking }: HaloRingProps): ReactElement {
  const style = {
    "--halo-ring-tint": tint,
    "--halo-ring-stacking": stacking,
  } as CSSProperties;
  return <span className={`${styles.halo} ${styles[tone]}`} style={style} />;
}
