/**
 * @behavior Note selection, direct-edit entry, text commit, delete dispatch, and discard popup state updates.
 */

import { useCallback } from "react";
import type { Dispatch, MouseEvent, SetStateAction } from "react";
import type { NoteId } from "../../../../../../../shared/ids";
import type { EditingState } from "../../../../../../state/editorStates";
import { useDispatchTransaction } from "../../../../../../contexts";
import { toNoteDeleteTransaction, toNoteTextCommitTransaction } from "./transactions";
import { logAction } from "../../../../../../../shared/logging";

type Interactions = {
  readonly onNoteBoxClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onNoteTextClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onNoteTextDoubleClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onTextCommit: (text: string) => readonly string[];
  readonly onTextCancel: () => void;
  readonly onTextDiscard: (messages: readonly string[]) => void;
  readonly onDiscardDismiss: () => void;
};

type UseInteractionsInput = {
  readonly noteId: NoteId;
  readonly isSelected: boolean;
  readonly isNewBlankNote: boolean;
  readonly onNoteSelect: (noteId: NoteId) => void;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly setDiscardErrors: Dispatch<SetStateAction<readonly string[]>>;
};

export function useInteractions({
  noteId,
  isSelected,
  isNewBlankNote,
  onNoteSelect,
  onTextBlockEditStart,
  onTextBlockEditCancel,
  setDiscardErrors,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onNoteBoxClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      onNoteSelect(noteId);
    },
    [noteId, onNoteSelect]
  );

  const onNoteTextClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (isSelected) {
        onTextBlockEditStart({ kind: "noteText", noteId });
      } else {
        onNoteSelect(noteId);
      }
    },
    [isSelected, noteId, onNoteSelect, onTextBlockEditStart]
  );

  const onNoteTextDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      onTextBlockEditStart({ kind: "noteText", noteId });
    },
    [noteId, onTextBlockEditStart]
  );

  const onTextCommit = useCallback(
    (text: string) => {
      logAction("text-set", noteId, { text });
      const result = dispatchTransaction(toNoteTextCommitTransaction(noteId, text));
      if (result.status === "rejected") {
        return result.errors.map((error) => error.message);
      }
      onTextBlockEditCancel();
      return [];
    },
    [dispatchTransaction, noteId, onTextBlockEditCancel]
  );

  const onTextCancel = useCallback(() => {
    if (isNewBlankNote) {
      logAction("delete", noteId);
      dispatchTransaction(toNoteDeleteTransaction(noteId));
    }
    onTextBlockEditCancel();
  }, [dispatchTransaction, isNewBlankNote, noteId, onTextBlockEditCancel]);

  const onTextDiscard = useCallback(
    (messages: readonly string[]) => {
      setDiscardErrors(messages);
      onTextBlockEditCancel();
    },
    [onTextBlockEditCancel, setDiscardErrors]
  );

  const onDiscardDismiss = useCallback(() => {
    setDiscardErrors([]);
  }, [setDiscardErrors]);

  return {
    onNoteBoxClick,
    onNoteTextClick,
    onNoteTextDoubleClick,
    onTextCommit,
    onTextCancel,
    onTextDiscard,
    onDiscardDismiss,
  };
}
