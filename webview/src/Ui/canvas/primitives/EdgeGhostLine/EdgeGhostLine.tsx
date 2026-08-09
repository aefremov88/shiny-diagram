/**
 * Ghost edge path with optional endpoint markers.
 *
 * Draws `d` with the preview's `lineKind` and links marker definitions named by
 * `startMarkerId` and `endMarkerId` when supplied.
 *
 * Modifiers:
 * - `tone` — the preview identity:
 *   - `accent` previews accent treatment. Used by: relationship creation
 *   - `attachment` previews attachment treatment. Used by: note attachment
 */

import type { ReactElement } from "react";
import styles from "./EdgeGhostLine.module.css";

type EdgeGhostLineProps = {
  readonly d: string;
  readonly lineKind: "solid" | "dashed";
  readonly startMarkerId?: string;
  readonly endMarkerId?: string;
  readonly tone: "accent" | "attachment";
};

export default function EdgeGhostLine({
  d,
  lineKind,
  tone,
  startMarkerId,
  endMarkerId,
}: EdgeGhostLineProps): ReactElement {
  const className = [styles.line, styles[tone], lineKind === "dashed" ? styles.dashed : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <path
      className={className}
      d={d}
      markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
      markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
    />
  );
}
