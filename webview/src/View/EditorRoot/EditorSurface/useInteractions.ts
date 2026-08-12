/**
 * @behavior Ready editor selection, placement, relationship placement, text edit semantic handlers, and SelectionState, NodePlacementState, and EditingState updates.
 */

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ClassId, NamespaceId, NoteId, RelationshipId, StyleDefId } from "../../../shared/ids";
import type { Rect } from "../../../shared/geometry";
import type {
  EditingState,
  NamespaceGestureState,
  NodePlacementState,
  NoteAttachState,
  RelationshipSeed,
  SelectionState,
} from "../../state/editorStates";
import type { RelationshipView } from "../../views/schema";
import type { TransactionResult } from "../../commands/editorCommands";
import { useDispatchTransaction } from "../../contexts";
import {
  toNoteAttachmentSetTransaction,
  toRelationshipCreateTransaction,
  toRelationshipReconnectTransaction,
} from "./transactions";
import { logAction } from "../../../shared/logging";

type Interactions = {
  readonly onClassPlacementStart: () => void;
  readonly onNotePlacementStart: () => void;
  readonly onNamespacePlacementStart: () => void;
  readonly onNamespaceGestureCancel: () => void;
  readonly onNamespaceGestureChange: (rect: Rect) => void;
  readonly onNamespaceCreateCommitted: (result: TransactionResult | null) => void;
  readonly onNamespaceResizeStart: (namespaceId: NamespaceId, rect: Rect) => void;
  readonly onNamespaceResizeCommitted: (result: TransactionResult | null) => void;
  readonly onNamespaceRenameCommitted: (
    result: TransactionResult,
    previousNamespaceId: NamespaceId
  ) => void;
  readonly onNamespaceSelect: (namespaceId: NamespaceId) => void;
  readonly onRelationshipPlacementStart: (seed: RelationshipSeed) => void;
  readonly onClassSelect: (classId: ClassId, additive: boolean) => void;
  readonly onClassMoved: (classId: ClassId) => void;
  readonly onNoteSelect: (noteId: NoteId) => void;
  readonly onNoteMoved: (noteId: NoteId) => void;
  readonly onNoteAttachStart: (noteId: NoteId) => void;
  readonly onNoteAttachCancel: () => void;
  readonly onNoteDuplicateCommitted: (result: TransactionResult) => void;
  readonly onRelationshipConnect: (sourceClassId: ClassId, targetClassId: ClassId) => void;
  readonly onRelationshipReconnect: (
    relationshipId: RelationshipId,
    end: "source" | "target",
    newClassId: ClassId
  ) => void;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
  readonly onRelationshipDuplicate: (seed: RelationshipSeed) => void;
  readonly onStyleSelect: (
    styleDefId: StyleDefId,
    origin?: Extract<SelectionState, { readonly kind: "classes" }>
  ) => void;
  readonly onSelectionRestore: (selectionState: SelectionState) => void;
  readonly onStyleCreateCommitted: (
    result: TransactionResult,
    origin?: Extract<SelectionState, { readonly kind: "classes" }>
  ) => void;
  readonly onStyleRenameCommitted: (
    result: TransactionResult,
    previousStyleDefId: StyleDefId
  ) => void;
  readonly onBackgroundClick: () => void;
  readonly onConnectAborted: () => void;
  readonly onPlacementComplete: (result: TransactionResult | null) => void;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
};

type UseInteractionsInput = {
  readonly classIds: readonly ClassId[];
  readonly relationships: readonly RelationshipView[];
  readonly editingState: EditingState;
  readonly nodePlacementState: NodePlacementState;
  readonly noteAttachState: NoteAttachState;
  readonly setSelectionState: Dispatch<SetStateAction<SelectionState>>;
  readonly setNodePlacementState: Dispatch<SetStateAction<NodePlacementState>>;
  readonly setEditingState: Dispatch<SetStateAction<EditingState>>;
  readonly setNoteAttachState: Dispatch<SetStateAction<NoteAttachState>>;
  readonly setNamespaceGestureState: Dispatch<SetStateAction<NamespaceGestureState>>;
};

export function useInteractions({
  classIds,
  relationships,
  editingState,
  nodePlacementState,
  noteAttachState,
  setSelectionState,
  setNodePlacementState,
  setEditingState,
  setNoteAttachState,
  setNamespaceGestureState,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onClassPlacementStart = useCallback(() => {
    setNodePlacementState((state) => updateNodePlacementState(state, { kind: "class" }));
  }, [setNodePlacementState]);

  const onNotePlacementStart = useCallback(() => {
    setNodePlacementState((state) => updateNodePlacementState(state, { kind: "note" }));
  }, [setNodePlacementState]);

  const onNamespacePlacementStart = useCallback(() => {
    setSelectionState((state) => clearSelectionState(state));
    setNodePlacementState(null);
    setNamespaceGestureState({ kind: "creating", rect: { x: 0, y: 0, w: 0, h: 0 } });
  }, [setNamespaceGestureState, setNodePlacementState, setSelectionState]);

  const onNamespaceGestureCancel = useCallback(() => {
    setNamespaceGestureState({ kind: "none" });
  }, [setNamespaceGestureState]);

  const onNamespaceGestureChange = useCallback(
    (rect: Rect) => {
      setNamespaceGestureState((state) =>
        state.kind === "resizing" ? { ...state, rect } : { kind: "creating", rect }
      );
    },
    [setNamespaceGestureState]
  );

  const onNamespaceResizeStart = useCallback(
    (namespaceId: NamespaceId, rect: Rect) => {
      setSelectionState({ kind: "namespace", namespaceId });
      setNamespaceGestureState({ kind: "resizing", namespaceId, rect });
    },
    [setNamespaceGestureState, setSelectionState]
  );

  const onRelationshipPlacementStart = useCallback(
    (seed: RelationshipSeed) => {
      setSelectionState((state) => clearSelectionState(state));
      setNodePlacementState({
        kind: "relationship",
        seed,
      });
    },
    [setNodePlacementState, setSelectionState]
  );

  const onClassSelect = useCallback(
    (classId: ClassId, additive: boolean) => {
      if (nodePlacementState?.kind === "relationship") return;
      if (noteAttachState.kind === "attaching") {
        logAction("attachment-set", noteAttachState.noteId, { classId });
        dispatchTransaction(toNoteAttachmentSetTransaction(noteAttachState.noteId, classId));
        setNoteAttachState({ kind: "none" });
        setSelectionState({ kind: "note", noteId: noteAttachState.noteId });
        return;
      }
      setSelectionState((selectionState) =>
        updateSelectedClassIds(selectionState, classId, additive)
      );
    },
    [
      dispatchTransaction,
      nodePlacementState,
      noteAttachState,
      setNoteAttachState,
      setSelectionState,
    ]
  );

  const onClassMoved = useCallback(
    (classId: ClassId) => {
      setSelectionState((selectionState) =>
        selectionState.kind === "classes" && selectionState.classIds.includes(classId)
          ? selectionState
          : { kind: "classes", classIds: [classId] }
      );
    },
    [setSelectionState]
  );

  const onNoteSelect = useCallback(
    (noteId: NoteId) => {
      if (noteAttachState.kind === "attaching") {
        setNoteAttachState({ kind: "none" });
        return;
      }
      setSelectionState((selectionState) => updateSelectedNoteId(selectionState, noteId));
    },
    [noteAttachState.kind, setNoteAttachState, setSelectionState]
  );

  const onNoteMoved = useCallback(
    (noteId: NoteId) => {
      setSelectionState((selectionState) => updateSelectedNoteId(selectionState, noteId));
    },
    [setSelectionState]
  );

  const onNoteAttachStart = useCallback(
    (noteId: NoteId) => {
      setSelectionState({ kind: "note", noteId });
      setNoteAttachState({ kind: "attaching", noteId });
    },
    [setNoteAttachState, setSelectionState]
  );

  const onNoteAttachCancel = useCallback(() => {
    setNoteAttachState({ kind: "none" });
  }, [setNoteAttachState]);

  const onNoteDuplicateCommitted = useCallback(
    (result: TransactionResult) => {
      const createdNoteId =
        result.status === "committed" ? result.outcome.notes.created.at(-1) : undefined;
      if (!createdNoteId) return;
      setSelectionState({ kind: "note", noteId: createdNoteId });
    },
    [setSelectionState]
  );

  const onNamespaceCreateCommitted = useCallback(
    (result: TransactionResult | null) => {
      const createdNamespaceId =
        result?.status === "committed" ? result.outcome.namespaces.created.at(-1) : undefined;
      setNamespaceGestureState({ kind: "none" });
      if (!createdNamespaceId) return;
      setSelectionState({ kind: "namespace", namespaceId: createdNamespaceId });
    },
    [setNamespaceGestureState, setSelectionState]
  );

  const onNamespaceResizeCommitted = useCallback(
    (result: TransactionResult | null) => {
      setNamespaceGestureState({ kind: "none" });
      if (result?.status !== "committed") return;
      setSelectionState((selectionState) =>
        selectionState.kind === "namespace" ? selectionState : { kind: "none" }
      );
    },
    [setNamespaceGestureState, setSelectionState]
  );

  const onNamespaceRenameCommitted = useCallback(
    (result: TransactionResult, previousNamespaceId: NamespaceId) => {
      if (result.status !== "committed") return;
      const nextNamespaceId = result.outcome.namespaces.renamed.find(
        (renamed) => renamed.from === previousNamespaceId
      )?.to;
      if (!nextNamespaceId) return;
      setSelectionState({ kind: "namespace", namespaceId: nextNamespaceId });
    },
    [setSelectionState]
  );

  const onRelationshipConnect = useCallback(
    (sourceClassId: ClassId, targetClassId: ClassId) => {
      if (nodePlacementState?.kind !== "relationship") return;
      if (!classIds.includes(sourceClassId) || !classIds.includes(targetClassId)) return;
      // Implementing interaction through command transaction
      logAction("create", "relationship", { sourceClassId, targetClassId });
      dispatchTransaction(
        toRelationshipCreateTransaction(nodePlacementState.seed, sourceClassId, targetClassId)
      );
      setNodePlacementState(null);
      setSelectionState((selectionState) => clearSelectionState(selectionState));
    },
    [classIds, dispatchTransaction, nodePlacementState, setNodePlacementState, setSelectionState]
  );

  const onRelationshipReconnect = useCallback(
    (relationshipId: RelationshipId, end: "source" | "target", newClassId: ClassId) => {
      const relationship = relationships.find(
        (relationshipView) => relationshipView.relationshipId === relationshipId
      );
      if (!relationship) return;
      if (!classIds.includes(newClassId)) return;
      const existingClassId =
        end === "source" ? relationship.sourceClassId : relationship.targetClassId;
      if (existingClassId === newClassId) return;

      // Implementing interaction through command transaction
      logAction("reconnect", relationshipId, { end, classId: newClassId });
      const outcome = dispatchTransaction(
        toRelationshipReconnectTransaction(relationshipId, end, newClassId)
      );
      const nextRelationshipId =
        outcome.status === "committed"
          ? (outcome.outcome.relationships.renamed[0]?.to ?? relationshipId)
          : relationshipId;
      setSelectionState((selectionState) =>
        updateSelectedRelationshipId(selectionState, nextRelationshipId)
      );
    },
    [classIds, dispatchTransaction, relationships, setSelectionState]
  );

  const onRelationshipSelect = useCallback(
    (relationshipId: RelationshipId) => {
      if (noteAttachState.kind === "attaching") {
        setNoteAttachState({ kind: "none" });
        return;
      }
      if (nodePlacementState?.kind === "relationship") return;
      setSelectionState((selectionState) =>
        updateSelectedRelationshipId(selectionState, relationshipId)
      );
    },
    [nodePlacementState, noteAttachState.kind, setNoteAttachState, setSelectionState]
  );

  const onRelationshipDuplicate = useCallback(
    (seed: RelationshipSeed) => {
      setSelectionState((selectionState) => clearSelectionState(selectionState));
      setNodePlacementState({
        kind: "relationship",
        seed,
      });
    },
    [setNodePlacementState, setSelectionState]
  );

  const onStyleSelect = useCallback(
    (styleDefId: StyleDefId, origin?: Extract<SelectionState, { readonly kind: "classes" }>) => {
      setSelectionState((state) => updateSelectedStyleDefId(state, styleDefId, origin));
    },
    [setSelectionState]
  );

  const onSelectionRestore = useCallback(
    (selectionState: SelectionState) => {
      setSelectionState(selectionState);
    },
    [setSelectionState]
  );

  const onStyleCreateCommitted = useCallback(
    (result: TransactionResult, origin?: Extract<SelectionState, { readonly kind: "classes" }>) => {
      const createdStyleId =
        result.status === "committed" ? result.outcome.styles.created.at(-1) : undefined;
      if (!createdStyleId) return;
      setSelectionState({ kind: "style", styleDefId: createdStyleId, origin });
    },
    [setSelectionState]
  );

  const onStyleRenameCommitted = useCallback(
    (result: TransactionResult, previousStyleDefId: StyleDefId) => {
      if (result.status !== "committed") return;
      const nextStyleDefId = result.outcome.styles.renamed.find(
        (renamed) => renamed.from === previousStyleDefId
      )?.to;
      if (!nextStyleDefId) return;
      setSelectionState((selectionState) =>
        selectionState.kind === "style"
          ? { ...selectionState, styleDefId: nextStyleDefId }
          : selectionState
      );
    },
    [setSelectionState]
  );

  const onNamespaceSelect = useCallback(
    (namespaceId: NamespaceId) => {
      setSelectionState({ kind: "namespace", namespaceId });
    },
    [setSelectionState]
  );

  const onBackgroundClick = useCallback(() => {
    if (noteAttachState.kind === "attaching") {
      setNoteAttachState({ kind: "none" });
      return;
    }
    if (editingState.kind === "none") {
      setSelectionState((state) => clearSelectionState(state));
    } else {
      setEditingState({ kind: "none" });
    }
    setNodePlacementState((state) => (state?.kind === "relationship" ? null : state));
  }, [
    editingState.kind,
    noteAttachState.kind,
    setEditingState,
    setNodePlacementState,
    setNoteAttachState,
    setSelectionState,
  ]);

  const onConnectAborted = useCallback(() => {
    setNodePlacementState((state) => (state?.kind === "relationship" ? null : state));
  }, [setNodePlacementState]);

  const onPlacementComplete = useCallback(
    (result: TransactionResult | null) => {
      const createdNoteId =
        result?.status === "committed" ? result.outcome.notes.created.at(-1) : undefined;
      if (createdNoteId) {
        setSelectionState({ kind: "note", noteId: createdNoteId });
        setEditingState({ kind: "noteText", noteId: createdNoteId });
      }
      setNodePlacementState((state) => updateNodePlacementState(state, null));
    },
    [setEditingState, setNodePlacementState, setSelectionState]
  );

  const onTextBlockEditStart = useCallback(
    (nextEditingState: Exclude<EditingState, { readonly kind: "none" }>) => {
      if (nextEditingState.kind === "noteText") {
        setSelectionState({ kind: "note", noteId: nextEditingState.noteId });
      } else if (nextEditingState.kind === "namespaceName") {
        setSelectionState({ kind: "namespace", namespaceId: nextEditingState.namespaceId });
      } else {
        setSelectionState({ kind: "classes", classIds: [nextEditingState.classId] });
      }
      setEditingState(nextEditingState);
    },
    [setEditingState, setSelectionState]
  );

  const onTextBlockEditCancel = useCallback(() => {
    setEditingState({ kind: "none" });
  }, [setEditingState]);

  return {
    onClassPlacementStart,
    onNotePlacementStart,
    onNamespacePlacementStart,
    onNamespaceGestureCancel,
    onNamespaceGestureChange,
    onNamespaceCreateCommitted,
    onNamespaceResizeStart,
    onNamespaceResizeCommitted,
    onNamespaceRenameCommitted,
    onNamespaceSelect,
    onRelationshipPlacementStart,
    onClassSelect,
    onClassMoved,
    onNoteSelect,
    onNoteMoved,
    onNoteAttachStart,
    onNoteAttachCancel,
    onNoteDuplicateCommitted,
    onRelationshipConnect,
    onRelationshipReconnect,
    onRelationshipSelect,
    onRelationshipDuplicate,
    onStyleSelect,
    onSelectionRestore,
    onStyleCreateCommitted,
    onStyleRenameCommitted,
    onBackgroundClick,
    onConnectAborted,
    onPlacementComplete,
    onTextBlockEditStart,
    onTextBlockEditCancel,
  };
}

// Private helpers
function updateSelectedRelationshipId(
  selectionState: SelectionState,
  relationshipId: RelationshipId
): SelectionState {
  return selectionState.kind === "relationship" && selectionState.relationshipId === relationshipId
    ? selectionState
    : { kind: "relationship", relationshipId };
}

function updateSelectedNoteId(selectionState: SelectionState, noteId: NoteId): SelectionState {
  return selectionState.kind === "note" && selectionState.noteId === noteId
    ? selectionState
    : { kind: "note", noteId };
}

function updateSelectedClassIds(
  selectionState: SelectionState,
  classId: ClassId,
  additive: boolean
): SelectionState {
  const classIds =
    selectionState.kind === "classes" && additive
      ? toToggledClassIds(selectionState.classIds, classId)
      : [classId];
  return selectionState.kind === "classes" &&
    areClassIdCollectionsEqual(selectionState.classIds, classIds)
    ? selectionState
    : toClassSelectionState(classIds);
}

function updateNodePlacementState(
  state: NodePlacementState,
  nodePlacementState: NodePlacementState
): NodePlacementState {
  if (state === nodePlacementState) return state;
  if (state?.kind === "class" && nodePlacementState?.kind === "class") return state;
  return nodePlacementState;
}

function toToggledClassIds(
  selectedClassIds: readonly ClassId[],
  classId: ClassId
): readonly ClassId[] {
  return selectedClassIds.includes(classId)
    ? selectedClassIds.filter((selectedClassId) => selectedClassId !== classId)
    : [...selectedClassIds, classId];
}

function clearSelectionState(selectionState: SelectionState): SelectionState {
  return selectionState.kind === "none" ? selectionState : { kind: "none" };
}

function updateSelectedStyleDefId(
  selectionState: SelectionState,
  styleDefId: StyleDefId,
  origin?: Extract<SelectionState, { readonly kind: "classes" }>
): SelectionState {
  return selectionState.kind === "style" &&
    selectionState.styleDefId === styleDefId &&
    selectionState.origin === origin
    ? selectionState
    : { kind: "style", styleDefId, origin };
}

function toClassSelectionState(classIds: readonly ClassId[]): SelectionState {
  return classIds.length === 0 ? { kind: "none" } : { kind: "classes", classIds };
}

function areClassIdCollectionsEqual(left: readonly ClassId[], right: readonly ClassId[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
