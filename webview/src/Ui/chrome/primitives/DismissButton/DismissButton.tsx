/**
 * Dismiss button with a compact cross glyph.
 *
 * Uses `label` as its accessible name and tooltip. Pressing it does not steal
 * focus from the field it sits in and reports the press through `onMouseDown`;
 * clicking it reports `onClick`.
 *
 * Used by: field clear and cancel actions.
 */

import type { ReactElement } from "react";
import { GLYPH_VIEW_BOX } from "../../../../shared/glyph";
import styles from "./DismissButton.module.css";

type DismissButtonProps = {
  readonly label: string;
  readonly onClick: () => void;
  readonly onMouseDown?: () => void;
};

export default function DismissButton({
  label,
  onClick,
  onMouseDown,
}: DismissButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onMouseDown?.();
      }}
      onClick={onClick}
    >
      <svg viewBox={GLYPH_VIEW_BOX} fill="none" aria-hidden="true" focusable="false">
        <path d="M5 5 11 11M11 5 5 11" fill="none" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </button>
  );
}
