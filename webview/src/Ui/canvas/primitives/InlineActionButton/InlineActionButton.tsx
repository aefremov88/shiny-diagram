/**
 * Inline action button for cancel and add affordances.
 *
 * Renders `glyph`, uses `label` as its accessible name, and shows `title` as the
 * tooltip, defaulting to that accessible name. Pressing it does not steal focus from the field it sits
 * in; clicking it reports `onClick`. `surface` overrides the selected fallback
 * surface.
 *
 * Lifecycle:
 * - `disabled` — on prevents the control from being pressed
 * - `visible` — off hides the control from pointer users while keeping it
 *   keyboard-reachable; keyboard focus reveals it
 *
 * Modifiers:
 * - `treatment` — the action situation:
 *   - `cancel` is a compact circular error action. Used by: canvas text
 *     cancellation
 *   - `add` fills the reserved add region with a quiet rounded action without
 *     increasing its natural height. Used by: member addition
 * - `surfaceTone` — the action ground when `surface` is absent:
 *   - `default` uses the canvas surface. Used by: relationship text cancellation
 *   - `base` uses the base fill. Used by: class-member actions
 *   - `neutral` uses a neutral wash. Used by: namespace-title actions
 */

import type { CSSProperties, ReactElement } from "react";
import { GLYPH_VIEW_BOX, type GlyphDescriptor } from "../../../../shared/glyph";
import { GLYPH_EMPTY_FILL, GLYPH_STROKE_LINE_CAP, GLYPH_STROKE_LINE_JOIN } from "../../tokens";
import styles from "./InlineActionButton.module.css";

type InlineActionButtonProps = {
  readonly glyph: GlyphDescriptor;
  readonly label: string;
  readonly title?: string;
  readonly surface?: string;
  readonly disabled?: boolean;
  readonly visible?: boolean;
  readonly treatment: "cancel" | "add";
  readonly surfaceTone?: "default" | "base" | "neutral";
  readonly onClick: () => void;
};

export default function InlineActionButton({
  glyph,
  label,
  title = label,
  treatment,
  disabled = false,
  visible = true,
  surface,
  surfaceTone = "default",
  onClick,
}: InlineActionButtonProps): ReactElement {
  const style = { "--inline-action-surface": surface } as CSSProperties;
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[treatment]} ${styles[surfaceTone]} ${visible ? "" : styles.hidden}`}
      disabled={disabled}
      style={style}
      aria-label={label}
      title={title}
      onMouseDown={(event) => event.preventDefault()}
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
