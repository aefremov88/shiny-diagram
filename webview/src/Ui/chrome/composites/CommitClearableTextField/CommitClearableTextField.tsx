/**
 * Clearable text field with validation and a commit lifecycle.
 *
 * Holds `initialValue` as a draft and resets to new incoming values. `validate`
 * gates completion: confirming a valid draft, or leaving the field with one,
 * reports `onCommit`; leaving with an invalid draft restores the committed value
 * and reports `onDiscard` with its messages; backing out restores it and reports
 * `onCancel`. A failed confirmation keeps its messages visible until dismissed
 * or the draft changes. While a nonempty draft has focus, the clear action
 * empties it and reports `onClear`. `ariaLabel` always names the field and its
 * clear action. Validation paints at the supplied `validationStacking` plane.
 *
 * Used by: relationship labels and optional class labels.
 *
 * Lifecycle:
 * - `disabled` — on prevents editing and removes the clear action
 * - `isLabelVisible` — on shows `ariaLabel` in a fixed label column; off keeps
 *   only the accessible name
 */

import type { ReactElement } from "react";
import TextField from "../../primitives/TextField/TextField";
import ValidationPopup from "../../primitives/ValidationPopup/ValidationPopup";
import DismissButton from "../../primitives/DismissButton/DismissButton";
import styles from "./CommitClearableTextField.module.css";
import { useCommitLifecycle } from "../../../core/commitLifecycle";

type CommitClearableTextFieldProps = {
  readonly initialValue: string;
  readonly ariaLabel?: string;
  readonly validationStacking: number;
  readonly validate: (draft: string) => readonly string[];
  readonly disabled?: boolean;
  readonly isLabelVisible?: boolean;
  readonly onCommit: (value: string) => void;
  readonly onClear: () => void;
  readonly onDiscard: (messages: readonly string[]) => void;
  readonly onCancel: () => void;
};

export default function CommitClearableTextField({
  initialValue,
  validate,
  disabled = false,
  ariaLabel,
  isLabelVisible = true,
  validationStacking,
  onCommit,
  onClear,
  onDiscard,
  onCancel,
}: CommitClearableTextFieldProps): ReactElement {
  const lifecycle = useCommitLifecycle({
    initialValue,
    validate,
    onCommit,
    onDiscard,
    onCancel,
  });

  function handleClear(): void {
    lifecycle.onDraftChange("");
    onClear();
  }

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
          hasEndAction={lifecycle.draft !== ""}
          onChange={lifecycle.onDraftChange}
          onBlur={lifecycle.onBlur}
          onKeyDown={lifecycle.onKeyDown}
        />
        {lifecycle.draft === "" || disabled ? null : (
          <span className={styles.clearButton}>
            <DismissButton label={`Clear ${ariaLabel ?? "value"}`} onClick={handleClear} />
          </span>
        )}
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
