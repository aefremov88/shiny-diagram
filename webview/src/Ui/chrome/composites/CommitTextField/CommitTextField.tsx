/**
 * Text field with validation, commit lifecycle, and cancellation.
 *
 * Holds `initialValue` as a draft, reports each edit through `onDraftChange`,
 * and resets when the incoming value changes. `validate` gates completion:
 * confirming a valid draft, or leaving the field with one, reports `onCommit`;
 * leaving with an invalid draft restores the committed value and reports
 * `onDiscard` with its messages; backing out restores it and reports `onCancel`.
 * A failed confirmation keeps its messages visible until dismissed or the draft
 * changes. `ariaLabel` always supplies the accessible name, and validation
 * paints at the supplied `validationStacking` plane.
 *
 * Used by: class names, namespace names, and diagram style names.
 *
 * Lifecycle:
 * - `disabled` — on prevents editing
 * - `isLabelVisible` — on shows `ariaLabel` in a fixed label column; off keeps
 *   only the accessible name
 */

import type { ReactElement } from "react";
import TextField from "../../primitives/TextField/TextField";
import ValidationPopup from "../../primitives/ValidationPopup/ValidationPopup";
import styles from "./CommitTextField.module.css";
import { useCommitLifecycle } from "../../../core/commitLifecycle";

type CommitTextFieldProps = {
  readonly initialValue: string;
  readonly ariaLabel?: string;
  readonly validationStacking: number;
  readonly validate: (draft: string) => readonly string[];
  readonly disabled?: boolean;
  readonly isLabelVisible?: boolean;
  readonly onCommit: (value: string) => void;
  readonly onDraftChange?: (value: string) => void;
  readonly onDiscard: (messages: readonly string[]) => void;
  readonly onCancel: () => void;
};

export default function CommitTextField({
  initialValue,
  validate,
  disabled = false,
  ariaLabel,
  isLabelVisible = true,
  validationStacking,
  onCommit,
  onDraftChange,
  onDiscard,
  onCancel,
}: CommitTextFieldProps): ReactElement {
  const lifecycle = useCommitLifecycle({
    initialValue,
    validate,
    onCommit,
    onDraftChange,
    onDiscard,
    onCancel,
  });

  const visibleLabel = isLabelVisible ? ariaLabel : undefined;

  return (
    <div className={visibleLabel === undefined ? styles.fieldWithoutLabel : styles.field}>
      {visibleLabel === undefined ? null : <span className={styles.label}>{visibleLabel}</span>}
      <div className={styles.inputHost}>
        <TextField
          value={lifecycle.draft}
          disabled={disabled}
          invalid={lifecycle.messages.length > 0}
          ariaLabel={ariaLabel}
          onChange={lifecycle.onDraftChange}
          onBlur={lifecycle.onBlur}
          onKeyDown={lifecycle.onKeyDown}
        />
      </div>
      {lifecycle.messages.length > 0 ? (
        <ValidationPopup
          messages={lifecycle.messages}
          stacking={validationStacking}
          onDismiss={lifecycle.onPopupDismiss}
        />
      ) : null}
    </div>
  );
}
