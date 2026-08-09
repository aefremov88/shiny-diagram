/**
 * Validation popup anchored to the element it is rendered beside.
 *
 * Joins `messages` into one single-line alert, truncating overflow, and places
 * it above the anchor or below when viewport space requires. Dismissing it —
 * from the keyboard, by clicking anywhere outside, or by its own dismiss control
 * — reports `onDismiss`. The popup paints at the supplied `stacking` plane.
 *
 * Used by: invalid class names, namespace names, style names, relationship
 * labels, and multiplicities.
 */

import { useLayoutEffect } from "react";
import type { CSSProperties, ReactElement } from "react";
import { GLYPH_VIEW_BOX } from "../../../../shared/glyph";
import { useAnchoredPopupPosition } from "../../../core/useAnchoredPopupPosition";
import styles from "./ValidationPopup.module.css";

type ValidationPopupProps = {
  readonly messages: readonly string[];
  readonly stacking: number;
  readonly onDismiss: () => void;
};

export default function ValidationPopup({
  messages,
  stacking,
  onDismiss,
}: ValidationPopupProps): ReactElement {
  const { anchorRef, popupRef, position } = useAnchoredPopupPosition(messages);

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
        style={
          {
            left: position?.left,
            top: position?.top,
            zIndex: stacking,
          } satisfies CSSProperties
        }
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
