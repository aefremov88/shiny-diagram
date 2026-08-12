/**
 * @behavior Note action dispatch and attach-mode handoff.
 */

import { useCallback } from "react";
import type { NoteId } from "../../../../../shared/ids";
import type { TransactionResult } from "../../../../commands/editorCommands";
import { useDispatchTransaction } from "../../../../contexts";
import type { NoteView } from "../../../../views/schema";
import {
  toNoteDeleteTransaction,
  toNoteDetachTransaction,
  toNoteDuplicateTransaction,
} from "./transactions";
import { logAction } from "../../../../../shared/logging";

type Interactions = {
  readonly onAttachmentToggle: () => void;
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
};

type UseInteractionsInput = {
  readonly view: NoteView;
  readonly onNoteAttachStart: (noteId: NoteId) => void;
  readonly onNoteDuplicateCommitted: (result: TransactionResult) => void;
};

export function useInteractions({
  view,
  onNoteAttachStart,
  onNoteDuplicateCommitted,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onAttachmentToggle = useCallback(() => {
    if (view.attachedToClassId) {
      logAction("attachment-set", view.noteId, { classId: null });
      dispatchTransaction(toNoteDetachTransaction(view));
      return;
    }
    logAction("attachment-start", view.noteId);
    onNoteAttachStart(view.noteId);
  }, [dispatchTransaction, onNoteAttachStart, view]);

  const onDuplicate = useCallback(() => {
    logAction("duplicate", view.noteId);
    const result = dispatchTransaction(toNoteDuplicateTransaction(view));
    onNoteDuplicateCommitted(result);
  }, [dispatchTransaction, onNoteDuplicateCommitted, view]);

  const onDelete = useCallback(() => {
    logAction("delete", view.noteId);
    dispatchTransaction(toNoteDeleteTransaction(view));
  }, [dispatchTransaction, view]);

  return { onAttachmentToggle, onDuplicate, onDelete };
}
