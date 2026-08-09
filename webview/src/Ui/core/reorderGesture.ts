import type { PointerEvent } from "react";

export type ReorderDragState = {
  readonly index: number;
  readonly pointerId: number;
  readonly originX: number;
  readonly originY: number;
  readonly isActive: boolean;
  readonly dropGap: number;
};

const DRAG_THRESHOLD = 4;

export function updateReorderDrag(
  event: PointerEvent<HTMLElement>,
  index: number,
  dragState: ReorderDragState | null,
  setDragState: (state: ReorderDragState | null) => void,
  listElement: HTMLElement | null
): void {
  if (dragState?.pointerId !== event.pointerId || dragState.index !== index) return;
  const distance = Math.hypot(event.clientX - dragState.originX, event.clientY - dragState.originY);
  if (!dragState.isActive && distance < DRAG_THRESHOLD) return;
  event.preventDefault();
  event.stopPropagation();
  setDragState({
    ...dragState,
    isActive: true,
    dropGap: toDropGap(listElement, index, event.clientY),
  });
}

export function toRenderedReorderGap(draggedIndex: number, dropGap: number): number {
  return dropGap > draggedIndex ? dropGap + 1 : dropGap;
}

function toDropGap(
  listElement: HTMLElement | null,
  draggedIndex: number,
  pointerY: number
): number {
  if (!listElement) return 0;
  const rows = [...listElement.querySelectorAll<HTMLElement>("[data-reorder-row='true']")];
  let gap = 0;
  rows.forEach((row, index) => {
    if (index === draggedIndex) return;
    const rect = row.getBoundingClientRect();
    if (pointerY >= rect.top + rect.height / 2) gap++;
  });
  return gap;
}
