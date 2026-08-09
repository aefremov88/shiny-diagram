/**
 * Inline glyph toggle calibrated for diagram text controls.
 *
 * Renders `glyph`, uses `label` as its accessible name and tooltip, reports
 * `onClick` when clicked, and uses `surface` when supplied instead of the
 * base surface.
 *
 * Used by: member underline and italic controls.
 *
 * Lifecycle:
 * - `pressed` — on shows the toggle selected
 */

import type { CSSProperties, ReactElement } from "react";
import { GLYPH_VIEW_BOX, type GlyphDescriptor } from "../../../../shared/glyph";
import { GLYPH_EMPTY_FILL, GLYPH_STROKE_LINE_CAP, GLYPH_STROKE_LINE_JOIN } from "../../tokens";
import styles from "./InlineToggleButton.module.css";

type InlineToggleButtonProps = {
  readonly glyph: GlyphDescriptor;
  readonly label: string;
  readonly surface?: string;
  readonly pressed: boolean;
  readonly onClick: () => void;
};

export default function InlineToggleButton({
  glyph,
  label,
  pressed,
  surface,
  onClick,
}: InlineToggleButtonProps): ReactElement {
  const style = { "--inline-toggle-surface": surface } as CSSProperties;
  return (
    <button
      type="button"
      className={styles.button}
      style={style}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      <svg
        viewBox={GLYPH_VIEW_BOX}
        fill={glyph.filled ? "currentColor" : GLYPH_EMPTY_FILL}
        stroke="currentColor"
        strokeLinecap={GLYPH_STROKE_LINE_CAP}
        strokeLinejoin={GLYPH_STROKE_LINE_JOIN}
        aria-hidden="true"
        focusable="false"
      >
        {glyph.paths.map((path, index) => (
          <path
            key={`${index}:${path}`}
            className={glyph.dashed && index === 0 ? styles.dashed : undefined}
            d={path}
          />
        ))}
      </svg>
    </button>
  );
}
