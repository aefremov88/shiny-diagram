/**
 * Line-treatment selector with sampled values and immediate selection.
 *
 * Shows `value`, using `constantValue` for an unauthored property or the preview
 * when values are mixed. The popup always shows every `presets` entry in Standard,
 * then every `documentValues` entry independently in In this diagram; equivalent
 * values remain visible in both sections. The constant is an ordinary
 * preset and choosing it reports null through `onChange` so the authored property is
 * cleared; every other row reports its value. Choosing returns focus to the control. Closing it without
 * choosing reports nothing: an outside press leaves focus where the click placed
 * it, while keyboard dismissal returns focus to the control; the row list is
 * keyboard-navigable. `popupWidth` sets the popup's minimum width before viewport
 * clamping, and the popup paints at the supplied `stacking` plane.
 *
 * Lifecycle:
 * - `disabled` — on means the list cannot be opened and shows the control as
 *   unavailable
 *
 * Modifiers:
 * - `kind` — the sampled line property:
 *   - `width` varies the sample's thickness. Used by: outline-width controls
 *   - `dash` varies the sample's pattern. Used by: outline-dash controls
 */

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";
import { useControlPopupPosition } from "../../../core/useControlPopupPosition";
import { usePopupDismiss } from "../../../core/usePopupDismiss";
import SelectorChevron from "../../primitives/SelectorChevron/SelectorChevron";
import styles from "./StrokeSelect.module.css";

type StrokeSelectProps = {
  readonly value: string | null | "multiple";
  readonly constantValue: string;
  readonly presets: readonly string[];
  readonly documentValues: readonly string[];
  readonly popupWidth?: number;
  readonly stacking: number;
  readonly disabled?: boolean;
  readonly kind: "width" | "dash";
  readonly onChange: (value: string | null) => void;
};

export default function StrokeSelect({
  kind,
  value,
  constantValue,
  presets,
  documentValues,
  popupWidth = 148,
  stacking,
  disabled = false,
  onChange,
}: StrokeSelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const popupPosition = useControlPopupPosition(isOpen, triggerRef, popupWidth);
  const closePopup = useCallback(() => setIsOpen(false), []);
  const { dismissAndRestoreFocus } = usePopupDismiss({
    isOpen,
    boundaryRef: containerRef,
    focusRef: triggerRef,
    onDismiss: closePopup,
  });
  const standardValues = presets;
  const options = [...standardValues, ...documentValues] as const;
  const isMultiple = value === "multiple";

  function selectValue(nextValue: string): void {
    onChange(valuesEqual(kind, nextValue, constantValue) ? null : nextValue);
    dismissAndRestoreFocus();
  }

  function togglePopup(): void {
    if (isOpen) {
      dismissAndRestoreFocus();
      return;
    }
    setFocusIndex(0);
    setIsOpen(true);
    requestAnimationFrame(() => optionRefs.current[0]?.focus());
  }

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    let nextIndex = index;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = Math.min(index + 1, options.length - 1);
        break;
      case "ArrowUp":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setFocusIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  }

  const popupStyle = {
    "--stroke-select-popup-top": `${popupPosition.top}px`,
    "--stroke-select-popup-left": `${popupPosition.left}px`,
    "--stroke-select-popup-width": `${popupPosition.width}px`,
    zIndex: stacking,
  } as CSSProperties;
  const triggerValue = value === null || isMultiple ? constantValue : value;

  return (
    <div ref={containerRef} className={styles.strokeSelect}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={togglePopup}
      >
        <LineSample kind={kind} value={triggerValue} multiple={isMultiple} />
        <SelectorChevron />
      </button>
      {isOpen ? (
        <div className={styles.popup} style={popupStyle} role="listbox">
          <span className={styles.heading}>Standard</span>
          {standardValues.map((preset, index) => {
            const optionIndex = index;
            return (
              <StrokeOption
                key={`standard:${preset}`}
                kind={kind}
                value={preset}
                selected={
                  !isMultiple && valuesEqual(kind, preset, value === null ? constantValue : value)
                }
                tabIndex={focusIndex === optionIndex ? 0 : -1}
                buttonRef={(element) => {
                  optionRefs.current[optionIndex] = element;
                }}
                onFocus={() => setFocusIndex(optionIndex)}
                onKeyDown={(event) => moveFocus(event, optionIndex)}
                onSelect={() => selectValue(preset)}
              />
            );
          })}
          {documentValues.length > 0 ? (
            <>
              <span className={styles.heading}>In this diagram</span>
              {documentValues.map((documentValue, index) => {
                const optionIndex = standardValues.length + index;
                return (
                  <StrokeOption
                    key={`document:${documentValue}`}
                    kind={kind}
                    value={documentValue}
                    selected={!isMultiple && valuesEqual(kind, documentValue, value)}
                    tabIndex={focusIndex === optionIndex ? 0 : -1}
                    buttonRef={(element) => {
                      optionRefs.current[optionIndex] = element;
                    }}
                    onFocus={() => setFocusIndex(optionIndex)}
                    onKeyDown={(event) => moveFocus(event, optionIndex)}
                    onSelect={() => selectValue(documentValue)}
                  />
                );
              })}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StrokeOption({
  kind,
  value,
  selected,
  tabIndex,
  buttonRef,
  onFocus,
  onKeyDown,
  onSelect,
}: {
  readonly kind: StrokeSelectProps["kind"];
  readonly value: string;
  readonly selected: boolean;
  readonly tabIndex: number;
  readonly buttonRef: (element: HTMLButtonElement | null) => void;
  readonly onFocus: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onSelect: () => void;
}): ReactElement {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="option"
      className={styles.option}
      aria-selected={selected}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onClick={onSelect}
    >
      <LineSample kind={kind} value={value} multiple={false} />
      <span className={styles.literal}>{toDisplayValue(kind, value)}</span>
    </button>
  );
}

function LineSample({
  kind,
  value,
  multiple,
}: {
  readonly kind: StrokeSelectProps["kind"];
  readonly value: string;
  readonly multiple: boolean;
}): ReactElement {
  return (
    <svg
      className={multiple ? styles.multipleSample : styles.sample}
      viewBox="0 0 120 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 8h116"
        stroke="currentColor"
        strokeWidth={kind === "width" ? value : "2"}
        strokeDasharray={kind === "dash" && normalizeValue(kind, value) !== "0" ? value : undefined}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Private helpers
function valuesEqual(
  kind: StrokeSelectProps["kind"],
  left: string,
  right: StrokeSelectProps["value"]
): boolean {
  return (
    right !== null &&
    right !== "multiple" &&
    normalizeValue(kind, left) === normalizeValue(kind, right)
  );
}

function normalizeValue(kind: StrokeSelectProps["kind"], value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (kind === "dash") return normalized === "none" || normalized === "" ? "0" : normalized;
  const numeric = Number.parseFloat(normalized);
  return Number.isNaN(numeric) ? normalized : String(numeric);
}

function toDisplayValue(kind: StrokeSelectProps["kind"], value: string): string {
  if (kind === "dash") return normalizeValue(kind, value) === "0" ? "0" : value;
  const normalized = normalizeValue(kind, value);
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized) ? `${normalized}px` : value;
}
