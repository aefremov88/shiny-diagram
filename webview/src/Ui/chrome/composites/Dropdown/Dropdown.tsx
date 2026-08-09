/**
 * Dropdown whose entries can carry visual previews beside or instead of text.
 *
 * Selects the matching entry from `options` for `value`; an unmatched value
 * leaves the closed control empty. The user opens the list from the closed
 * control and closes it the same way. Closing it without choosing reports
 * nothing: an outside press leaves focus where the click placed it, while
 * keyboard dismissal returns focus to the control. Choosing an entry closes the list and reports its value through
 * `onChange`. Each entry may show a text label, a preview, or both, as its options
 * entry supplies; the list paints at the supplied `stacking` plane.
 *
 * Used by: named-style, relationship endpoint, and relationship-line choices.
 *
 * Lifecycle:
 * - `disabled` — on means the list cannot be opened and shows the control as
 *   unavailable
 */

import { useCallback, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { CSSProperties } from "react";
import type { StyleProperties } from "../../../../shared/style";
import { usePopupDismiss } from "../../../core/usePopupDismiss";
import SelectorChevron from "../../primitives/SelectorChevron/SelectorChevron";
import styles from "./Dropdown.module.css";

/**
 * Entry offered by Dropdown with optional visual preview capabilities.
 *
 * `value` is reported when chosen and `label` supplies its text. `swatchStyle`
 * carries preview values, `swatchKind` selects the preview shape, and
 * `isLabelVisible` may reserve the entry for its preview alone.
 */
export type DropdownOption = {
  readonly value: string;
  readonly label: string;
  readonly swatchStyle?: Partial<StyleProperties>;
  readonly swatchKind?:
    | "box"
    | "boxLabel"
    | "line"
    | "dash"
    | "text"
    | "none"
    | "arrow"
    | "triangle"
    | "diamond"
    | "circle";
  readonly isLabelVisible?: boolean;
};

type DropdownProps = {
  readonly options: readonly DropdownOption[];
  readonly value: string;
  readonly stacking: number;
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
};

export default function Dropdown({
  options,
  value,
  stacking,
  disabled = false,
  onChange,
}: DropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const closePopup = useCallback(() => setIsOpen(false), []);
  usePopupDismiss({
    isOpen,
    boundaryRef: containerRef,
    focusRef: triggerRef,
    onDismiss: closePopup,
  });
  const triggerStyle: CSSProperties & { "--dropdown-arrow-color"?: string } = {
    "--dropdown-arrow-color": selectedOption?.swatchStyle?.color ?? undefined,
  };

  function selectValue(nextValue: string): void {
    setIsOpen(false);
    onChange(nextValue);
  }

  return (
    <div ref={containerRef} className={styles.dropdown}>
      <button
        ref={triggerRef}
        type="button"
        className={
          selectedOption?.swatchKind === "boxLabel" ? styles.boxLabelTrigger : styles.trigger
        }
        style={triggerStyle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={selectedOption?.isLabelVisible === false ? selectedOption.label : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={styles.triggerContent}>
          {selectedOption?.swatchStyle || selectedOption?.swatchKind ? (
            <OptionContent option={selectedOption} />
          ) : (
            <span className={styles.triggerLabel}>{selectedOption?.label ?? ""}</span>
          )}
          <span className={styles.arrow} aria-hidden="true">
            <SelectorChevron />
          </span>
        </span>
      </button>
      {isOpen ? (
        <div className={styles.menu} style={{ zIndex: stacking }} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.option} ${option.isLabelVisible === false ? styles.iconOption : ""}`}
              role="option"
              aria-selected={option.value === value}
              aria-label={option.isLabelVisible === false ? option.label : undefined}
              onClick={() => selectValue(option.value)}
            >
              {option.swatchStyle || option.swatchKind ? (
                <OptionContent option={option} />
              ) : (
                <span className={styles.optionLabel}>{option.label}</span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OptionContent({ option }: { readonly option: DropdownOption }): ReactElement {
  const swatchKind = option.swatchKind ?? "box";
  const isBoxLabel = swatchKind === "boxLabel";
  const isEndpointSample = ["none", "arrow", "triangle", "diamond", "circle"].includes(swatchKind);
  const isLineSample = swatchKind === "line" || swatchKind === "dash";
  const isLabelVisible = option.isLabelVisible !== false;
  const swatchStyle: CSSProperties & {
    "--dropdown-swatch-fill"?: string;
    "--dropdown-swatch-stroke"?: string;
    "--dropdown-swatch-color"?: string;
    "--dropdown-swatch-stroke-width"?: string;
    "--dropdown-swatch-stroke-dasharray"?: string;
  } = {
    "--dropdown-swatch-fill": option.swatchStyle?.fill ?? undefined,
    "--dropdown-swatch-stroke": option.swatchStyle?.stroke ?? undefined,
    "--dropdown-swatch-color": option.swatchStyle?.color ?? undefined,
    "--dropdown-swatch-stroke-width": option.swatchStyle?.strokeWidth ?? undefined,
    "--dropdown-swatch-stroke-dasharray": option.swatchStyle?.strokeDasharray ?? undefined,
  };

  return (
    <span
      className={
        isBoxLabel
          ? styles.boxLabelContent
          : isLabelVisible
            ? styles.optionContent
            : styles.swatchOnlyContent
      }
    >
      <span
        className={`${styles.swatch} ${swatchKind === "box" || isBoxLabel ? styles.boxSwatch : styles.sampleSwatch} ${isBoxLabel ? styles.boxLabelSwatch : ""} ${isEndpointSample ? styles.endpointSwatch : ""} ${isLineSample ? styles.longLineSwatch : ""}`}
        style={swatchStyle}
        aria-hidden="true"
      >
        {isBoxLabel ? <span className={styles.embeddedLabel}>{option.label}</span> : null}
        {swatchKind === "line" || swatchKind === "dash" ? (
          <svg
            className={styles.lineSample}
            viewBox="0 0 36 10"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2 5h32"
              stroke="currentColor"
              strokeWidth={option.swatchStyle?.strokeWidth ?? "1.5px"}
              strokeDasharray={
                swatchKind === "dash" ? (option.swatchStyle?.strokeDasharray ?? "3 3") : undefined
              }
              strokeLinecap="round"
            />
          </svg>
        ) : null}
        {swatchKind === "none" ||
        swatchKind === "arrow" ||
        swatchKind === "triangle" ||
        swatchKind === "diamond" ||
        swatchKind === "circle" ? (
          <svg
            className={styles.endpointSample}
            viewBox="0 0 32 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M2 8h18" className={styles.endpointLine} />
            {swatchKind === "none" ? (
              <path d="m23 4 7 8M30 4l-7 8" className={styles.endpointOpen} />
            ) : null}
            {swatchKind === "arrow" ? (
              <path d="m22 3 8 5-8 5" className={styles.endpointOpen} />
            ) : null}
            {swatchKind === "triangle" ? (
              <path d="m21 2 9 6-9 6Z" className={styles.endpointOpen} />
            ) : null}
            {swatchKind === "diamond" ? (
              <path d="m20 8 5-5 5 5-5 5Z" className={styles.endpointOpen} />
            ) : null}
            {swatchKind === "circle" ? (
              <circle cx="25" cy="8" r="4" className={styles.endpointOpen} />
            ) : null}
          </svg>
        ) : null}
        {swatchKind === "text" ? <span className={styles.textSample}>A</span> : null}
      </span>
      {isLabelVisible && !isBoxLabel ? (
        <span className={styles.optionText}>{option.label}</span>
      ) : null}
    </span>
  );
}
