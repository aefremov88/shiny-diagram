/**
 * Inline text field for controlled single-line entry.
 *
 * Displays `value` with a text-entry cursor, uses `ariaLabel` as its accessible
 * name, reports edits through `onChange`, and forwards focus loss and keyboard
 * input through `onBlur` and `onKeyDown`.
 *
 * Lifecycle:
 * - `invalid` — on shows invalid outline treatment
 *
 * Modifiers:
 * - `hasEndAction` — trailing action space:
 *   - `false` leaves the full field available to text. Used by: class and
 *     namespace text
 *   - `true` reserves trailing room for an overlaid action. Used by:
 *     relationship labels and multiplicities
 * - `tone` — the field's ground and text treatment:
 *   - `default` inherits its host treatment. Used by: class and namespace text
 *   - `label` uses light edge-text editing treatment. Used by: relationship
 *     labels
 *   - `multiplicity` uses dark caption editing treatment. Used by: endpoint
 *     multiplicities
 */

import type { KeyboardEvent, ReactElement } from "react";
import styles from "./InlineTextField.module.css";

type InlineTextFieldProps = {
  readonly value: string;
  readonly ariaLabel: string;
  readonly invalid: boolean;
  readonly hasEndAction: boolean;
  readonly tone: "default" | "label" | "multiplicity";
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export default function InlineTextField({
  value,
  invalid,
  ariaLabel,
  hasEndAction,
  tone,
  onChange,
  onBlur,
  onKeyDown,
}: InlineTextFieldProps): ReactElement {
  const className = [
    styles.field,
    hasEndAction ? styles.withEndAction : "",
    tone === "label" ? styles.label : tone === "multiplicity" ? styles.multiplicity : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      className={className}
      value={value}
      aria-invalid={invalid}
      aria-label={ariaLabel}
      autoFocus
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
