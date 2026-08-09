/**
 * Segmented control for one selection from a labeled option set.
 *
 * Renders `options` as a radiogroup named by `ariaLabel`, marks `value` as
 * selected, supports arrow, Home, and End navigation, and reports a selected
 * option through `onChange`.
 *
 * Used by: Mermaid/Shiny mode selection.
 */

import { useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import styles from "./SegmentedControl.module.css";

/** One selectable value and its visible label. */
export type SegmentedControlOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

type SegmentedControlProps<T extends string> = {
  readonly options: readonly SegmentedControlOption<T>[];
  readonly value: T;
  readonly ariaLabel: string;
  readonly onChange: (value: T) => void;
};

export default function SegmentedControl<T extends string>({
  options,
  value,
  ariaLabel,
  onChange,
}: SegmentedControlProps<T>): ReactElement {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const nextIndex = toNextIndex(event.key, index, options.length);
    if (nextIndex === null) return;
    event.preventDefault();
    const nextOption = options[nextIndex];
    if (!nextOption) return;
    onChange(nextOption.value);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.control} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={selected ? styles.selectedSegment : styles.segment}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Private helpers
function toNextIndex(key: string, index: number, length: number): number | null {
  if (length === 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + length) % length;
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % length;
  return null;
}
