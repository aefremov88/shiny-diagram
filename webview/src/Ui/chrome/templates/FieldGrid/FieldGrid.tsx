/**
 * Field grid aligning labeled controls across rows.
 *
 * Renders `rows` as label-and-control pairs; each row may align its control at
 * the center or top, and label text preserves authored line breaks.
 *
 * Modifiers:
 * - `variant` — the designed grid arrangement:
 *   - `styleName` uses the wider label track and full control width. Used by:
 *     diagram style naming
 *   - `endpointPair` adds horizontal inset to that arrangement. Used by:
 *     relationship multiplicities and edge shape
 *   - `surfaceStyle` combines inset, a narrow label track, and a centered
 *     half-width control. Used by: class and namespace style properties
 *   - `canvasStyle` uses the wider label track with a centered half-width
 *     control. Used by: diagram style properties
 *   - `headerText` combines inset and the narrow label track with a full-width
 *     control. Used by: class header text
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./FieldGrid.module.css";

/**
 * Label-and-control entry arranged by FieldGrid.
 *
 * `label` names the row, `control` supplies its content, and `alignment` may
 * place that content at the center or at the row's start edge.
 */
export type FieldGridRow = {
  readonly label: string;
  readonly control: ReactNode;
  readonly alignment?: "center" | "start";
};

type FieldGridProps = {
  readonly rows: readonly FieldGridRow[];
  readonly variant?: "styleName" | "endpointPair" | "surfaceStyle" | "canvasStyle" | "headerText";
};

export default function FieldGrid({ rows, variant = "styleName" }: FieldGridProps): ReactElement {
  const isInset =
    variant === "endpointPair" || variant === "surfaceStyle" || variant === "headerText";
  const hasCompactLabel = variant === "surfaceStyle" || variant === "headerText";
  const hasCompactControl = variant === "surfaceStyle" || variant === "canvasStyle";

  return (
    <div className={isInset ? styles.insetGrid : styles.grid}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={
            hasCompactLabel
              ? row.alignment === "start"
                ? styles.compactStartAlignedRow
                : styles.compactRow
              : row.alignment === "start"
                ? styles.standardStartAlignedRow
                : styles.standardRow
          }
        >
          <span className={styles.label}>{row.label}</span>
          <div className={hasCompactControl ? styles.halfControl : styles.control}>
            {row.control}
          </div>
        </div>
      ))}
    </div>
  );
}
