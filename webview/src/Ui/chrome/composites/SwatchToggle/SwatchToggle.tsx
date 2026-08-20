/**
 * Toggle button containing a styled box swatch.
 *
 * Renders `label` and the supplied box `styleValues`, exposes `pressed`, and
 * reports `onClick` when clicked. `targetRole` and `targetName` are transcribed
 * onto the button.
 *
 * Gesture targets:
 * - `swatchToggle()` — `role=button`
 *
 * Used by: saved-style selection.
 *
 * Lifecycle:
 * - `pressed` — on shows the swatch selected
 * - `disabled` — on prevents the control from being pressed and dims it
 */

import type { ReactElement } from "react";
import type { StyleProperties } from "../../../../shared/style";
import StyledBoxSwatch from "../../primitives/StyledBoxSwatch/StyledBoxSwatch";
import styles from "./SwatchToggle.module.css";

type SwatchToggleProps = {
  readonly styleValues: Partial<StyleProperties>;
  readonly label: string;
  readonly pressed: boolean;
  readonly disabled?: boolean;
  readonly targetRole?: string;
  readonly targetName?: string;
  readonly onClick?: () => void;
};

export default function SwatchToggle({
  styleValues,
  label,
  pressed,
  disabled = false,
  targetRole,
  targetName,
  onClick,
}: SwatchToggleProps): ReactElement {
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={pressed}
      disabled={disabled}
      data-target-role={targetRole}
      data-target-name={targetName}
      onClick={onClick}
    >
      <StyledBoxSwatch styleValues={styleValues} label={label} />
    </button>
  );
}
