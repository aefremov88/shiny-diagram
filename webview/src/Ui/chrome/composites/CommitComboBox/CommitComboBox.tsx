/**
 * Combo box with a commit lifecycle on its free-text entry.
 *
 * Shows the committed value (`initialValue`) with its caption (`ariaLabel`). Choosing
 * a preset (`options` — the element appends the "Custom" entry itself,
 * never include one) commits it immediately (`onCommit`) — no draft, no
 * validation. Custom text is held as a draft until exactly one outcome
 * concludes the edit: committed (`onCommit`), discarded (`onDiscard` —
 * receives the draft's messages), or cancelled (`onCancel`). A draft
 * failing validation (`validate`) shows its messages and is never committed.
 * While the menu is open, keyboard dismissal closes it and returns focus to its
 * control without cancelling the field draft; an outside press closes it without
 * moving focus. The menu paints at `menuStacking`, and validation paints at
 * `validationStacking`.
 *
 * Used by: class stereotypes and relationship endpoint multiplicities.
 *
 * Lifecycle:
 * - `disabled`       — the value is shown, an open menu closes, and no
 *   interaction is accepted
 * - `isLabelVisible` — off hides the visible caption; the accessible name
 *   (`ariaLabel`) always remains
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { DropdownOption } from "../Dropdown/Dropdown";
import TextField from "../../primitives/TextField/TextField";
import SelectorChevron from "../../primitives/SelectorChevron/SelectorChevron";
import ValidationPopup from "../../primitives/ValidationPopup/ValidationPopup";
import styles from "./CommitComboBox.module.css";
import { useCommitLifecycle } from "../../../core/commitLifecycle";
import { usePopupDismiss } from "../../../core/usePopupDismiss";

type CommitComboBoxProps = {
  readonly initialValue: string;
  readonly options: readonly DropdownOption[];
  readonly ariaLabel?: string;
  readonly menuStacking: number;
  readonly validationStacking: number;
  readonly validate: (draft: string) => readonly string[];
  readonly disabled?: boolean;
  readonly isLabelVisible?: boolean;
  readonly onCommit: (value: string) => void;
  readonly onDiscard: (messages: readonly string[]) => void;
  readonly onCancel: () => void;
};

export default function CommitComboBox({
  initialValue,
  options,
  validate,
  disabled = false,
  ariaLabel,
  isLabelVisible = true,
  menuStacking,
  validationStacking,
  onCommit,
  onDiscard,
  onCancel,
}: CommitComboBoxProps): ReactElement {
  const [isCustom, setIsCustom] = useState(() => !hasPresetValue(options, initialValue));
  const [isOpen, setIsOpen] = useState(false);
  const comboBoxRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const lifecycle = useCommitLifecycle({ initialValue, validate, onCommit, onDiscard, onCancel });
  const closePopup = useCallback(() => setIsOpen(false), []);
  usePopupDismiss({
    isOpen,
    boundaryRef: comboBoxRef,
    focusRef: menuButtonRef,
    onDismiss: closePopup,
  });
  const selectedOption = options.find((option) => option.value === initialValue);
  const renderedOptions = [...options, { value: "__custom", label: "Custom" }];

  useEffect(() => {
    setIsCustom(!hasPresetValue(options, initialValue));
  }, [initialValue, options]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  function selectValue(nextValue: string): void {
    setIsOpen(false);
    if (nextValue === "__custom") {
      setIsCustom(true);
      lifecycle.onDraftChange(hasPresetValue(options, initialValue) ? "" : initialValue);
      return;
    }
    setIsCustom(false);
    lifecycle.onDraftChange(nextValue);
    onCommit(nextValue);
  }

  const visibleLabel = isLabelVisible ? ariaLabel : undefined;

  return (
    <div className={visibleLabel === undefined ? styles.comboWithoutLabel : styles.combo}>
      {visibleLabel === undefined ? null : <span className={styles.label}>{visibleLabel}</span>}
      <div ref={comboBoxRef} className={styles.comboBox}>
        {isCustom ? (
          <TextField
            value={lifecycle.draft}
            disabled={disabled}
            invalid={lifecycle.messages.length > 0}
            ariaLabel={ariaLabel}
            hasEndAction
            onChange={lifecycle.onDraftChange}
            onBlur={lifecycle.onBlur}
            onKeyDown={lifecycle.onKeyDown}
          />
        ) : (
          <button
            type="button"
            className={styles.valueButton}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
          >
            {selectedOption?.label ?? ""}
          </button>
        )}
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          disabled={disabled}
          aria-label={ariaLabel === undefined ? "Options" : `${ariaLabel} options`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((current) => !current)}
        >
          <SelectorChevron />
        </button>
        {isOpen ? (
          <div className={styles.menu} style={{ zIndex: menuStacking }} role="listbox">
            {renderedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.option}
                role="option"
                aria-selected={
                  option.value === "__custom"
                    ? isCustom
                    : !isCustom && option.value === initialValue
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectValue(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {lifecycle.messages.length > 0 ? (
          <ValidationPopup
            messages={lifecycle.messages}
            stacking={validationStacking}
            onDismiss={lifecycle.onPopupDismiss}
          />
        ) : null}
      </div>
    </div>
  );
}

function hasPresetValue(options: readonly DropdownOption[], value: string): boolean {
  return options.some((option) => option.value === value);
}
