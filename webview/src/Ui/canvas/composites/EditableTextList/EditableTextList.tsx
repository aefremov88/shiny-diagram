/**
 * Editable text list with insertion, emphasis editing, and pointer reordering.
 *
 * Renders `rows` at their natural wrapped height, preserving each row's text
 * and emphasis. Disabled rows and their add region attach no pointer handlers or
 * action control, leaving cursor choice and dragging to their host. Clicking an
 * enabled row opens an editor governed by `validate`; completion trims and
 * reports `onRowCommit`. The hover add action uses `addLabel` and `addTitle`, and reports
 * nonempty trimmed additions through `onRowAdd`. An enabled row press is owned
 * exclusively by the list: pointer dragging reports `onRowReorder` with source
 * row and destination gap, while preventing a host drag from starting; a drag
 * can be cancelled from the keyboard, leaving the order unchanged. Actions use
 * `actionStacking`, validation uses `validationStacking`, and `surface` supplies
 * an explicit action ground over the class-member fallback. Editing lifecycle
 * is reported through `onEditStart` and `onEditEnd`.
 *
 * Used by: class attribute and operation rows.
 *
 * Lifecycle:
 * - `isEditable` — on permits row editing, reordering, and adding; off
 *   leaves display rows inert
 * - `isEmphasisEditable` — on initializes and commits row emphasis; off removes
 *   emphasis from edit outcomes
 */

import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { GlyphDescriptor } from "../../../../shared/glyph";
import type { ReorderDragState } from "../../../core/reorderGesture";
import { toRenderedReorderGap, updateReorderDrag } from "../../../core/reorderGesture";
import DropIndicator from "../../primitives/DropIndicator/DropIndicator";
import InlineActionButton from "../../primitives/InlineActionButton/InlineActionButton";
import InlineTextBlock from "../../primitives/InlineTextBlock/InlineTextBlock";
import InlineEmphasisCommitTextField from "../InlineEmphasisCommitTextField/InlineEmphasisCommitTextField";
import type { TextEmphasis } from "../InlineEmphasisCommitTextField/InlineEmphasisCommitTextField";
import styles from "./EditableTextList.module.css";

export type { TextEmphasis };

/**
 * EditableTextList entry carrying text and optional emphasis content.
 *
 * `text` supplies the row value and `emphasis` supplies its initial underline,
 * italic, or unemphasized state.
 */
export type EditableTextListRow = {
  readonly text: string;
  readonly emphasis?: TextEmphasis | null;
};

type EditableTextListProps = {
  readonly rows: readonly EditableTextListRow[];
  readonly addLabel: string;
  readonly addTitle: string;
  readonly surface?: string;
  readonly actionStacking: number;
  readonly validationStacking: number;
  readonly validate: (draft: string) => readonly string[];
  readonly isEditable: boolean;
  readonly isEmphasisEditable: boolean;
  readonly onRowCommit: (index: number, value: string, emphasis: TextEmphasis | null) => void;
  readonly onRowAdd: (value: string, emphasis: TextEmphasis | null) => void;
  readonly onRowReorder: (from: number, to: number) => void;
  readonly onEditStart: (target: number | "new") => void;
  readonly onEditEnd: () => void;
};

const ADD_GLYPH: GlyphDescriptor = {
  paths: ["M4 8h8M8 4v8"],
  filled: false,
  dashed: false,
};

export default function EditableTextList({
  rows,
  addLabel,
  addTitle,
  validate,
  isEditable,
  isEmphasisEditable,
  actionStacking,
  validationStacking,
  surface,
  onRowCommit,
  onRowAdd,
  onRowReorder,
  onEditStart,
  onEditEnd,
}: EditableTextListProps): ReactElement {
  const listRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const [editingIndex, setEditingIndex] = useState<number | "new" | null>(null);
  const [dragState, setDragState] = useState<ReorderDragState | null>(null);
  const [isAddHovered, setIsAddHovered] = useState(false);
  const beginEditing = (target: number | "new") => {
    onEditStart(target);
    setEditingIndex(target);
  };
  const endEditing = () => {
    setEditingIndex(null);
    onEditEnd();
  };

  useEffect(() => {
    if (!dragState?.isActive) return undefined;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDragState(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dragState?.isActive]);

  return (
    <div ref={listRef} className={`${styles.list} ${dragState?.isActive ? styles.dragging : ""}`}>
      {rows.map((row, index) => {
        const isDragged = dragState?.index === index;
        const indicatorGap = dragState ? toRenderedDropGap(dragState) : null;
        const indicator =
          dragState?.isActive && indicatorGap === index && !isDragged ? (
            <DropIndicator key={`drop-before-${index}`} />
          ) : null;

        return (
          <Fragment key={`${index}:${row.text}`}>
            {indicator}
            {editingIndex === index ? (
              <Editor
                initialValue={row.text}
                initialEmphasis={isEmphasisEditable ? (row.emphasis ?? null) : null}
                validate={validate}
                actionStacking={actionStacking}
                validationStacking={validationStacking}
                surface={surface}
                onCommit={(value, emphasis) => {
                  onRowCommit(index, value.trim(), isEmphasisEditable ? emphasis : null);
                  endEditing();
                }}
                onDiscard={endEditing}
                onCancel={endEditing}
              />
            ) : isEditable ? (
              <button
                type="button"
                className={`${styles.rowHost} ${styles.editable} ${isDragged ? styles.dragged : ""} ${row.emphasis === "underline" ? styles.underlined : ""} ${row.emphasis === "italic" ? styles.italic : ""}`}
                data-reorder-row="true"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragState({
                    index,
                    pointerId: event.pointerId,
                    originX: event.clientX,
                    originY: event.clientY,
                    isActive: false,
                    dropGap: 0,
                  });
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerMove={(event) =>
                  updateReorderDrag(event, index, dragState, setDragState, listRef.current)
                }
                onPointerUp={(event) => {
                  if (dragState?.pointerId !== event.pointerId || dragState.index !== index) return;
                  event.stopPropagation();
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                  if (dragState.isActive) {
                    event.preventDefault();
                    suppressClickRef.current = true;
                    onRowReorder(index, dragState.dropGap);
                  }
                  setDragState(null);
                }}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }
                  beginEditing(index);
                }}
              >
                <InlineTextBlock
                  text={row.text}
                  variant="row"
                  onEditRequest={(event) => {
                    event.stopPropagation();
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    beginEditing(index);
                  }}
                />
              </button>
            ) : (
              <div
                className={`${styles.rowHost} ${row.emphasis === "underline" ? styles.underlined : ""} ${row.emphasis === "italic" ? styles.italic : ""}`}
              >
                <InlineTextBlock
                  text={row.text}
                  isEditEnabled={false}
                  variant="row"
                  onEditRequest={() => undefined}
                />
              </div>
            )}
          </Fragment>
        );
      })}
      {dragState?.isActive && toRenderedDropGap(dragState) === rows.length ? (
        <DropIndicator />
      ) : null}
      <div
        className={styles.addCell}
        onPointerEnter={isEditable ? () => setIsAddHovered(true) : undefined}
        onPointerLeave={isEditable ? () => setIsAddHovered(false) : undefined}
      >
        {editingIndex === "new" ? (
          <Editor
            initialValue=""
            initialEmphasis={null}
            validate={validate}
            actionStacking={actionStacking}
            validationStacking={validationStacking}
            surface={surface}
            onCommit={(value, emphasis) => {
              if (value.trim() !== "") {
                onRowAdd(value.trim(), isEmphasisEditable ? emphasis : null);
              }
              endEditing();
            }}
            onDiscard={endEditing}
            onCancel={endEditing}
          />
        ) : isEditable ? (
          <InlineActionButton
            glyph={ADD_GLYPH}
            label={addLabel}
            title={addTitle}
            treatment="add"
            visible={isAddHovered}
            onClick={() => beginEditing("new")}
          />
        ) : null}
      </div>
    </div>
  );
}

function toRenderedDropGap(dragState: ReorderDragState): number {
  return toRenderedReorderGap(dragState.index, dragState.dropGap);
}

function Editor({
  initialValue,
  initialEmphasis,
  validate,
  actionStacking,
  validationStacking,
  surface,
  onCommit,
  onDiscard,
  onCancel,
}: {
  readonly initialValue: string;
  readonly initialEmphasis: TextEmphasis | null;
  readonly validate: (draft: string) => readonly string[];
  readonly actionStacking: number;
  readonly validationStacking: number;
  readonly surface?: string;
  readonly onCommit: (value: string, emphasis: TextEmphasis | null) => void;
  readonly onDiscard: () => void;
  readonly onCancel: () => void;
}): ReactElement {
  return (
    <div className={styles.editorHost}>
      <InlineEmphasisCommitTextField
        initialValue={initialValue}
        initialEmphasis={initialEmphasis}
        validate={validate}
        actionStacking={actionStacking}
        validationStacking={validationStacking}
        surface={surface}
        onCommit={onCommit}
        onDiscard={onDiscard}
        onCancel={onCancel}
      />
    </div>
  );
}
