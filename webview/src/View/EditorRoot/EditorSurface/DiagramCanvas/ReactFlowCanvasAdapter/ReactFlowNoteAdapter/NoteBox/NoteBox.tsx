/**
 * @behavior Note selection, content-height measurement, direct editing, and blur-discard popup state.
 * @render Note-box node.
 */

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { Point, Rect } from "../../../../../../../shared/geometry";
import type { NoteId } from "../../../../../../../shared/ids";
import type { EditingState } from "../../../../../../state/editorStates";
import BoxInteractionOverlay from "../../../../../../../Ui/canvas/composites/BoxInteractionOverlay/BoxInteractionOverlay";
import type { ResizeHandle } from "../../../../../../../Ui/canvas/composites/BoxInteractionOverlay/BoxInteractionOverlay";
import InlineCommitTextArea from "../../../../../../../Ui/canvas/composites/InlineCommitTextArea/InlineCommitTextArea";
import StickyNoteSurfaceFrame from "../../../../../../../Ui/canvas/templates/StickyNoteSurfaceFrame/StickyNoteSurfaceFrame";
import InlineValidationPopup from "../../../../../../../Ui/canvas/primitives/InlineValidationPopup/InlineValidationPopup";
import type { NoteView } from "../../../../../../views/schema";
import {
  INLINE_VALIDATION_POPUP_Z_INDEX,
  NODE_ABOVE_CONTENT_Z_INDEX,
  NODE_BEHIND_CONTENT_Z_INDEX,
} from "../../../../../../config/editorUiConfig";
import { useInteractions } from "./useInteractions";

type NoteBoxProps = {
  readonly view: NoteView;
  readonly bounds: Rect;
  readonly isSelected: boolean;
  readonly isResizeVisible: boolean;
  readonly isDragging: boolean;
  readonly editingState: EditingState;
  readonly onNoteSelect: (noteId: NoteId) => void;
  readonly onNoteResizeHandlePress: (
    noteId: NoteId,
    bounds: Rect,
    handle: ResizeHandle,
    screenPoint: Point
  ) => void;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onContentHeightChange: (noteId: NoteId, height: number) => void;
};

export default function NoteBox({
  view,
  bounds,
  isSelected,
  isResizeVisible,
  isDragging,
  editingState,
  onNoteSelect,
  onNoteResizeHandlePress,
  onTextBlockEditStart,
  onTextBlockEditCancel,
  onContentHeightChange,
}: NoteBoxProps): ReactElement {
  // State creation: local state - blur-discard validation messages for note text edits
  const [discardErrors, setDiscardErrors] = useState<readonly string[]>([]);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // UI props derivation
  const isEditing = editingState.kind === "noteText" && editingState.noteId === view.noteId;
  const isNewBlankNote = view.text.trim() === "";

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content) return undefined;
    const measure = () => {
      const style = window.getComputedStyle(frame);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const textarea = content.querySelector("textarea");
      if (!textarea) {
        onContentHeightChange(view.noteId, Math.ceil(content.offsetHeight + borders));
        return;
      }
      const editor = textarea.parentElement?.parentElement;
      const editorStyle = editor ? window.getComputedStyle(editor) : null;
      const editorPadding = editorStyle
        ? parseFloat(editorStyle.paddingTop) + parseFloat(editorStyle.paddingBottom)
        : 0;
      onContentHeightChange(
        view.noteId,
        Math.ceil(textarea.scrollHeight + editorPadding + borders)
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    content.addEventListener("input", measure);
    return () => {
      observer.disconnect();
      content.removeEventListener("input", measure);
    };
  }, [isEditing, onContentHeightChange, view.noteId]);

  const onResizeGrab = (handle: ResizeHandle, point: Point) => {
    onNoteResizeHandlePress(view.noteId, bounds, handle, point);
  };

  // Event handler props derivation
  const {
    onNoteBoxClick,
    onNoteTextClick,
    onNoteTextDoubleClick,
    onTextCommit,
    onTextCancel,
    onTextDiscard,
    onDiscardDismiss,
  } = useInteractions({
    noteId: view.noteId,
    isSelected,
    isNewBlankNote,
    onNoteSelect,
    onTextBlockEditStart,
    onTextBlockEditCancel,
    setDiscardErrors,
  });

  return (
    <StickyNoteSurfaceFrame
      elementRef={frameRef}
      title={view.text}
      dragging={isDragging}
      onClick={onNoteBoxClick}
    >
      <BoxInteractionOverlay
        selected={isSelected}
        pending={false}
        resizeVisible={isResizeVisible}
        haloStacking={NODE_BEHIND_CONTENT_Z_INDEX}
        affordanceStacking={NODE_ABOVE_CONTENT_Z_INDEX}
        onResizeGrab={onResizeGrab}
      />
      <InlineCommitTextArea
        elementRef={contentRef}
        initialValue={view.text.trim()}
        displayText={view.text}
        isEditing={isEditing}
        isEditEnabled={isSelected}
        saveLabel="Save"
        validation={
          discardErrors.length > 0 ? (
            <InlineValidationPopup
              messages={discardErrors}
              stacking={INLINE_VALIDATION_POPUP_Z_INDEX}
              onDismiss={onDiscardDismiss}
            />
          ) : undefined
        }
        onEditRequest={isSelected ? onNoteTextDoubleClick : onNoteTextClick}
        onCommit={(text) => {
          const errors = onTextCommit(text.trim());
          if (errors.length > 0) onTextDiscard(errors);
        }}
        onCancel={onTextCancel}
      />
    </StickyNoteSurfaceFrame>
  );
}
