/**
 * Swatch preview of box surface styling.
 *
 * Applies the supplied fill, stroke, text color, stroke width, and exact stroke
 * dasharray from `styleValues`, falling back independently for omitted values.
 * Stroke width is rendered at half scale, clamped from 1px to 3px, so every
 * swatch uses one proportional miniature rule. The single-line `label` is both
 * visible content and the accessible name; overflow ends in an ellipsis.
 *
 * Used by: attached-class and saved-style previews.
 */

import type { CSSProperties, ReactElement } from "react";
import type { StyleProperties } from "../../../../shared/style";
import styles from "./StyledBoxSwatch.module.css";

type StyledBoxSwatchProps = {
  readonly styleValues: Partial<StyleProperties>;
  readonly label: string;
};

export default function StyledBoxSwatch({
  styleValues,
  label,
}: StyledBoxSwatchProps): ReactElement {
  const swatchStyle: CSSProperties & {
    "--styled-box-fill"?: string;
    "--styled-box-color"?: string;
  } = {
    "--styled-box-fill": styleValues.fill ?? undefined,
    "--styled-box-color": styleValues.color ?? undefined,
  };

  return (
    <div className={styles.swatch} style={swatchStyle} aria-label={label}>
      <svg className={styles.stroke} aria-hidden="true" focusable="false">
        <rect
          className={styles.strokeRect}
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="none"
          stroke={styleValues.stroke ?? "currentColor"}
          strokeWidth={toSwatchStrokeWidth(styleValues.strokeWidth)}
          strokeDasharray={toStrokeDasharray(styleValues.strokeDasharray)}
        />
      </svg>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

export function toSwatchStrokeWidth(strokeWidth: string | null | undefined): string {
  if (!strokeWidth) return "1px";
  const match = /^\s*(-?(?:\d+|\d*\.\d+))\s*([a-z%]*)\s*$/i.exec(strokeWidth);
  if (!match) return strokeWidth;
  const scaled = Math.min(3, Math.max(1, Number(match[1]) / 2));
  return `${scaled}${match[2] || "px"}`;
}

function toStrokeDasharray(strokeDasharray: string | null | undefined): string | undefined {
  return !strokeDasharray || strokeDasharray === "0" || strokeDasharray === "none"
    ? undefined
    : strokeDasharray;
}
