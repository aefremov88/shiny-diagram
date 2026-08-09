import type { Rect } from "../../../shared/geometry";
import {
  LAYOUT_CLASS_CHAR_WIDTH,
  LAYOUT_CLASS_ADD_MEMBER_AFFORDANCE_HEIGHT,
  LAYOUT_CLASS_BODY_VERTICAL_PADDING,
  LAYOUT_CLASS_COMPARTMENT_SEPARATOR_HEIGHT,
  LAYOUT_CLASS_HEADER_HEIGHT,
  LAYOUT_CLASS_HORIZONTAL_PADDING,
  LAYOUT_CLASS_MAX_WIDTH,
  LAYOUT_CLASS_MIN_WIDTH,
  LAYOUT_CLASS_PREFIX_WIDTH,
  LAYOUT_CLASS_MEMBER_COMPARTMENT_COUNT,
  LAYOUT_CLASS_OUTER_BORDER_HEIGHT,
  LAYOUT_MEMBER_ROW_HEIGHT,
  LAYOUT_NOTE_CHARS_PER_LINE,
  LAYOUT_NOTE_LINE_HEIGHT,
  LAYOUT_NOTE_PADDING,
  LAYOUT_NOTE_WIDTH,
} from "../../config/editorUiConfig";
import type { LayoutClass, LayoutInput } from "./layoutContracts";

export type EstimatedSize = Pick<Rect, "w" | "h">;

export function estimateClassSize(value: LayoutClass): EstimatedSize {
  if (value.bounds) return { w: value.bounds.w, h: value.bounds.h };
  return estimateUnpositionedClassSize(value);
}

export function estimateUnpositionedClassSize(value: Omit<LayoutClass, "bounds">): EstimatedSize {
  const longestText = Math.max(
    0,
    ...value.headerTexts.map(length),
    ...value.members.map((m) => length(m.text))
  );
  return {
    w: clamp(
      longestText * LAYOUT_CLASS_CHAR_WIDTH +
        LAYOUT_CLASS_PREFIX_WIDTH +
        LAYOUT_CLASS_HORIZONTAL_PADDING,
      LAYOUT_CLASS_MIN_WIDTH,
      LAYOUT_CLASS_MAX_WIDTH
    ),
    h:
      LAYOUT_CLASS_HEADER_HEIGHT +
      LAYOUT_CLASS_BODY_VERTICAL_PADDING +
      LAYOUT_CLASS_MEMBER_COMPARTMENT_COUNT * LAYOUT_CLASS_ADD_MEMBER_AFFORDANCE_HEIGHT +
      LAYOUT_CLASS_COMPARTMENT_SEPARATOR_HEIGHT +
      LAYOUT_CLASS_OUTER_BORDER_HEIGHT +
      value.members.length * LAYOUT_MEMBER_ROW_HEIGHT,
  };
}

export function estimateNoteSize(note: LayoutInput["notes"][number]): EstimatedSize {
  if (note.bounds) return { w: note.bounds.w, h: note.bounds.h };
  return estimateUnpositionedNoteSize(note);
}

export function estimateUnpositionedNoteSize(
  note: Pick<LayoutInput["notes"][number], "text">
): EstimatedSize {
  return {
    w: LAYOUT_NOTE_WIDTH,
    h:
      Math.max(1, Math.ceil(note.text.length / LAYOUT_NOTE_CHARS_PER_LINE)) *
        LAYOUT_NOTE_LINE_HEIGHT +
      LAYOUT_NOTE_PADDING,
  };
}

const length = (text: string): number => [...text].length;
const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
