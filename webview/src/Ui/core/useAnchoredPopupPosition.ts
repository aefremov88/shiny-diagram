import { useLayoutEffect, useRef, useState } from "react";

export type AnchoredPopupPosition = {
  readonly left: number;
  readonly top: number;
  readonly placement: "above" | "below";
};

export function useAnchoredPopupPosition(content: unknown): {
  readonly anchorRef: React.RefObject<HTMLSpanElement | null>;
  readonly popupRef: React.RefObject<HTMLDivElement | null>;
  readonly position: AnchoredPopupPosition | null;
} {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<AnchoredPopupPosition | null>(null);

  useLayoutEffect(() => {
    const popupElement = popupRef.current;

    function updatePosition(): void {
      if (!popupElement?.matches(":popover-open")) popupElement?.showPopover();
      const anchor = anchorRef.current?.getBoundingClientRect();
      const popup = popupElement?.getBoundingClientRect();
      if (!anchor || !popup) return;
      const placement = anchor.top >= popup.height + 10 ? "above" : "below";
      setPosition({
        left: Math.min(
          window.innerWidth - popup.width / 2 - 8,
          Math.max(popup.width / 2 + 8, anchor.left + anchor.width / 2)
        ),
        top: placement === "above" ? anchor.top - 8 : anchor.bottom + 8,
        placement,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      if (popupElement?.matches(":popover-open")) popupElement.hidePopover();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [content]);

  return { anchorRef, popupRef, position };
}
