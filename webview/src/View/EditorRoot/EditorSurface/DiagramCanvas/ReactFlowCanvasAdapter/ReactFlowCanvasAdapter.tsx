/**
 * @behavior Adapter-local content minima plus namespace and note gesture snapshots.
 * @framework View diagram canvas props to React Flow canvas props and events.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import {
  ConnectionMode,
  Controls,
  ReactFlow,
  type ConnectionLineComponent,
  type IsValidConnection,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import { captureReactFlowCanvas, pngDataUrlToBase64 } from "./captureCanvas";
import type { Point, Rect } from "../../../../../shared/geometry";
import type { ExportPngResult } from "../../../../../shared/exportPng";
import type { ClassId, NamespaceId, NoteId, RelationshipId } from "../../../../../shared/ids";
import type { TransactionResult } from "../../../../commands/editorCommands";
import {
  NAMESPACE_GESTURE_Z_INDEX,
  RELATIONSHIP_RECONNECT_RADIUS,
} from "../../../../config/editorUiConfig";
import { reactFlowCanvasBoundaryProps } from "../../../../config/reactFlowConfig";
import type {
  ClassBoxPlacementState,
  EditingState,
  NamespaceGestureState,
  NodePlacementState,
  NoteAttachState,
  NoteBoxPlacementState,
  RelationshipSeed,
  SelectionState,
} from "../../../../state/editorStates";
import type { DiagramView } from "../../../../views/schema";
import NoteAttachmentEdgeAdapter from "./NoteAttachmentEdgeAdapter/NoteAttachmentEdgeAdapter";
import NoteAttachGhostLine from "./NoteAttachGhostLine/NoteAttachGhostLine";
import PlacementOverlay from "./PlacementOverlay/PlacementOverlay";
import ReactFlowClassBoxNodeAdapter from "./ReactFlowClassBoxAdapter/ReactFlowClassBoxAdapter";
import ReactFlowNamespaceAdapter from "./ReactFlowNamespaceAdapter/ReactFlowNamespaceAdapter";
import ReactFlowNoteAdapter from "./ReactFlowNoteAdapter/ReactFlowNoteAdapter";
import RelationshipConnectionLineAdapter from "./RelationshipConnectionLineAdapter/RelationshipConnectionLineAdapter";
import RelationshipEdgeAdapter from "./RelationshipEdgeAdapter/RelationshipEdgeAdapter";
import type {
  ClassBoxNodeDescriptor,
  ClassBoxPlacementChange,
  NamespaceDragState,
  NamespaceNodeDescriptor,
  NoteAttachmentEdgeDescriptor,
  NoteBoxNodeDescriptor,
  NoteBoxPlacementChange,
  RelationshipEdgeDescriptor,
} from "./frameworkAdapters";
import {
  toClassBoxNodeDescriptors,
  toNamespaceDragClassBoxPlacementState,
  toNamespaceGeometry,
  toNamespaceNodeDescriptors,
  toNoteAttachmentEdgeDescriptors,
  toNoteBoxNodeDescriptors,
  toRelationshipEdgeDescriptors,
} from "./frameworkAdapters";
import { useInteractions } from "./useInteractions";
import CanvasGridFrame from "../../../../../Ui/canvas/templates/CanvasGridFrame/CanvasGridFrame";
import DraftRect from "../../../../../Ui/canvas/primitives/DraftRect/DraftRect";
import type {
  ClassResizePointerState,
  NamespaceResizePointerState,
  NoteResizePointerState,
} from "./useInteractions";

type ReactFlowRuntimeStyle = CSSProperties & {
  readonly "--rf-reconnect-radius": string;
};

const REACT_FLOW_RUNTIME_STYLE: ReactFlowRuntimeStyle = {
  "--rf-reconnect-radius": `${RELATIONSHIP_RECONNECT_RADIUS}px`,
};

const nodeTypes = {
  classBox: ReactFlowClassBoxNodeAdapter,
  noteBox: ReactFlowNoteAdapter,
  namespaceBox: ReactFlowNamespaceAdapter,
};
const edgeTypes = {
  relationship: RelationshipEdgeAdapter,
  noteAttachment: NoteAttachmentEdgeAdapter,
};

type ReactFlowCanvasAdapterProps = {
  readonly view: DiagramView;
  readonly selectionState: SelectionState;
  readonly editingState: EditingState;
  readonly nodePlacementState: NodePlacementState;
  readonly noteAttachState: NoteAttachState;
  readonly namespaceGestureState: NamespaceGestureState;
  readonly exportRequest: number;
  readonly onExportComplete: (result: ExportPngResult) => void;
  readonly classBoxPlacementState: ClassBoxPlacementState;
  readonly noteBoxPlacementState: NoteBoxPlacementState;
  readonly onClassBoxPlacementChange: (changes: readonly ClassBoxPlacementChange[]) => void;
  readonly onNoteBoxPlacementChange: (changes: readonly NoteBoxPlacementChange[]) => void;
  readonly onDragComplete: (
    finalPositions: readonly ClassBoxPlacementChange[],
    finalNotePositions: readonly NoteBoxPlacementChange[]
  ) => void;
  readonly onClassSelect: (classId: ClassId, additive: boolean) => void;
  readonly onClassMoved: (classId: ClassId) => void;
  readonly onNoteSelect: (noteId: DiagramView["notes"][number]["noteId"]) => void;
  readonly onNoteMoved: (noteId: DiagramView["notes"][number]["noteId"]) => void;
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

export default function ReactFlowCanvasAdapter({
  view,
  selectionState,
  editingState,
  nodePlacementState,
  noteAttachState,
  namespaceGestureState,
  exportRequest,
  onExportComplete,
  classBoxPlacementState,
  noteBoxPlacementState,
  onClassBoxPlacementChange,
  onNoteBoxPlacementChange,
  onDragComplete,
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
}: ReactFlowCanvasAdapterProps): ReactElement {
  // Framework prop and event adaptation
  const { flowToScreenPosition, getNodes, screenToFlowPosition } = useReactFlow();

  // State creation: adapter-local state - transient React Flow gesture snapshots
  const [noteAttachCursor, setNoteAttachCursor] = useState<Point | null>(null);
  const [namespaceDragState, setNamespaceDragState] = useState<NamespaceDragState | null>(null);
  const [namespaceDragBoundsState, setNamespaceDragBoundsState] = useState<ReadonlyMap<
    NamespaceId,
    Rect
  > | null>(null);
  const [isSurfaceResizeActive, setSurfaceResizeActive] = useState(false);
  const [isExportCaptureActive, setExportCaptureActive] = useState(false);
  const [classContentHeightById, setClassContentHeightById] = useState<
    ReadonlyMap<ClassId, number>
  >(new Map());
  const [noteContentHeightById, setNoteContentHeightById] = useState<ReadonlyMap<NoteId, number>>(
    new Map()
  );
  const placementStartPointRef = useRef<XYPosition | null>(null);
  const placementPointerRef = useRef<XYPosition | null>(null);
  const namespaceDragStartPointRef = useRef<XYPosition | null>(null);
  const namespaceDropBoundsRef = useRef<ReadonlyMap<NamespaceId, Rect> | null>(null);
  const namespaceStartPointRef = useRef<XYPosition | null>(null);
  const namespaceResizePointerStateRef = useRef<NamespaceResizePointerState | null>(null);
  const classResizePointerStateRef = useRef<ClassResizePointerState | null>(null);
  const noteResizePointerStateRef = useRef<NoteResizePointerState | null>(null);
  const reconnectSeedRef = useRef<RelationshipSeed | null>(null);
  const canvasRootRef = useRef<HTMLDivElement | null>(null);
  const handledExportRequestRef = useRef(exportRequest);
  const pendingExportRef = useRef(false);
  const reconnectPointerRef = useRef<XYPosition | null>(null);
  const isPlacementActive = nodePlacementState !== null;
  const isNamespaceGestureActive = namespaceGestureState.kind !== "none";
  const relationshipPlacementState =
    nodePlacementState?.kind === "relationship" ? nodePlacementState : null;
  const isRelationshipPlacementActive = relationshipPlacementState !== null;
  const renderedSelectionState = useMemo<SelectionState>(
    () => (isExportCaptureActive ? { kind: "none" } : selectionState),
    [isExportCaptureActive, selectionState]
  );
  const classIds = useMemo(
    () => new Set(view.classes.map((classView) => classView.classId)),
    [view.classes]
  );
  const isValidRelationshipConnection = useCallback<
    IsValidConnection<RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor>
  >(
    (connection) =>
      connection.source !== null &&
      connection.target !== null &&
      classIds.has(connection.source as ClassId) &&
      classIds.has(connection.target as ClassId),
    [classIds]
  );
  const namespaceDraftStyle = toNamespaceDraftStyle(namespaceGestureState, flowToScreenPosition);
  const effectiveClassBoxPlacementState = useMemo(
    () => toNamespaceDragClassBoxPlacementState(view, classBoxPlacementState, namespaceDragState),
    [view, classBoxPlacementState, namespaceDragState]
  );
  const renderedClassBoxPlacementState = useMemo<ClassBoxPlacementState>(() => {
    const rectByClassId = new Map(effectiveClassBoxPlacementState.rectByClassId);
    for (const [classId, height] of classContentHeightById) {
      const rect = rectByClassId.get(classId);
      if (rect) rectByClassId.set(classId, { ...rect, h: Math.max(rect.h, height) });
    }
    return { rectByClassId };
  }, [classContentHeightById, effectiveClassBoxPlacementState]);
  const onClassContentHeightChange = useCallback((classId: ClassId, height: number) => {
    setClassContentHeightById((current) => {
      if (current.get(classId) === height) return current;
      const next = new Map(current);
      next.set(classId, height);
      return next;
    });
  }, []);
  const renderedNoteBoxPlacementState = useMemo<NoteBoxPlacementState>(() => {
    const rectByNoteId = new Map(noteBoxPlacementState.rectByNoteId);
    for (const [noteId, height] of noteContentHeightById) {
      const rect = rectByNoteId.get(noteId);
      if (rect) rectByNoteId.set(noteId, { ...rect, h: Math.max(rect.h, height) });
    }
    return { rectByNoteId };
  }, [noteBoxPlacementState, noteContentHeightById]);
  const onNoteContentHeightChange = useCallback((noteId: NoteId, height: number) => {
    setNoteContentHeightById((current) => {
      if (current.get(noteId) === height) return current;
      const next = new Map(current);
      next.set(noteId, height);
      return next;
    });
  }, []);
  const noteAttachSource = toNoteAttachSourcePoint(
    noteAttachState,
    renderedNoteBoxPlacementState,
    noteAttachCursor,
    flowToScreenPosition
  );
  const namespaceGeometry = useMemo(
    () => toNamespaceGeometry(view, renderedClassBoxPlacementState, namespaceGestureState),
    [view, renderedClassBoxPlacementState, namespaceGestureState]
  );
  const renderedNamespaceGeometry = useMemo(
    () =>
      namespaceDragBoundsState
        ? { ...namespaceGeometry, boundsByNamespaceId: namespaceDragBoundsState }
        : namespaceGeometry,
    [namespaceGeometry, namespaceDragBoundsState]
  );

  const callbacks = useMemo(
    () => ({
      onClassBoxPlacementChange,
      onNoteBoxPlacementChange,
      onDragComplete,
      onClassMoved,
      onNoteMoved,
      onRelationshipConnect,
      onRelationshipReconnect,
      onBackgroundClick,
      onConnectAborted,
      onNoteAttachCancel,
      onNamespaceGestureCancel,
      onNamespaceGestureChange,
      onNamespaceCreateCommitted,
      onNamespaceResizeStart,
      onNamespaceResizeCommitted,
      onNamespaceSelect,
    }),
    [
      onClassBoxPlacementChange,
      onNoteBoxPlacementChange,
      onDragComplete,
      onClassMoved,
      onNoteMoved,
      onRelationshipConnect,
      onRelationshipReconnect,
      onBackgroundClick,
      onConnectAborted,
      onNoteAttachCancel,
      onNamespaceGestureCancel,
      onNamespaceGestureChange,
      onNamespaceCreateCommitted,
      onNamespaceResizeStart,
      onNamespaceResizeCommitted,
      onNamespaceSelect,
    ]
  );

  // Event handler props derivation
  const {
    onNodesChange,
    onNoteResizeEnd,
    onNodeDragStop,
    onNodeDrag,
    onNodeDragStart,
    onCanvasGestureCancel,
    onClassResizeHandlePress,
    onNoteResizeHandlePress,
    onNamespaceResizeHandlePress,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onReconnect,
    onReconnectStart,
    onReconnectEnd,
    onCanvasMouseMove,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onPaneClick,
  } = useInteractions({
    callbacks,
    isRelationshipPlacementArmed: isRelationshipPlacementActive,
    noteAttachState,
    setNoteAttachCursor,
    setSurfaceResizeActive,
    placementStartPointRef,
    placementPointerRef,
    namespaceStartPointRef,
    namespaceDragStartPointRef,
    namespaceDropBoundsRef,
    namespaceResizePointerStateRef,
    classResizePointerStateRef,
    noteResizePointerStateRef,
    reconnectSeedRef,
    reconnectPointerRef,
    screenToFlowPosition,
    namespaceGestureState,
    namespaceGeometry: renderedNamespaceGeometry,
    setNamespaceDragState,
    setNamespaceDragBoundsState,
    view,
    classBoxPlacementState,
    classContentHeightById,
    noteContentHeightById,
  });

  // Keystroke listener registration
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      if (
        !namespaceDragState &&
        namespaceGestureState.kind === "none" &&
        !isSurfaceResizeActive &&
        !namespaceResizePointerStateRef.current &&
        !classResizePointerStateRef.current &&
        !noteResizePointerStateRef.current
      ) {
        return;
      }
      event.preventDefault();
      onCanvasGestureCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isSurfaceResizeActive,
    namespaceDragState,
    namespaceGestureState.kind,
    onCanvasGestureCancel,
  ]);

  useEffect(() => {
    if (exportRequest <= handledExportRequestRef.current) return;
    handledExportRequestRef.current = exportRequest;
    pendingExportRef.current = true;
    setExportCaptureActive(true);
  }, [exportRequest]);

  useEffect(() => {
    if (!isExportCaptureActive || !pendingExportRef.current) return;
    const canvasFrame = canvasRootRef.current;
    const viewport = canvasFrame?.querySelector<HTMLElement>(".react-flow__viewport");
    if (!viewport || !canvasFrame) {
      pendingExportRef.current = false;
      setExportCaptureActive(false);
      onExportComplete({
        status: "error",
        requestId: handledExportRequestRef.current,
        stage: "dom-target",
        message: "The active React Flow viewport or canvas frame was not found.",
      });
      return;
    }

    let cancelled = false;
    const expectedEdgeCount =
      view.relationships.length +
      view.notes.filter((note) => note.attachedToClassId !== null).length;
    void waitForRenderedEdges(canvasFrame, expectedEdgeCount)
      .then(() => {
        if (cancelled) return;
        const backgroundColor = getComputedStyle(canvasFrame).backgroundColor;
        void captureReactFlowCanvas(viewport, getNodes(), backgroundColor)
          .then((pngDataUrl) => {
            if (!cancelled) {
              onExportComplete({
                status: "success",
                requestId: handledExportRequestRef.current,
                base64: pngDataUrlToBase64(pngDataUrl),
              });
            }
          })
          .catch((error: unknown) => {
            if (!cancelled) {
              onExportComplete({
                status: "error",
                requestId: handledExportRequestRef.current,
                stage: "canvas-capture",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          })
          .finally(() => {
            if (!cancelled) {
              pendingExportRef.current = false;
              setExportCaptureActive(false);
            }
          });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onExportComplete({
            status: "error",
            requestId: handledExportRequestRef.current,
            stage: "edge-reconciliation",
            message: error instanceof Error ? error.message : String(error),
          });
          pendingExportRef.current = false;
          setExportCaptureActive(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getNodes, isExportCaptureActive, onExportComplete, view.notes, view.relationships.length]);

  const rfNodes = useMemo(() => {
    const selectedClassIds =
      renderedSelectionState.kind === "classes" ? renderedSelectionState.classIds : [];
    const namespaceNodes = toNamespaceNodeDescriptors(
      view.namespaces,
      renderedNamespaceGeometry,
      renderedSelectionState,
      onNamespaceSelect,
      onNamespaceResizeHandlePress,
      editingState,
      onTextBlockEditStart,
      onTextBlockEditCancel,
      onNamespaceRenameCommitted
    );
    const classNodes = toClassBoxNodeDescriptors(
      view.classes,
      selectedClassIds,
      renderedClassBoxPlacementState,
      renderedNamespaceGeometry,
      isRelationshipPlacementActive,
      onClassSelect,
      onClassResizeHandlePress,
      editingState,
      onTextBlockEditStart,
      onTextBlockEditCancel,
      onClassContentHeightChange
    );
    const noteNodes = toNoteBoxNodeDescriptors(
      view.notes,
      renderedSelectionState,
      editingState,
      renderedNoteBoxPlacementState,
      onNoteSelect,
      onNoteResizeEnd,
      onNoteResizeHandlePress,
      onTextBlockEditStart,
      onTextBlockEditCancel,
      onNoteContentHeightChange
    );
    return [...namespaceNodes, ...classNodes, ...noteNodes];
  }, [
    view,
    renderedSelectionState,
    renderedClassBoxPlacementState,
    renderedNamespaceGeometry,
    renderedNoteBoxPlacementState,
    isRelationshipPlacementActive,
    onClassSelect,
    onNoteSelect,
    onNoteResizeEnd,
    onNoteResizeHandlePress,
    onClassResizeHandlePress,
    onNamespaceSelect,
    onNamespaceRenameCommitted,
    onNamespaceResizeHandlePress,
    editingState,
    onTextBlockEditStart,
    onTextBlockEditCancel,
    onClassContentHeightChange,
    onNoteContentHeightChange,
  ]);
  const rfEdges = useMemo<Array<RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor>>(
    () => [
      ...toRelationshipEdgeDescriptors(
        view.classes,
        view.relationships,
        renderedSelectionState,
        renderedClassBoxPlacementState,
        isRelationshipPlacementActive,
        onRelationshipSelect
      ),
      ...toNoteAttachmentEdgeDescriptors(
        view.notes,
        view.classes,
        renderedClassBoxPlacementState,
        renderedNoteBoxPlacementState,
        noteAttachState
      ),
    ],
    [
      view.classes,
      view.relationships,
      view.notes,
      renderedSelectionState,
      renderedClassBoxPlacementState,
      renderedNoteBoxPlacementState,
      noteAttachState,
      isRelationshipPlacementActive,
      onRelationshipSelect,
    ]
  );
  const renderedNodes = useMemo(
    () =>
      isRelationshipPlacementActive
        ? rfNodes.map((node) => ({ ...node, style: { ...node.style, cursor: "inherit" } }))
        : rfNodes,
    [isRelationshipPlacementActive, rfNodes]
  );

  // Rendered for both placement and reconnect drags; reconnect drags carry no
  // placement seed and fall back to the neutral ghost styling.
  const connectionLineComponent = useMemo<
    ConnectionLineComponent<
      ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
    >
  >(() => {
    const placementSeed = relationshipPlacementState?.seed ?? null;
    return function ArmedRelationshipConnectionLine(props): ReactElement {
      return (
        <RelationshipConnectionLineAdapter
          {...props}
          placementSeed={placementSeed}
          placementStartPointRef={placementStartPointRef}
          placementPointerRef={placementPointerRef}
          reconnectSeedRef={reconnectSeedRef}
          reconnectPointerRef={reconnectPointerRef}
        />
      );
    };
  }, [relationshipPlacementState]);

  return (
    <CanvasGridFrame frameRef={canvasRootRef} placementCursor={isRelationshipPlacementActive}>
      <ReactFlow<
        ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor,
        RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor
      >
        // Editable React Flow canvas boundary.
        nodes={renderedNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onMouseMove={onCanvasMouseMove}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPaneClick={onPaneClick}
        connectionMode={ConnectionMode.Loose}
        isValidConnection={isValidRelationshipConnection}
        reconnectRadius={RELATIONSHIP_RECONNECT_RADIUS}
        style={REACT_FLOW_RUNTIME_STYLE}
        connectionLineComponent={connectionLineComponent}
        fitView
        nodesDraggable={
          editingState.kind === "none" &&
          !isPlacementActive &&
          !isNamespaceGestureActive &&
          !isSurfaceResizeActive
        }
        panOnDrag={
          editingState.kind === "none" &&
          !isPlacementActive &&
          !isNamespaceGestureActive &&
          !isSurfaceResizeActive
        }
        zoomOnScroll
        // Keep last. This enforces Shiny's React Flow boundary policy.
        {...reactFlowCanvasBoundaryProps}
      >
        <Controls showInteractive={false} />
        <PlacementOverlay
          nodePlacementState={nodePlacementState}
          onPlacementComplete={onPlacementComplete}
        />
      </ReactFlow>
      {noteAttachSource && noteAttachCursor ? (
        <NoteAttachGhostLine sourcePoint={noteAttachSource} targetPoint={noteAttachCursor} />
      ) : null}
      {namespaceDraftStyle ? (
        <DraftRect
          rect={namespaceDraftStyle}
          tone="positive"
          positioning="fixed"
          stacking={NAMESPACE_GESTURE_Z_INDEX}
        />
      ) : null}
    </CanvasGridFrame>
  );
}

async function waitForRenderedEdges(
  canvasFrame: HTMLElement,
  expectedEdgeCount: number
): Promise<void> {
  if (expectedEdgeCount === 0) {
    await nextAnimationFrame();
    return;
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await nextAnimationFrame();
    const renderedCount = canvasFrame.querySelectorAll(".react-flow__edge").length;
    if (renderedCount >= expectedEdgeCount) return;
  }
  const renderedCount = canvasFrame.querySelectorAll(".react-flow__edge").length;
  throw new Error(
    `React Flow rendered ${renderedCount} of ${expectedEdgeCount} expected edges after 8 frames.`
  );
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// Private helpers
function toNamespaceDraftStyle(
  namespaceGestureState: NamespaceGestureState,
  flowToScreenPosition: (position: XYPosition) => XYPosition
): Rect | null {
  if (namespaceGestureState.kind !== "creating") return null;
  if (namespaceGestureState.rect.w === 0 && namespaceGestureState.rect.h === 0) return null;
  const topLeft = flowToScreenPosition({
    x: namespaceGestureState.rect.x,
    y: namespaceGestureState.rect.y,
  });
  const bottomRight = flowToScreenPosition({
    x: namespaceGestureState.rect.x + namespaceGestureState.rect.w,
    y: namespaceGestureState.rect.y + namespaceGestureState.rect.h,
  });
  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    w: Math.abs(bottomRight.x - topLeft.x),
    h: Math.abs(bottomRight.y - topLeft.y),
  };
}

function toNoteAttachSourcePoint(
  noteAttachState: NoteAttachState,
  noteBoxPlacementState: NoteBoxPlacementState,
  targetPoint: Point | null,
  flowToScreenPosition: (position: XYPosition) => XYPosition
): Point | null {
  if (noteAttachState.kind !== "attaching") return null;
  if (!targetPoint) return null;
  const rect = noteBoxPlacementState.rectByNoteId.get(noteAttachState.noteId);
  if (!rect) return null;
  const topLeft = flowToScreenPosition({ x: rect.x, y: rect.y });
  const bottomRight = flowToScreenPosition({ x: rect.x + rect.w, y: rect.y + rect.h });
  return toRectEdgePoint(
    {
      x: Math.min(topLeft.x, bottomRight.x),
      y: Math.min(topLeft.y, bottomRight.y),
      w: Math.abs(bottomRight.x - topLeft.x),
      h: Math.abs(bottomRight.y - topLeft.y),
    },
    targetPoint
  );
}

type ScreenRect = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

function toRectEdgePoint(rect: ScreenRect, targetPoint: Point): Point {
  const center = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;

  if (dx === 0 && dy === 0) {
    return { x: rect.x + rect.w, y: center.y };
  }

  const xScale = dx === 0 ? Number.POSITIVE_INFINITY : rect.w / 2 / Math.abs(dx);
  const yScale = dy === 0 ? Number.POSITIVE_INFINITY : rect.h / 2 / Math.abs(dy);
  const edgeScale = Math.min(xScale, yScale);
  return {
    x: center.x + dx * edgeScale,
    y: center.y + dy * edgeScale,
  };
}
