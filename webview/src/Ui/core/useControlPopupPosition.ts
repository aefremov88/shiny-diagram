import { useEffect, useState } from "react";
import type { RefObject } from "react";

export type ControlPopupPosition = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
};

const VIEWPORT_GUTTER = 8;
const CONTROL_GAP = 4;

export function useControlPopupPosition(
  isOpen: boolean,
  controlRef: RefObject<HTMLElement | null>,
  minimumWidth: number
): ControlPopupPosition {
  const [position, setPosition] = useState<ControlPopupPosition>({
    top: 0,
    left: VIEWPORT_GUTTER,
    width: minimumWidth,
  });

  useEffect(() => {
    if (!isOpen) return;
    const rect = controlRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, minimumWidth);
    const left = Math.max(
      VIEWPORT_GUTTER,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_GUTTER)
    );
    setPosition({ top: rect.bottom + CONTROL_GAP, left, width });
  }, [controlRef, isOpen, minimumWidth]);

  return position;
}
