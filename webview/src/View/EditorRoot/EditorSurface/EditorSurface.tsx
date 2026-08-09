/**
 * @behavior Ready editor selection, placement state lifecycle, and child interaction routing.
 * @render Ready editor layout.
 */

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type {
  EditingState,
  NamespaceGestureState,
  NodePlacementState,
  NoteAttachState,
  SelectionState,
} from "../../state/editorStates";
import type { DiagramView } from "../../views/schema";
import { TOOL_PANE_WIDTH } from "../../config/editorUiConfig";
import WorkspaceFrame from "../../../Ui/chrome/templates/WorkspaceFrame/WorkspaceFrame";
import ClassDiagram from "./DiagramCanvas/DiagramCanvas";
import EditPane from "./EditPane/EditPane";
import ToolPane from "./ToolPane/ToolPane";
import {
  toInitialEditingState,
  toInitialNamespaceGestureState,
  toInitialNodePlacementState,
  toInitialNoteAttachState,
  toInitialSelectionState,
} from "./state";
import { useInteractions } from "./useInteractions";
import { useStateReconciliation } from "./useStateReconciliation";
import type { ExportPngResult } from "../../../shared/exportPng";

type EditorSurfaceProps = {
  readonly view: DiagramView;
  readonly exportRequest: number;
  readonly onExportComplete: (result: ExportPngResult) => void;
};

export default function EditorSurface({
  view,
  exportRequest,
  onExportComplete,
}: EditorSurfaceProps): ReactElement {
  // State creation: ledger states - selected editor entities and active node placement kind
  const [selectionState, setSelectionState] = useState<SelectionState>(() =>
    toInitialSelectionState()
  );
  const [nodePlacementState, setNodePlacementState] = useState<NodePlacementState>(() =>
    toInitialNodePlacementState()
  );
  const [editingState, setEditingState] = useState<EditingState>(() => toInitialEditingState());
  const [noteAttachState, setNoteAttachState] = useState<NoteAttachState>(() =>
    toInitialNoteAttachState()
  );
  const [namespaceGestureState, setNamespaceGestureState] = useState<NamespaceGestureState>(() =>
    toInitialNamespaceGestureState()
  );

  // State reconciliation
  useStateReconciliation({
    view,
    setSelectionState,
    setEditingState,
    setNoteAttachState,
    setNamespaceGestureState,
  });

  // Event handler props derivation
  const {
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
  } = useInteractions({
    classIds: view.classes.map((classView) => classView.classId),
    relationships: view.relationships,
    editingState,
    nodePlacementState,
    noteAttachState,
    setSelectionState,
    setNodePlacementState,
    setEditingState,
    setNoteAttachState,
    setNamespaceGestureState,
  });

  // Keystroke listener registration
  useEffect(() => {
    if (noteAttachState.kind !== "attaching" && namespaceGestureState.kind === "none") return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (namespaceGestureState.kind !== "none") {
        onNamespaceGestureCancel();
        return;
      }
      onNoteAttachCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    namespaceGestureState.kind,
    noteAttachState.kind,
    onNamespaceGestureCancel,
    onNoteAttachCancel,
  ]);

  return (
    <WorkspaceFrame
      leadingWidth={TOOL_PANE_WIDTH}
      ariaLabel="Class diagram editor"
      leading={
        <ToolPane
          nodePlacementState={nodePlacementState}
          namespaceGestureState={namespaceGestureState}
          onClassPlacementStart={onClassPlacementStart}
          onNotePlacementStart={onNotePlacementStart}
          onNamespacePlacementStart={onNamespacePlacementStart}
          onRelationshipPlacementStart={onRelationshipPlacementStart}
        />
      }
      content={
        <ClassDiagram
          view={view}
          exportRequest={exportRequest}
          onExportComplete={onExportComplete}
          selectionState={selectionState}
          editingState={editingState}
          nodePlacementState={nodePlacementState}
          noteAttachState={noteAttachState}
          namespaceGestureState={namespaceGestureState}
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
      }
      trailing={
        <EditPane
          view={view}
          selectionState={selectionState}
          onStyleSelect={onStyleSelect}
          onSelectionRestore={onSelectionRestore}
          onStyleCreateCommitted={onStyleCreateCommitted}
          onStyleRenameCommitted={onStyleRenameCommitted}
          onNoteAttachStart={onNoteAttachStart}
          onNoteDuplicateCommitted={onNoteDuplicateCommitted}
          onNamespaceRenameCommitted={onNamespaceRenameCommitted}
          onRelationshipSelect={onRelationshipSelect}
          onRelationshipDuplicate={onRelationshipDuplicate}
        />
      }
    />
  );
}
