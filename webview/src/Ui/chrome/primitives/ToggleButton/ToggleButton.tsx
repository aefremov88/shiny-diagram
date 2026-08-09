/**
 * Toggle button for a glyph, an optional label, and persistent pressed state.
 *
 * Renders `icon` when supplied, uses `title` as the tooltip and as the
 * accessible name when `label` is absent, exposes `pressed`, and reports
 * `onClick` when clicked.
 *
 * Lifecycle:
 * - `pressed` — on shows the toggle selected
 * - `disabled` — on prevents the control from being pressed and shows it as
 *   unavailable
 *
 * Modifiers:
 * - `size` — the control's fixed presentation:
 *   - `labeledTile` is a tall full-width glyph-and-label tile. Used by: node
 *     placement
 *   - `glyphTile` is a compact centered glyph tile. Used by: relationship
 *     placement
 */

import type { ReactElement } from "react";
import { GLYPH_VIEW_BOX, type GlyphDescriptor } from "../../../../shared/glyph";
import { GLYPH_EMPTY_FILL, GLYPH_STROKE_LINE_CAP, GLYPH_STROKE_LINE_JOIN } from "../../tokens";
import styles from "./ToggleButton.module.css";

type ToggleButtonProps = {
  readonly icon?: GlyphDescriptor;
  readonly label?: string;
  readonly title: string;
  readonly pressed: boolean;
  readonly disabled?: boolean;
  readonly size: "labeledTile" | "glyphTile";
  readonly onClick?: () => void;
};

export default function ToggleButton({
  icon,
  label,
  title,
  pressed,
  disabled = false,
  size,
  onClick,
}: ToggleButtonProps): ReactElement {
  const className = size === "labeledTile" ? styles.labeledTileButton : styles.glyphTileButton;

  return (
    <button
      type="button"
      className={className}
      aria-label={label === undefined ? title : undefined}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon === undefined ? null : (
        <span className={styles.icon} aria-hidden="true">
          <ToggleButtonGlyph glyph={icon} />
        </span>
      )}
      {label === undefined ? null : <span className={styles.label}>{label}</span>}
    </button>
  );
}

// Private helpers
function ToggleButtonGlyph({ glyph }: { readonly glyph: GlyphDescriptor }): ReactElement {
  return (
    <svg
      className={styles.glyph}
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
          className={glyph.dashed && index === 0 ? styles.dashedGlyphPath : undefined}
          d={path}
        />
      ))}
    </svg>
  );
}
