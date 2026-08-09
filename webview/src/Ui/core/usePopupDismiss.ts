import { useCallback, useEffect } from "react";
import type { RefObject } from "react";

type PopupDismissOptions = {
  readonly isOpen: boolean;
  readonly boundaryRef: RefObject<HTMLElement | null>;
  readonly focusRef: RefObject<HTMLElement | null>;
  readonly onDismiss: () => void;
};

export function usePopupDismiss({
  isOpen,
  boundaryRef,
  focusRef,
  onDismiss,
}: PopupDismissOptions): {
  readonly dismissAndRestoreFocus: () => void;
} {
  const dismissAndRestoreFocus = useCallback((): void => {
    onDismiss();
    requestAnimationFrame(() => focusRef.current?.focus());
  }, [focusRef, onDismiss]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeFromPointer(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Node) || boundaryRef.current?.contains(target)) return;
      onDismiss();
    }

    function closeFromEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      dismissAndRestoreFocus();
    }

    window.addEventListener("pointerdown", closeFromPointer);
    window.addEventListener("keydown", closeFromEscape, true);
    return () => {
      window.removeEventListener("pointerdown", closeFromPointer);
      window.removeEventListener("keydown", closeFromEscape, true);
    };
  }, [boundaryRef, dismissAndRestoreFocus, isOpen, onDismiss]);

  return { dismissAndRestoreFocus };
}
