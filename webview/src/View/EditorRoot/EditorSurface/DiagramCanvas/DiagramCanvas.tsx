/**
 * @behavior ClassBoxPlacementState and NoteBoxPlacementState lifecycle plus diagram interaction routing.
 * @render Diagram shell and empty state.
 */

import { useState } from "react";
import type { ReactElement } from "react";
import type { ClassId, NamespaceId, NoteId, RelationshipId } from "../../../../shared/ids";
import type { Rect } from "../../../../shared/geometry";
import type { TransactionResult } from "../../../commands/editorCommands";
import { DIAGRAM_EMPTY_STATE_Z_INDEX } from "../../../config/editorUiConfig";
import type { DiagramView } from "../../../views/schema";
import type {
  EditingState,
  NamespaceGestureState,
  NodePlacementState,
  NoteAttachState,
  SelectionState,
} from "../../../state/editorStates";
import { toInitialClassBoxPlacementState, toInitialNoteBoxPlacementState } from "./state";
import { useInteractions } from "./useInteractions";
import { useStateReconciliation } from "./useStateReconciliation";
import ReactFlowCanvasAdapter from "./ReactFlowCanvasAdapter/ReactFlowCanvasAdapter";
import ReactFlowProviderAdapter from "./ReactFlowProviderAdapter/ReactFlowProviderAdapter";
import EmptyStateMessage from "../../../../Ui/canvas/primitives/EmptyStateMessage/EmptyStateMessage";
import CanvasViewportFrame from "../../../../Ui/canvas/templates/CanvasViewportFrame/CanvasViewportFrame";
import type { ExportPngResult } from "../../../../shared/exportPng";

type DiagramCanvasProps = {
  readonly view: DiagramView;
  readonly selectionState: SelectionState;
  readonly editingState: EditingState;
  readonly nodePlacementState: NodePlacementState;
  readonly noteAttachState: NoteAttachState;
  readonly namespaceGestureState: NamespaceGestureState;
  readonly exportRequest: number;
  readonly onExportComplete: (result: ExportPngResult) => void;
  readonly onClassSelect: (classId: ClassId, additive: boolean) => void;
  readonly onClassMoved: (classId: ClassId) => void;
  readonly onNoteSelect: (noteId: NoteId) => void;
  readonly onNoteMoved: (noteId: NoteId) => void;
  readonly onNoteAttachCancel: () => void;
  readonly onRelationshipConnect: (sourceClassId: ClassId, targetClassId: ClassId) => void;
  readonly onRelationshipReconnect: (
    relationshipId: RelationshipId,
    end: "source" | "target",
    newClassId: ClassId
  ) => void;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
  readonly onBackgroundClick: () => void;
  readonly onConnectAborted: () => void;
  readonly onPlacementComplete: (result: TransactionResult | null) => void;
  readonly onNamespaceGestureCancel: () => void;
  readonly onNamespaceGestureChange: (rect: Rect) => void;
  readonly onNamespaceCreateCommitted: (result: TransactionResult | null) => void;
  readonly onNamespaceResizeStart: (namespaceId: NamespaceId, rect: Rect) => void;
  readonly onNamespaceResizeCommitted: (result: TransactionResult | null) => void;
  readonly onNamespaceSelect: (namespaceId: NamespaceId) => void;
  readonly onNamespaceRenameCommitted: (
    result: TransactionResult,
    previousNamespaceId: NamespaceId
  ) => void;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
};

export default function DiagramCanvas({
  view,
  selectionState,
  editingState,
  nodePlacementState,
  noteAttachState,
  namespaceGestureState,
  exportRequest,
  onExportComplete,
  onClassSelect,
  onClassMoved,
  onNoteSelect,
  onNoteMoved,
  onNoteAttachCancel,
  onRelationshipConnect,
  onRelationshipReconnect,
  onRelationshipSelect,
  onBackgroundClick,
  onConnectAborted,
  onPlacementComplete,
  onNamespaceGestureCancel,
  onNamespaceGestureChange,
  onNamespaceCreateCommitted,
  onNamespaceResizeStart,
  onNamespaceResizeCommitted,
  onNamespaceSelect,
  onNamespaceRenameCommitted,
  onTextBlockEditStart,
  onTextBlockEditCancel,
}: DiagramCanvasProps): ReactElement {
  // State creation: ledger state - framework-neutral class box positions and dimensions
  const [classBoxPlacementState, setClassBoxPlacementState] = useState(() =>
    toInitialClassBoxPlacementState(view.classes)
  );
  const [noteBoxPlacementState, setNoteBoxPlacementState] = useState(() =>
    toInitialNoteBoxPlacementState(view.notes)
  );

  // State reconciliation
  useStateReconciliation({
    view: view.classes,
    notes: view.notes,
    setClassBoxPlacementState,
    setNoteBoxPlacementState,
  });

  // Event handler props derivation
  const { onClassBoxPlacementChange, onNoteBoxPlacementChange, onDragComplete } = useInteractions({
    view: view.classes,
    notes: view.notes,
    setClassBoxPlacementState,
    setNoteBoxPlacementState,
  });
  return (
    <CanvasViewportFrame ariaLabel="Static editor boxes">
      {view.classes.length === 0 ? (
        <EmptyStateMessage
          message="No spatial annotations found."
          stacking={DIAGRAM_EMPTY_STATE_Z_INDEX}
        />
      ) : null}
      <ReactFlowProviderAdapter>
        <ReactFlowCanvasAdapter
          view={view}
          selectionState={selectionState}
          editingState={editingState}
          nodePlacementState={nodePlacementState}
          noteAttachState={noteAttachState}
          namespaceGestureState={namespaceGestureState}
          exportRequest={exportRequest}
          onExportComplete={onExportComplete}
          classBoxPlacementState={classBoxPlacementState}
          noteBoxPlacementState={noteBoxPlacementState}
          onClassBoxPlacementChange={onClassBoxPlacementChange}
          onNoteBoxPlacementChange={onNoteBoxPlacementChange}
          onDragComplete={onDragComplete}
          onClassSelect={onClassSelect}
          onClassMoved={onClassMoved}
          onNoteSelect={onNoteSelect}
          onNoteMoved={onNoteMoved}
          onNoteAttachCancel={onNoteAttachCancel}
          onRelationshipConnect={onRelationshipConnect}
          onRelationshipReconnect={onRelationshipReconnect}
          onRelationshipSelect={onRelationshipSelect}
          onBackgroundClick={onBackgroundClick}
          onConnectAborted={onConnectAborted}
          onPlacementComplete={onPlacementComplete}
          onNamespaceGestureCancel={onNamespaceGestureCancel}
          onNamespaceGestureChange={onNamespaceGestureChange}
          onNamespaceCreateCommitted={onNamespaceCreateCommitted}
          onNamespaceResizeStart={onNamespaceResizeStart}
          onNamespaceResizeCommitted={onNamespaceResizeCommitted}
          onNamespaceSelect={onNamespaceSelect}
          onNamespaceRenameCommitted={onNamespaceRenameCommitted}
          onTextBlockEditStart={onTextBlockEditStart}
          onTextBlockEditCancel={onTextBlockEditCancel}
        />
      </ReactFlowProviderAdapter>
    </CanvasViewportFrame>
  );
}
