/**
 * Inline validation popup anchored to the element it is rendered beside.
 *
 * Joins `messages` into one single-line alert, truncating overflow, and places
 * it above the anchor or below when viewport space requires at the supplied
 * `stacking` plane. Dismissing it — from the keyboard, by clicking anywhere
 * outside, or by its own dismiss control — reports `onDismiss`.
 *
 * Used by: invalid class, namespace, note, and relationship text drafts.
 */

import { useLayoutEffect } from "react";
import type { CSSProperties, ReactElement } from "react";
import { GLYPH_VIEW_BOX } from "../../../../shared/glyph";
import { useAnchoredPopupPosition } from "../../../core/useAnchoredPopupPosition";
import styles from "./InlineValidationPopup.module.css";

type InlineValidationPopupProps = {
  readonly messages: readonly string[];
  readonly stacking: number;
  readonly onDismiss: () => void;
};

export default function InlineValidationPopup({
  messages,
  stacking,
  onDismiss,
}: InlineValidationPopupProps): ReactElement {
  const { anchorRef, popupRef, position } = useAnchoredPopupPosition(messages);
  const style = position
    ? ({ left: position.left, top: position.top, zIndex: stacking } satisfies CSSProperties)
    : ({ zIndex: stacking } satisfies CSSProperties);

  useLayoutEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDismiss();
    }

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target;
      if (target instanceof Node && popupRef.current?.contains(target)) return;
      onDismiss();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onDismiss, popupRef]);

  return (
    <>
      <span ref={anchorRef} className={styles.anchor} aria-hidden="true" />
      <div
        ref={popupRef}
        className={`${styles.popup} ${position?.placement === "below" ? styles.below : styles.above}`}
        style={style}
        role="alert"
        popover="manual"
      >
        <span className={styles.message}>{messages.join(" ")}</span>
        <button type="button" className={styles.dismiss} aria-label="Dismiss" onClick={onDismiss}>
          <svg viewBox={GLYPH_VIEW_BOX} fill="none" aria-hidden="true" focusable="false">
            <path
              d="M5 5 11 11M11 5 5 11"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
