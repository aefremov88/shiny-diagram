/**
 * Button for a labeled or icon-only command.
 *
 * In labeled presentation, renders `label` beside `icon` when supplied. In
 * icon-only presentation, renders `icon` and uses `ariaLabel` as its accessible
 * name and tooltip. Clicking reports `onClick`.
 *
 * Lifecycle:
 * - `disabled` — on shows the command as unavailable and it cannot be pressed
 * - `visible` — off preserves the command's layout space while removing it
 *   from sight, focus order, and accessibility
 * - `title` — supplies explanatory hover text, including disabled-state reasons
 *
 * Modifiers:
 * - `variant` — the command's designed situation:
 *   - `default` uses the ordinary full-width command surface. Used by:
 *     duplicate, style, generation, export, and attachment commands
 *   - `danger` uses error emphasis that fills on hover. Used by: delete commands
 *   - `rowAction` sizes to its content at the trailing edge with reduced height,
 *     padding, and type size. Used by: note detachment, relationship reversal,
 *     and class-style actions
 *   - `ghost` removes the resting container and uses a quiet wash on hover and
 *     press. Used by: document undo and redo
 * - `presentation` — the command's content presentation:
 *   - `labeled` shows command text and an optional glyph. Used by: duplicate,
 *     style, generation, export, attachment, delete, detachment, and reversal commands
 *   - `iconOnly` shows only a glyph in a compact square. Used by: document undo
 *     and redo
 */

import type { ReactElement } from "react";
import { GLYPH_VIEW_BOX, type GlyphDescriptor } from "../../../../shared/glyph";
import { GLYPH_EMPTY_FILL, GLYPH_STROKE_LINE_CAP, GLYPH_STROKE_LINE_JOIN } from "../../tokens";
import styles from "./Button.module.css";

type ButtonProps = {
  readonly label?: string;
  readonly icon?: GlyphDescriptor;
  readonly ariaLabel?: string;
  readonly title?: string;
  readonly disabled?: boolean;
  readonly visible?: boolean;
  readonly variant?: "default" | "danger" | "rowAction" | "ghost";
  readonly presentation?: "labeled" | "iconOnly";
  readonly onClick?: () => void;
};

export default function Button({
  label,
  icon,
  ariaLabel,
  title,
  disabled = false,
  variant = "default",
  presentation = "labeled",
  visible = true,
  onClick,
}: ButtonProps): ReactElement {
  const className = [
    variant === "danger" ? styles.dangerButton : styles.button,
    variant === "rowAction" ? styles.compact : "",
    variant === "ghost" ? styles.ghost : "",
    presentation === "iconOnly" ? styles.iconOnly : "",
    visible ? "" : styles.hidden,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      disabled={disabled || !visible}
      aria-label={presentation === "iconOnly" ? ariaLabel : undefined}
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      onClick={onClick}
      title={presentation === "iconOnly" ? ariaLabel : title}
    >
      {icon === undefined ? null : (
        <span className={styles.icon} aria-hidden="true">
          <ButtonGlyph glyph={icon} />
        </span>
      )}
      {label === undefined ? null : <span className={styles.label}>{label}</span>}
    </button>
  );
}

// Private helpers
function ButtonGlyph({ glyph }: { readonly glyph: GlyphDescriptor }): ReactElement {
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
