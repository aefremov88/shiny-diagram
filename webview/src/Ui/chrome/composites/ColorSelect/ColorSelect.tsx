/**
 * Color selector with a swatch-grid popup and immediate selection.
 *
 * Shows `value` through the selected `preview`; null uses the `constantValue` preview
 * and "multiple" shows a mixed state. The popup combines `documentColors` with
 * the hue, shade, and neutral `presets`; the constant is an ordinary preset and
 * choosing it reports null so the authored property is cleared. Choosing a color
 * reports `onChange` and returns focus to the control. Closing it without choosing
 * reports nothing: an outside press leaves focus where the click placed it,
 * while keyboard dismissal returns focus to the control. The six-column grid is
 * keyboard-navigable, and the popup paints at the supplied `stacking` plane.
 *
 * Lifecycle:
 * - `disabled` — on means the list cannot be opened and shows the control as
 *   unavailable
 *
 * Modifiers:
 * - `preview` — the selected color's sample:
 *   - `fill` renders a filled square. Used by: fill-color properties
 *   - `stroke` renders a line. Used by: outline-color properties
 *   - `text` renders a letter sample. Used by: text-color properties
 */

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactElement } from "react";
import { useControlPopupPosition } from "../../../core/useControlPopupPosition";
import { usePopupDismiss } from "../../../core/usePopupDismiss";
import SelectorChevron from "../../primitives/SelectorChevron/SelectorChevron";
import styles from "./ColorSelect.module.css";

/**
 * Named color entry offered by ColorSelect.
 *
 * `name` labels the entry and `value` supplies the color reported when it is
 * chosen.
 */
export type ColorSelectPreset = {
  readonly name: string;
  readonly value: string;
};

/**
 * Grouped preset catalog arranged for ColorSelect's palette.
 *
 * `hues` supplies named three-shade groups, while `neutrals` supplies the
 * ungrouped neutral entries.
 */
export type ColorSelectPresetCatalog = {
  readonly hues: readonly {
    readonly name: string;
    readonly shades: readonly [ColorSelectPreset, ColorSelectPreset, ColorSelectPreset];
  }[];
  readonly neutrals: readonly ColorSelectPreset[];
};

type ColorSelectProps = {
  readonly value: string | null | "multiple";
  readonly presets: ColorSelectPresetCatalog;
  readonly documentColors: readonly string[];
  readonly constantValue: string;
  readonly stacking: number;
  readonly disabled?: boolean;
  readonly preview: "fill" | "stroke" | "text";
  readonly onChange: (value: string | null) => void;
};

const PALETTE_COLUMN_COUNT = 6;
const POPUP_MIN_WIDTH = 164;

export default function ColorSelect({
  preview,
  value,
  presets,
  documentColors,
  constantValue,
  stacking,
  disabled = false,
  onChange,
}: ColorSelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [paletteFocusIndex, setPaletteFocusIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const paletteRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const popupPosition = useControlPopupPosition(isOpen, triggerRef, POPUP_MIN_WIDTH);
  const closePopup = useCallback(() => setIsOpen(false), []);
  const { dismissAndRestoreFocus } = usePopupDismiss({
    isOpen,
    boundaryRef: containerRef,
    focusRef: triggerRef,
    onDismiss: closePopup,
  });
  const palette = toPalette(presets);
  const isMultiple = value === "multiple";

  function selectValue(nextValue: string): void {
    onChange(colorsEqual(nextValue, constantValue) ? null : nextValue);
    dismissAndRestoreFocus();
  }

  function openPopup(): void {
    if (isOpen) {
      dismissAndRestoreFocus();
      return;
    }
    setPaletteFocusIndex(0);
    setIsOpen(true);
    requestAnimationFrame(() => paletteRefs.current[0]?.focus());
  }

  function movePaletteFocus(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const rowCount = Math.ceil(palette.length / PALETTE_COLUMN_COUNT);
    const row = Math.floor(index / PALETTE_COLUMN_COUNT);
    const column = index % PALETTE_COLUMN_COUNT;
    let nextIndex = index;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = Math.min(index + 1, palette.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = Math.max(index - 1, 0);
        break;
      case "ArrowDown":
        nextIndex = Math.min(
          Math.min(row + 1, rowCount - 1) * PALETTE_COLUMN_COUNT + column,
          palette.length - 1
        );
        break;
      case "ArrowUp":
        nextIndex = Math.min(
          Math.max(row - 1, 0) * PALETTE_COLUMN_COUNT + column,
          palette.length - 1
        );
        break;
      case "Home":
        nextIndex = row * PALETTE_COLUMN_COUNT;
        break;
      case "End":
        nextIndex = Math.min((row + 1) * PALETTE_COLUMN_COUNT - 1, palette.length - 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    paletteRefs.current[nextIndex]?.focus();
    setPaletteFocusIndex(nextIndex);
  }

  const popupStyle = {
    "--color-select-popup-top": `${popupPosition.top}px`,
    "--color-select-popup-left": `${popupPosition.left}px`,
    "--color-select-popup-width": `${popupPosition.width}px`,
    zIndex: stacking,
  } as CSSProperties;

  return (
    <div ref={containerRef} className={styles.colorSelect}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="grid"
        aria-expanded={isOpen}
        onClick={openPopup}
      >
        <ColorPreview
          preview={preview}
          value={value === null ? constantValue : value}
          emphasized={!isMultiple}
        />
        <SelectorChevron />
      </button>
      {isOpen ? (
        <div className={styles.popup} style={popupStyle}>
          {documentColors.length > 0 ? (
            <section className={styles.section} aria-label="In this diagram">
              <span className={styles.heading}>In this diagram</span>
              <div className={styles.documentGrid} role="grid">
                {documentColors.map((color) => (
                  <ColorOption
                    key={color}
                    value={color}
                    selected={!isMultiple && colorsEqual(color, value)}
                    onSelect={selectValue}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <div className={styles.paletteGrid} role="grid" aria-label="Preset colors">
            {palette.map((preset, index) => (
              <ColorOption
                key={preset.value}
                value={preset.value}
                label={preset.name}
                selected={
                  !isMultiple && colorsEqual(preset.value, value === null ? constantValue : value)
                }
                tabIndex={index === paletteFocusIndex ? 0 : -1}
                buttonRef={(element) => {
                  paletteRefs.current[index] = element;
                }}
                onKeyDown={(event) => movePaletteFocus(event, index)}
                onFocus={() => setPaletteFocusIndex(index)}
                onSelect={selectValue}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ColorPreview({
  preview,
  value,
  emphasized,
}: {
  readonly preview: ColorSelectProps["preview"];
  readonly value: ColorSelectProps["value"];
  readonly emphasized: boolean;
}): ReactElement {
  const dynamicStyle = {
    "--color-select-value": value === null || value === "multiple" ? undefined : value,
  } as CSSProperties;
  const className = [
    styles.glyph,
    styles[preview],
    value === "multiple" ? styles.multiple : "",
    emphasized ? styles.emphasized : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={className} style={dynamicStyle} aria-hidden="true">
      {preview === "text" ? "A" : null}
    </span>
  );
}

function ColorOption({
  value,
  label,
  selected,
  buttonRef,
  tabIndex,
  onKeyDown,
  onFocus,
  onSelect,
}: {
  readonly value: string;
  readonly label?: string;
  readonly selected: boolean;
  readonly buttonRef?: (element: HTMLButtonElement | null) => void;
  readonly tabIndex?: number;
  readonly onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onFocus?: () => void;
  readonly onSelect: (value: string) => void;
}): ReactElement {
  const dynamicStyle = { "--color-select-value": value } as CSSProperties;
  return (
    <button
      ref={buttonRef}
      type="button"
      role="gridcell"
      className={styles.colorOption}
      style={dynamicStyle}
      aria-label={label ?? value}
      aria-pressed={selected}
      title={label}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onClick={() => onSelect(value)}
    />
  );
}

function toPalette(presets: ColorSelectPresetCatalog): readonly ColorSelectPreset[] {
  const shadeRows = [0, 1, 2] as const;
  return [
    ...shadeRows.flatMap((shade) => presets.hues.map((family) => family.shades[shade])),
    ...presets.neutrals,
  ];
}

function colorsEqual(left: string, right: ColorSelectProps["value"]): boolean {
  if (right === null || right === "multiple") return false;
  return normalizeColor(left) === normalizeColor(right);
}

function normalizeColor(value: string): string {
  const normalized = value.trim().toLowerCase();
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(normalized);
  return shortHex
    ? `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`
    : normalized;
}
