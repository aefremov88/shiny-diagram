/**
 * Text field for controlled single-line entry.
 *
 * Displays `value`, reports edits through `onChange`, and forwards focus loss
 * and keyboard input through `onBlur` and `onKeyDown`. `ariaLabel` supplies the
 * accessible name.
 *
 * Lifecycle:
 * - `disabled` — on prevents editing and shows it as unavailable
 * - `invalid` — on exposes invalid state and error treatment
 *
 * Modifiers:
 * - `hasEndAction` — trailing action space:
 *   - `false` leaves the full field available to text. Used by: combo-box custom
 *     values and plain committed text
 *   - `true` reserves trailing room for an overlaid action. Used by: clearable
 *     and cancellable text fields
 */

import type { KeyboardEvent, ReactElement } from "react";
import styles from "./TextField.module.css";

type TextFieldProps = {
  readonly value: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly hasEndAction?: boolean;
  readonly onChange: (value: string) => void;
  readonly onBlur?: () => void;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export default function TextField({
  value,
  disabled = false,
  invalid = false,
  ariaLabel,
  hasEndAction = false,
  onChange,
  onBlur,
  onKeyDown,
}: TextFieldProps): ReactElement {
  return (
    <input
      className={hasEndAction ? styles.fieldWithEndAction : styles.field}
      value={value}
      disabled={disabled}
      aria-invalid={invalid}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
}
