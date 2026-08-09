/**
 * Edge path with user styling, endpoint linkage, and selection treatment.
 *
 * Draws `d` with the document's `lineKind`, using `stroke` and `strokeWidth`
 * when supplied, and links marker definitions named by `startMarkerId` and
 * `endMarkerId`. Selection and attachment treatment replace user stroke
 * presentation.
 *
 * Lifecycle:
 * - `selected` — on uses the emphasized selection stroke
 *
 * Modifiers:
 * - `tone` — the edge identity:
 *   - `default` permits user stroke values. Used by: relationships
 *   - `attachment` uses fixed attachment identity. Used by: note attachments
 */

import type { CSSProperties, ReactElement } from "react";
import styles from "./EdgePath.module.css";

type EdgePathProps = {
  readonly d: string;
  readonly lineKind: "solid" | "dashed";
  readonly startMarkerId?: string;
  readonly endMarkerId?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number | string;
  readonly selected: boolean;
  readonly tone?: "default" | "attachment";
};

export default function EdgePath({
  d,
  lineKind,
  selected,
  tone = "default",
  startMarkerId,
  endMarkerId,
  stroke,
  strokeWidth,
}: EdgePathProps): ReactElement {
  const className = [
    styles.path,
    lineKind === "dashed" ? styles.dashed : "",
    tone === "attachment" ? styles.attachment : "",
    selected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = {
    "--edge-path-stroke": stroke,
    "--edge-path-stroke-width": strokeWidth,
  } as CSSProperties;

  return (
    <path
      className={className}
      style={style}
      d={d}
      markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
      markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
    />
  );
}
