/**
 * @behavior Namespace gestures, canvas callbacks, and native reconnect-drag suppression.
 * @framework React Flow canvas events to View class selection and placement callbacks.
 */

import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { flushSync } from "react-dom";
import type {
  Connection,
  NodeChange,
  OnConnectEnd,
  OnConnectStart,
  OnNodeDrag,
  ReactFlowProps,
  XYPosition,
} from "@xyflow/react";
import type {
  ClassBoxPlacementState,
  NamespaceGestureState,
  NoteAttachState,
  RelationshipSeed,
} from "../../../../state/editorStates";
import type { RelationshipView } from "../../../../views/schema";
import type {
  ClassBoxNodeDescriptor,
  ClassBoxPlacementChange,
  NoteBoxNodeDescriptor,
  NoteBoxPlacementChange,
  NoteAttachmentEdgeDescriptor,
  NamespaceDragState,
  NamespaceGeometry,
  NamespaceNodeDescriptor,
  NamespaceResizeHandle,
  RelationshipEdgeDescriptor,
} from "./frameworkAdapters";
import {
  overlaps,
  toClassBoxPlacementChanges,
  toNamespaceDragBoundsState,
  toNoteBoxPlacementChanges,
  toRelationshipConnection,
  toRelationshipReconnect,
} from "./frameworkAdapters";
import type { ClassId, NamespaceId, NoteId, RelationshipId } from "../../../../../shared/ids";
import type { Point, Rect } from "../../../../../shared/geometry";
import { useDispatchTransaction } from "../../../../contexts";
import {
  CLASS_BOX_MIN_HEIGHT,
  CLASS_BOX_MIN_WIDTH,
  NOTE_MIN_HEIGHT,
  NOTE_MIN_WIDTH,
} from "../../../../config/editorUiConfig";
import {
  toClassDropTransaction,
  toClassResizeTransaction,
  toNamespaceCreateTransaction,
  toNamespaceDropTransaction,
  toNamespaceResizeTransaction,
} from "./transactions";
import type { TransactionResult } from "../../../../commands/editorCommands";
import type { DiagramView } from "../../../../views/schema";
import { logAction } from "../../../../../shared/logging";

type ReactFlowCanvasAdapterCallbacks = {
  readonly onClassBoxPlacementChange: (changes: readonly ClassBoxPlacementChange[]) => void;
  readonly onNoteBoxPlacementChange: (changes: readonly NoteBoxPlacementChange[]) => void;
  readonly onDragComplete: (
    finalPositions: readonly ClassBoxPlacementChange[],
    finalNotePositions: readonly NoteBoxPlacementChange[]
  ) => void;
  readonly onClassMoved: (classId: ClassId) => void;
  readonly onNoteMoved: (noteId: NoteId) => void;
  readonly onRelationshipConnect: (sourceClassId: ClassId, targetClassId: ClassId) => void;
  readonly onRelationshipReconnect: (
    relationshipId: RelationshipId,
    end: "source" | "target",
    newClassId: ClassId
  ) => void;
  readonly onBackgroundClick: () => void;
  readonly onConnectAborted: () => void;
  readonly onNoteAttachCancel: () => void;
  readonly onNamespaceGestureCancel: () => void;
  readonly onNamespaceGestureChange: (rect: Rect) => void;
  readonly onNamespaceCreateCommitted: (result: TransactionResult | null) => void;
  readonly onNamespaceResizeStart: (namespaceId: NamespaceId, rect: Rect) => void;
  readonly onNamespaceResizeCommitted: (result: TransactionResult | null) => void;
  readonly onNamespaceSelect: (namespaceId: NamespaceId) => void;
};

export type NamespaceResizePointerState = {
  readonly namespaceId: NamespaceId;
  readonly handle: NamespaceResizeHandle;
  readonly startRect: Rect;
  readonly startPoint: Point;
};

export type ClassResizePointerState = {
  readonly classId: ClassId;
  readonly handle: NamespaceResizeHandle;
  readonly startRect: Rect;
  readonly startPoint: Point;
  readonly minHeight: number;
};

export type NoteResizePointerState = {
  readonly noteId: NoteId;
  readonly handle: NamespaceResizeHandle;
  readonly startRect: Rect;
  readonly startPoint: Point;
  readonly minHeight: number;
};

type UseInteractionsInput = {
  readonly callbacks: ReactFlowCanvasAdapterCallbacks;
  readonly isRelationshipPlacementArmed: boolean;
  readonly noteAttachState: NoteAttachState;
  readonly setNoteAttachCursor: Dispatch<SetStateAction<Point | null>>;
  readonly setSurfaceResizeActive: Dispatch<SetStateAction<boolean>>;
  readonly placementStartPointRef: MutableRefObject<XYPosition | null>;
  readonly placementPointerRef: MutableRefObject<XYPosition | null>;
  readonly namespaceStartPointRef: MutableRefObject<XYPosition | null>;
  readonly namespaceDragStartPointRef: MutableRefObject<XYPosition | null>;
  readonly namespaceDropBoundsRef: MutableRefObject<ReadonlyMap<NamespaceId, Rect> | null>;
  readonly namespaceResizePointerStateRef: MutableRefObject<NamespaceResizePointerState | null>;
  readonly classResizePointerStateRef: MutableRefObject<ClassResizePointerState | null>;
  readonly noteResizePointerStateRef: MutableRefObject<NoteResizePointerState | null>;
  readonly reconnectSeedRef: MutableRefObject<RelationshipSeed | null>;
  readonly reconnectPointerRef: MutableRefObject<XYPosition | null>;
  readonly screenToFlowPosition: (position: XYPosition) => XYPosition;
  readonly namespaceGestureState: NamespaceGestureState;
  readonly namespaceGeometry: NamespaceGeometry;
  readonly setNamespaceDragState: Dispatch<SetStateAction<NamespaceDragState | null>>;
  readonly setNamespaceDragBoundsState: Dispatch<
    SetStateAction<ReadonlyMap<NamespaceId, Rect> | null>
  >;
  readonly view: Pick<DiagramView, "classes" | "namespaces">;
  readonly classBoxPlacementState: ClassBoxPlacementState;
  readonly classContentHeightById: ReadonlyMap<ClassId, number>;
  readonly noteContentHeightById: ReadonlyMap<NoteId, number>;
};

type Interactions = {
  readonly onNodesChange: (
    changes: NodeChange<ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor>[]
  ) => void;
  readonly onNoteResizeEnd: (change: NoteBoxPlacementChange) => void;
  readonly onNodeDragStop: OnNodeDrag<
    ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
  >;
  readonly onNodeDrag: OnNodeDrag<
    ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
  >;
  readonly onNodeDragStart: OnNodeDrag<
    ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
  >;
  readonly onCanvasGestureCancel: () => void;
  readonly onClassResizeHandlePress: (
    classId: ClassId,
    bounds: Rect,
    handle: NamespaceResizeHandle,
    screenPoint: Point
  ) => void;
  readonly onNoteResizeHandlePress: (
    noteId: NoteId,
    bounds: Rect,
    handle: NamespaceResizeHandle,
    screenPoint: Point
  ) => void;
  readonly onNamespaceResizeHandlePress: (
    namespaceId: NamespaceId,
    bounds: Rect,
    handle: NamespaceResizeHandle,
    screenPoint: Point
  ) => void;
  readonly onConnect: (connection: Connection) => void;
  readonly onConnectStart: OnConnectStart;
  readonly onConnectEnd: OnConnectEnd;
  readonly onReconnect: (
    oldEdge: RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor,
    newConnection: Connection
  ) => void;
  readonly onReconnectStart: OnReconnectStart;
  readonly onReconnectEnd: ReconnectEndHandler;
  readonly onCanvasMouseMove: (event: ReactMouseEvent) => void;
  readonly onCanvasPointerDown: (event: ReactMouseEvent) => void;
  readonly onCanvasPointerMove: (event: ReactMouseEvent) => void;
  readonly onCanvasPointerUp: (event: ReactMouseEvent) => void;
  readonly onPaneClick: (event: ReactMouseEvent) => void;
};

type OnReconnectStart = (
  event: ReactMouseEvent,
  edge: RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor,
  handleType: "source" | "target"
) => void;

type ReconnectEndHandler = NonNullable<
  ReactFlowProps<
    ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor,
    RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor
  >["onReconnectEnd"]
>;

export function useInteractions({
  callbacks,
  isRelationshipPlacementArmed,
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
  namespaceGeometry,
  setNamespaceDragState,
  setNamespaceDragBoundsState,
  view,
  classBoxPlacementState,
  classContentHeightById,
  noteContentHeightById,
}: UseInteractionsInput): Interactions {
  const suppressPaneClickRef = useRef(false);
  const edgeGestureActiveRef = useRef(false);
  const reconnectPressPendingRef = useRef(false);
  const tracedReconnectMoveRef = useRef(false);
  const dispatchTransaction = useDispatchTransaction();
  useEffect(() => {
    function suppressNativeSelection(event: Event): void {
      if (!edgeGestureActiveRef.current) return;
      traceReconnect("selection.suppressed", {
        eventType: event.type,
        target: describeEventTarget(event.target),
      });
      event.preventDefault();
    }

    function traceUpdaterPress(event: MouseEvent): void {
      const target = event.target instanceof Element ? event.target : null;
      if (event.button !== 0 || !target?.closest(".react-flow__edgeupdater")) return;
      reconnectPressPendingRef.current = true;
      edgeGestureActiveRef.current = true;
      tracedReconnectMoveRef.current = false;
      event.preventDefault();
      traceReconnect("native.updater-mousedown", {
        button: event.button,
        defaultPrevented: event.defaultPrevented,
        target: describeEventTarget(event.target),
        transport: "document-mouse-listeners-no-pointer-capture",
      });
      traceReconnect("suppression.on", { owner: "updater-mousedown" });
      window.setTimeout(() => {
        traceReconnect("native.updater-mousedown-after-dispatch", {
          defaultPrevented: event.defaultPrevented,
          target: describeEventTarget(event.target),
        });
      }, 0);
    }

    function traceReconnectMove(event: MouseEvent): void {
      if (!edgeGestureActiveRef.current || tracedReconnectMoveRef.current) return;
      tracedReconnectMoveRef.current = true;
      traceReconnect("native.first-mousemove-after-start", {
        buttons: event.buttons,
        defaultPrevented: event.defaultPrevented,
        target: describeEventTarget(event.target),
      });
    }

    function traceReconnectRelease(event: MouseEvent): void {
      if (!edgeGestureActiveRef.current && !reconnectPressPendingRef.current) return;
      traceReconnect("native.mouseup-capture", {
        button: event.button,
        defaultPrevented: event.defaultPrevented,
        target: describeEventTarget(event.target),
        reconnectStarted: edgeGestureActiveRef.current,
      });
      reconnectPressPendingRef.current = false;
      // RF's document mouseup listener runs after this capture observer. Defer
      // the threshold-free cleanup so RF can report connect/reconnect end first.
      window.setTimeout(() => {
        if (!edgeGestureActiveRef.current) return;
        edgeGestureActiveRef.current = false;
        traceReconnect("suppression.off", { owner: "mouseup-fallback" });
      }, 0);
    }

    function traceWindowBlur(): void {
      if (!edgeGestureActiveRef.current) return;
      traceReconnect("native.window-blur-while-active");
      reconnectPressPendingRef.current = false;
      edgeGestureActiveRef.current = false;
      traceReconnect("suppression.off", { owner: "window-blur" });
    }

    window.addEventListener("selectstart", suppressNativeSelection);
    window.addEventListener("mousedown", traceUpdaterPress, true);
    window.addEventListener("mousemove", traceReconnectMove, true);
    window.addEventListener("mouseup", traceReconnectRelease, true);
    window.addEventListener("blur", traceWindowBlur);
    return () => {
      window.removeEventListener("selectstart", suppressNativeSelection);
      window.removeEventListener("mousedown", traceUpdaterPress, true);
      window.removeEventListener("mousemove", traceReconnectMove, true);
      window.removeEventListener("mouseup", traceReconnectRelease, true);
      window.removeEventListener("blur", traceWindowBlur);
    };
  }, []);
  // Framework prop and event adaptation
  useEffect(() => {
    function updatePointerPosition(event: PointerEvent): void {
      setNoteAttachCursor({ x: event.clientX, y: event.clientY });
    }

    window.addEventListener("pointerdown", updatePointerPosition);
    window.addEventListener("pointermove", updatePointerPosition);
    return () => {
      window.removeEventListener("pointerdown", updatePointerPosition);
      window.removeEventListener("pointermove", updatePointerPosition);
    };
  }, [setNoteAttachCursor]);

  // Framework prop and event adaptation
  const onNodesChange = useCallback(
    (
      changes: NodeChange<
        ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
      >[]
    ) => {
      const placementChanges = toClassBoxPlacementChanges(changes);
      if (placementChanges.length > 0) {
        callbacks.onClassBoxPlacementChange(placementChanges);
      }
      const notePlacementChanges = toNoteBoxPlacementChanges(changes);
      if (notePlacementChanges.length > 0) {
        callbacks.onNoteBoxPlacementChange(notePlacementChanges);
      }
    },
    [callbacks]
  );

  // Framework prop and event adaptation
  const onNoteResizeEnd = useCallback(
    (change: NoteBoxPlacementChange) => {
      callbacks.onDragComplete([], [change]);
      callbacks.onNoteMoved(change.noteId);
    },
    [callbacks]
  );

  // Framework prop and event adaptation
  const onNodeDragStart = useCallback<
    OnNodeDrag<ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor>
  >(
    (_event, node) => {
      if (node.type === "classBox") {
        const bounds = new Map(namespaceGeometry.boundsByNamespaceId);
        namespaceDropBoundsRef.current = bounds;
        setNamespaceDragBoundsState(bounds);
        return;
      }
      if (node.type !== "namespaceBox") return;
      const bounds = new Map(namespaceGeometry.boundsByNamespaceId);
      namespaceDropBoundsRef.current = bounds;
      setNamespaceDragBoundsState(bounds);
      namespaceStartPointRef.current = null;
      namespaceDragStartPointRef.current = node.position;
      setNamespaceDragState({
        namespaceId: node.data.view.namespaceId,
        delta: { x: 0, y: 0 },
      });
      callbacks.onNamespaceSelect(node.data.view.namespaceId);
    },
    [
      callbacks,
      namespaceDragStartPointRef,
      namespaceDropBoundsRef,
      namespaceGeometry,
      namespaceStartPointRef,
      setNamespaceDragBoundsState,
      setNamespaceDragState,
    ]
  );

  // Framework prop and event adaptation
  const onNodeDrag = useCallback<
    OnNodeDrag<ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor>
  >(
    (_event, node) => {
      if (node.type !== "namespaceBox") return;
      const startPoint = namespaceDragStartPointRef.current;
      if (!startPoint) return;
      const nextDragState = {
        namespaceId: node.data.view.namespaceId,
        delta: {
          x: node.position.x - startPoint.x,
          y: node.position.y - startPoint.y,
        },
      };
      setNamespaceDragState(nextDragState);
      const startBounds = namespaceDropBoundsRef.current;
      if (startBounds) {
        setNamespaceDragBoundsState(
          toNamespaceDragBoundsState(startBounds, view.namespaces, nextDragState)
        );
      }
    },
    [
      namespaceDragStartPointRef,
      namespaceDropBoundsRef,
      setNamespaceDragBoundsState,
      setNamespaceDragState,
      view.namespaces,
    ]
  );

  // Framework prop and event adaptation
  const onNodeDragStop = useCallback<
    OnNodeDrag<ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor>
  >(
    (_event, node, rfNodes) => {
      if (node.type === "namespaceBox") {
        const startPoint = namespaceDragStartPointRef.current;
        namespaceDragStartPointRef.current = null;
        setNamespaceDragState(null);
        const dropBounds = namespaceDropBoundsRef.current ?? namespaceGeometry.boundsByNamespaceId;
        namespaceDropBoundsRef.current = null;
        setNamespaceDragBoundsState(null);
        if (!startPoint) return;
        const delta = {
          x: node.position.x - startPoint.x,
          y: node.position.y - startPoint.y,
        };
        const finalRect = {
          x: node.position.x,
          y: node.position.y,
          w: node.width ?? node.data.bounds.w,
          h: node.height ?? node.data.bounds.h,
        };
        const transaction = toNamespaceDropTransaction(
          node.data.view.namespaceId,
          delta,
          toDroppedNamespaceParentNamespaceId(
            finalRect,
            node.data.view.namespaceId,
            view,
            dropBounds
          ),
          view,
          classBoxPlacementState
        );
        logAction("drag-end", node.data.view.namespaceId, {
          x: finalRect.x,
          y: finalRect.y,
          w: finalRect.w,
          h: finalRect.h,
        });
        if (transaction.length > 0) {
          dispatchTransaction(transaction);
        }
        callbacks.onNamespaceSelect(node.data.view.namespaceId);
        return;
      }
      if (node.type === "classBox") {
        const dropBounds = namespaceDropBoundsRef.current ?? namespaceGeometry.boundsByNamespaceId;
        namespaceDropBoundsRef.current = null;
        setNamespaceDragBoundsState(null);
        const finalRect = {
          x: node.position.x,
          y: node.position.y,
          w: node.width ?? node.data.view.bounds.w,
          h: node.height ?? node.data.view.bounds.h,
        };
        logAction("drag-end", node.data.view.classId, {
          x: finalRect.x,
          y: finalRect.y,
          w: finalRect.w,
          h: finalRect.h,
        });
        dispatchTransaction(
          toClassDropTransaction(
            node.data.view.classId,
            finalRect,
            toDroppedClassParentNamespaceId(finalRect, dropBounds),
            view
          )
        );
        callbacks.onClassMoved(node.data.view.classId);
        return;
      }
      const finalPositions = rfNodes.flatMap((rfNode) => {
        if (rfNode.type !== "classBox") return [];
        return [{ classId: rfNode.data.view.classId, x: rfNode.position.x, y: rfNode.position.y }];
      });
      const finalNotePositions = rfNodes.flatMap((rfNode) => {
        if (rfNode.type !== "noteBox") return [];
        return [
          {
            noteId: rfNode.data.view.noteId,
            x: rfNode.position.x,
            y: rfNode.position.y,
            w: rfNode.width,
            h: rfNode.height,
          },
        ];
      });
      callbacks.onDragComplete(finalPositions, finalNotePositions);
      if (node.type === "noteBox") {
        logAction("drag-end", node.data.view.noteId, {
          x: node.position.x,
          y: node.position.y,
          w: node.width ?? null,
          h: node.height ?? null,
        });
        callbacks.onNoteMoved(node.data.view.noteId);
      }
    },
    [
      callbacks,
      classBoxPlacementState,
      dispatchTransaction,
      namespaceDragStartPointRef,
      namespaceDropBoundsRef,
      namespaceGeometry,
      setNamespaceDragBoundsState,
      setNamespaceDragState,
      view,
    ]
  );

  const onCanvasGestureCancel = useCallback(() => {
    const classResizeState = classResizePointerStateRef.current;
    if (classResizeState) {
      classResizePointerStateRef.current = null;
      setSurfaceResizeActive(false);
      callbacks.onClassBoxPlacementChange([
        { classId: classResizeState.classId, ...classResizeState.startRect },
      ]);
      return;
    }
    const noteResizeState = noteResizePointerStateRef.current;
    if (noteResizeState) {
      noteResizePointerStateRef.current = null;
      setSurfaceResizeActive(false);
      callbacks.onNoteBoxPlacementChange([
        { noteId: noteResizeState.noteId, ...noteResizeState.startRect },
      ]);
      return;
    }
    namespaceDragStartPointRef.current = null;
    namespaceDropBoundsRef.current = null;
    namespaceResizePointerStateRef.current = null;
    namespaceStartPointRef.current = null;
    setSurfaceResizeActive(false);
    setNamespaceDragBoundsState(null);
    setNamespaceDragState(null);
    if (namespaceGestureState.kind !== "none") callbacks.onNamespaceGestureCancel();
  }, [
    callbacks,
    classResizePointerStateRef,
    namespaceDragStartPointRef,
    namespaceDropBoundsRef,
    namespaceGestureState.kind,
    namespaceResizePointerStateRef,
    namespaceStartPointRef,
    noteResizePointerStateRef,
    setSurfaceResizeActive,
    setNamespaceDragBoundsState,
    setNamespaceDragState,
  ]);

  const onClassResizeHandlePress = useCallback(
    (classId: ClassId, bounds: Rect, handle: NamespaceResizeHandle, screenPoint: Point) => {
      const startPoint = screenToFlowPosition(screenPoint);
      classResizePointerStateRef.current = {
        classId,
        handle,
        startRect: bounds,
        startPoint,
        minHeight: Math.max(CLASS_BOX_MIN_HEIGHT, classContentHeightById.get(classId) ?? 0),
      };
      setSurfaceResizeActive(true);
    },
    [
      classContentHeightById,
      classResizePointerStateRef,
      screenToFlowPosition,
      setSurfaceResizeActive,
    ]
  );

  const onNoteResizeHandlePress = useCallback(
    (noteId: NoteId, bounds: Rect, handle: NamespaceResizeHandle, screenPoint: Point) => {
      const startPoint = screenToFlowPosition(screenPoint);
      noteResizePointerStateRef.current = {
        noteId,
        handle,
        startRect: bounds,
        startPoint,
        minHeight: Math.max(NOTE_MIN_HEIGHT, noteContentHeightById.get(noteId) ?? 0),
      };
      setSurfaceResizeActive(true);
    },
    [noteContentHeightById, noteResizePointerStateRef, screenToFlowPosition, setSurfaceResizeActive]
  );

  const onNamespaceResizeHandlePress = useCallback(
    (namespaceId: NamespaceId, bounds: Rect, handle: NamespaceResizeHandle, screenPoint: Point) => {
      const startPoint = screenToFlowPosition(screenPoint);
      namespaceResizePointerStateRef.current = {
        namespaceId,
        handle,
        startRect: bounds,
        startPoint,
      };
      setSurfaceResizeActive(true);
      callbacks.onNamespaceResizeStart(namespaceId, bounds);
    },
    [callbacks, namespaceResizePointerStateRef, screenToFlowPosition, setSurfaceResizeActive]
  );

  // Framework prop and event adaptation
  const onConnect = useCallback(
    (connection: Connection) => {
      const relationshipConnection = toRelationshipConnection(connection);
      if (!relationshipConnection) return;
      callbacks.onRelationshipConnect(
        relationshipConnection.sourceClassId,
        relationshipConnection.targetClassId
      );
    },
    [callbacks]
  );

  // Framework prop and event adaptation
  const onConnectStart = useCallback<OnConnectStart>(
    (event) => {
      if (!isRelationshipPlacementArmed) return;

      edgeGestureActiveRef.current = true;

      const screenPoint = toScreenPoint(event);
      placementStartPointRef.current = screenPoint ? screenToFlowPosition(screenPoint) : null;
      placementPointerRef.current = placementStartPointRef.current;
    },
    [
      isRelationshipPlacementArmed,
      placementPointerRef,
      placementStartPointRef,
      screenToFlowPosition,
    ]
  );

  // Framework prop and event adaptation
  const onConnectEnd = useCallback<OnConnectEnd>(
    (event, connectionState) => {
      traceReconnect("rf.connect-end", {
        eventType: event.type,
        isValid: connectionState.isValid,
        fromNodeId: connectionState.fromNode?.id ?? null,
        toNodeId: connectionState.toNode?.id ?? null,
        toHandleId: connectionState.toHandle?.id ?? null,
      });
      traceReconnect("suppression.off", { owner: "onConnectEnd" });
      edgeGestureActiveRef.current = false;
      placementStartPointRef.current = null;
      placementPointerRef.current = null;
      reconnectSeedRef.current = null;
      reconnectPointerRef.current = null;
      if (connectionState.isValid === true) return;
      if (!isRelationshipPlacementArmed) return;
      callbacks.onConnectAborted();
    },
    [
      callbacks,
      isRelationshipPlacementArmed,
      placementStartPointRef,
      placementPointerRef,
      reconnectPointerRef,
      reconnectSeedRef,
    ]
  );

  // Framework prop and event adaptation
  const onReconnect = useCallback(
    (
      oldEdge: RelationshipEdgeDescriptor | NoteAttachmentEdgeDescriptor,
      newConnection: Connection
    ) => {
      traceReconnect("rf.reconnect-commit", {
        edgeId: oldEdge.id,
        edgeType: oldEdge.type,
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle,
        targetHandle: newConnection.targetHandle,
      });
      if (oldEdge.type !== "relationship") return;
      const reconnect = toRelationshipReconnect(oldEdge, newConnection);
      if (!reconnect) return;
      callbacks.onRelationshipReconnect(
        reconnect.relationshipId,
        reconnect.end,
        reconnect.newClassId
      );
    },
    [callbacks]
  );

  // Framework prop and event adaptation
  const onReconnectStart = useCallback<OnReconnectStart>(
    (event, edge, handleType) => {
      traceReconnect("rf.reconnect-start", {
        edgeId: edge.id,
        edgeType: edge.type,
        eventType: event.type,
        handleType,
      });
      if (edge.type !== "relationship") {
        reconnectSeedRef.current = null;
        reconnectPointerRef.current = null;
        return;
      }
      traceReconnect("suppression.confirmed", { owner: "onReconnectStart" });
      const relationshipView = edge.data?.view;
      reconnectSeedRef.current = relationshipView
        ? toReconnectRelationshipSeed(relationshipView, handleType)
        : null;
      reconnectPointerRef.current = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [reconnectPointerRef, reconnectSeedRef, screenToFlowPosition]
  );

  // TODO(reconnect-trace): remove this diagnostic-only callback after the
  // reconnect investigation. It observes RF cleanup without changing state.
  const onReconnectEnd = useCallback<ReconnectEndHandler>(
    (event, edge, handleType, connectionState) => {
      traceReconnect("rf.reconnect-end", {
        edgeId: edge.id,
        edgeType: edge.type,
        eventType: event.type,
        handleType,
        isValid: connectionState.isValid,
        fromNodeId: connectionState.fromNode?.id ?? null,
        toNodeId: connectionState.toNode?.id ?? null,
        suppressionActive: edgeGestureActiveRef.current,
      });
    },
    []
  );

  // Framework prop and event adaptation
  const onCanvasMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      if (isRelationshipPlacementArmed) {
        placementPointerRef.current = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
      }
      if (reconnectSeedRef.current) {
        reconnectPointerRef.current = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
      }
      if (noteAttachState.kind !== "attaching") return;
      setNoteAttachCursor({ x: event.clientX, y: event.clientY });
    },
    [
      noteAttachState.kind,
      isRelationshipPlacementArmed,
      placementPointerRef,
      reconnectPointerRef,
      reconnectSeedRef,
      screenToFlowPosition,
      setNoteAttachCursor,
    ]
  );

  const onCanvasPointerDown = useCallback(
    (event: ReactMouseEvent) => {
      if (namespaceGestureState.kind === "none") return;
      event.preventDefault();
      event.stopPropagation();
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      namespaceStartPointRef.current = point;
      callbacks.onNamespaceGestureChange({ x: point.x, y: point.y, w: 0, h: 0 });
    },
    [callbacks, namespaceGestureState.kind, namespaceStartPointRef, screenToFlowPosition]
  );

  const onCanvasPointerMove = useCallback(
    (event: ReactMouseEvent) => {
      const classResizeState = classResizePointerStateRef.current;
      if (classResizeState) {
        event.preventDefault();
        event.stopPropagation();
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const rect = resizeClampedRect(
          classResizeState.startRect,
          classResizeState.handle,
          {
            x: point.x - classResizeState.startPoint.x,
            y: point.y - classResizeState.startPoint.y,
          },
          CLASS_BOX_MIN_WIDTH,
          Math.max(
            classResizeState.minHeight,
            classContentHeightById.get(classResizeState.classId) ?? 0
          )
        );
        flushSync(() => {
          callbacks.onClassBoxPlacementChange([{ classId: classResizeState.classId, ...rect }]);
        });
        return;
      }
      const noteResizeState = noteResizePointerStateRef.current;
      if (noteResizeState) {
        event.preventDefault();
        event.stopPropagation();
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const rect = resizeClampedRect(
          noteResizeState.startRect,
          noteResizeState.handle,
          {
            x: point.x - noteResizeState.startPoint.x,
            y: point.y - noteResizeState.startPoint.y,
          },
          NOTE_MIN_WIDTH,
          Math.max(
            noteResizeState.minHeight,
            noteContentHeightById.get(noteResizeState.noteId) ?? 0
          )
        );
        flushSync(() => {
          callbacks.onNoteBoxPlacementChange([{ noteId: noteResizeState.noteId, ...rect }]);
        });
        return;
      }
      const resizeState = namespaceResizePointerStateRef.current;
      if (resizeState) {
        event.preventDefault();
        event.stopPropagation();
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        flushSync(() => {
          callbacks.onNamespaceGestureChange(
            resizeNamespaceRect(resizeState.startRect, resizeState.handle, {
              x: point.x - resizeState.startPoint.x,
              y: point.y - resizeState.startPoint.y,
            })
          );
        });
        return;
      }
      if (namespaceGestureState.kind !== "creating") return;
      if (!namespaceStartPointRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      callbacks.onNamespaceGestureChange(normalizeRect(namespaceStartPointRef.current, point));
    },
    [
      callbacks,
      classContentHeightById,
      classResizePointerStateRef,
      namespaceGestureState.kind,
      namespaceResizePointerStateRef,
      namespaceStartPointRef,
      noteResizePointerStateRef,
      noteContentHeightById,
      screenToFlowPosition,
    ]
  );

  const onCanvasPointerUp = useCallback(
    (event: ReactMouseEvent) => {
      const classResizeState = classResizePointerStateRef.current;
      if (classResizeState) {
        event.preventDefault();
        event.stopPropagation();
        classResizePointerStateRef.current = null;
        setSurfaceResizeActive(false);
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const rect = resizeClampedRect(
          classResizeState.startRect,
          classResizeState.handle,
          {
            x: point.x - classResizeState.startPoint.x,
            y: point.y - classResizeState.startPoint.y,
          },
          CLASS_BOX_MIN_WIDTH,
          Math.max(
            classResizeState.minHeight,
            classContentHeightById.get(classResizeState.classId) ?? 0
          )
        );
        callbacks.onClassBoxPlacementChange([{ classId: classResizeState.classId, ...rect }]);
        logAction("resize-end", classResizeState.classId, rect);
        dispatchTransaction(toClassResizeTransaction(classResizeState.classId, rect));
        suppressPaneClickRef.current = true;
        window.setTimeout(() => {
          suppressPaneClickRef.current = false;
        }, 0);
        return;
      }
      const noteResizeState = noteResizePointerStateRef.current;
      if (noteResizeState) {
        event.preventDefault();
        event.stopPropagation();
        noteResizePointerStateRef.current = null;
        setSurfaceResizeActive(false);
        const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const rect = resizeClampedRect(
          noteResizeState.startRect,
          noteResizeState.handle,
          {
            x: point.x - noteResizeState.startPoint.x,
            y: point.y - noteResizeState.startPoint.y,
          },
          NOTE_MIN_WIDTH,
          Math.max(
            noteResizeState.minHeight,
            noteContentHeightById.get(noteResizeState.noteId) ?? 0
          )
        );
        callbacks.onNoteBoxPlacementChange([{ noteId: noteResizeState.noteId, ...rect }]);
        logAction("resize-end", noteResizeState.noteId, rect);
        onNoteResizeEnd({ noteId: noteResizeState.noteId, ...rect });
        suppressPaneClickRef.current = true;
        window.setTimeout(() => {
          suppressPaneClickRef.current = false;
        }, 0);
        return;
      }
      const resizeState = namespaceResizePointerStateRef.current;
      if (resizeState && namespaceGestureState.kind === "resizing") {
        event.preventDefault();
        event.stopPropagation();
        namespaceResizePointerStateRef.current = null;
        setSurfaceResizeActive(false);
        const transaction = toNamespaceResizeTransaction(
          resizeState.namespaceId,
          [...namespaceGeometry.pendingClassIds],
          [...namespaceGeometry.pendingNamespaceIds],
          view
        );
        logAction("resize-end", resizeState.namespaceId, namespaceGestureState.rect);
        const result = transaction.length > 0 ? dispatchTransaction(transaction) : null;
        callbacks.onNamespaceResizeCommitted(result);
        suppressPaneClickRef.current = true;
        window.setTimeout(() => {
          suppressPaneClickRef.current = false;
        }, 0);
        return;
      }
      if (namespaceGestureState.kind !== "creating") return;
      event.preventDefault();
      event.stopPropagation();
      namespaceStartPointRef.current = null;
      const classIds = [...namespaceGeometry.pendingClassIds];
      const namespaceIds = [...namespaceGeometry.pendingNamespaceIds];
      if (classIds.length + namespaceIds.length === 0) {
        callbacks.onNamespaceCreateCommitted(null);
        return;
      }
      const result = dispatchTransaction(toNamespaceCreateTransaction({ classIds, namespaceIds }));
      callbacks.onNamespaceCreateCommitted(result);
    },
    [
      callbacks,
      classContentHeightById,
      classResizePointerStateRef,
      dispatchTransaction,
      namespaceGeometry,
      namespaceGestureState,
      namespaceResizePointerStateRef,
      namespaceStartPointRef,
      noteResizePointerStateRef,
      noteContentHeightById,
      onNoteResizeEnd,
      screenToFlowPosition,
      setSurfaceResizeActive,
      view,
    ]
  );

  // Framework prop and event adaptation
  const onPaneClick = useCallback(
    (event: ReactMouseEvent) => {
      if (suppressPaneClickRef.current) {
        suppressPaneClickRef.current = false;
        return;
      }
      if (event.target !== event.currentTarget) return;
      if (noteAttachState.kind === "attaching") {
        callbacks.onNoteAttachCancel();
        return;
      }
      callbacks.onBackgroundClick();
    },
    [callbacks, noteAttachState.kind]
  );

  return {
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
  };
}

// TODO(reconnect-trace): remove this dev-only logger after the reconnect
// investigation. Keep the prefix stable so traces can be filtered as one stream.
function traceReconnect(transition: string, details: Record<string, unknown> = {}): void {
  if ((globalThis as typeof globalThis & { SHINY_TRACE?: boolean }).SHINY_TRACE !== true) return;
  // eslint-disable-next-line no-console
  console.debug("SHINY_RECONNECT_TRACE", {
    timestampMs: Math.round(performance.now() * 100) / 100,
    transition,
    ...details,
  });
}

function describeEventTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const classes = [...target.classList].slice(0, 4).join(".");
  return `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ""}${
    classes ? `.${classes}` : ""
  }`;
}

// Private helpers
function resizeClampedRect(
  rect: Rect,
  handle: NamespaceResizeHandle,
  delta: Point,
  minWidth: number,
  minHeight: number
): Rect {
  let left = handle.includes("w") ? rect.x + delta.x : rect.x;
  let right = handle.includes("e") ? rect.x + rect.w + delta.x : rect.x + rect.w;
  let top = handle.includes("n") ? rect.y + delta.y : rect.y;
  let bottom = handle.includes("s") ? rect.y + rect.h + delta.y : rect.y + rect.h;

  if (right - left < minWidth) {
    if (handle.includes("w")) {
      left = right - minWidth;
    } else {
      right = left + minWidth;
    }
  }
  if (bottom - top < minHeight) {
    if (handle.includes("n")) {
      top = bottom - minHeight;
    } else {
      bottom = top + minHeight;
    }
  }

  return {
    x: Math.round(left),
    y: Math.round(top),
    w: Math.round(right - left),
    h: Math.round(bottom - top),
  };
}

function resizeNamespaceRect(rect: Rect, handle: NamespaceResizeHandle, delta: Point): Rect {
  const left = handle.includes("w") ? rect.x + delta.x : rect.x;
  const right = handle.includes("e") ? rect.x + rect.w + delta.x : rect.x + rect.w;
  const top = handle.includes("n") ? rect.y + delta.y : rect.y;
  const bottom = handle.includes("s") ? rect.y + rect.h + delta.y : rect.y + rect.h;
  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    w: Math.abs(right - left),
    h: Math.abs(bottom - top),
  };
}

function toDroppedClassParentNamespaceId(
  rect: Rect,
  boundsByNamespaceId: ReadonlyMap<NamespaceId, Rect>
): NamespaceId | null {
  const candidates = [...boundsByNamespaceId.entries()]
    .map(([namespaceId, bounds]) => ({
      namespaceId,
      area: overlapArea(rect, bounds),
    }))
    .filter((candidate) => candidate.area > 0)
    .sort((left, right) => right.area - left.area);
  return candidates[0]?.namespaceId ?? null;
}

function toDroppedNamespaceParentNamespaceId(
  rect: Rect,
  namespaceId: NamespaceId,
  view: Pick<DiagramView, "namespaces">,
  boundsByNamespaceId: ReadonlyMap<NamespaceId, Rect>
): NamespaceId | null {
  const excluded = new Set([
    namespaceId,
    ...toDescendantNamespaceIds(namespaceId, view.namespaces),
  ]);
  const candidates = [...boundsByNamespaceId.entries()]
    .filter(([candidateId]) => !excluded.has(candidateId))
    .map(([candidateId, bounds]) => ({
      namespaceId: candidateId,
      area: overlapArea(rect, bounds),
    }))
    .filter((candidate) => candidate.area > 0)
    .sort((left, right) => right.area - left.area);
  return candidates[0]?.namespaceId ?? null;
}

function toDescendantNamespaceIds(
  namespaceId: NamespaceId,
  namespaces: readonly {
    readonly namespaceId: NamespaceId;
    readonly childNamespaceIds: readonly NamespaceId[];
  }[]
): readonly NamespaceId[] {
  const namespaceView = namespaces.find((candidate) => candidate.namespaceId === namespaceId);
  if (!namespaceView) return [];
  return namespaceView.childNamespaceIds.flatMap((childNamespaceId) => [
    childNamespaceId,
    ...toDescendantNamespaceIds(childNamespaceId, namespaces),
  ]);
}

function overlapArea(left: Rect, right: Rect): number {
  if (!overlaps(left, right)) return 0;
  const x = Math.max(0, Math.min(left.x + left.w, right.x + right.w) - Math.max(left.x, right.x));
  const y = Math.max(0, Math.min(left.y + left.h, right.y + right.h) - Math.max(left.y, right.y));
  return x * y;
}

function toReconnectRelationshipSeed(
  relationshipView: RelationshipView,
  stationaryHandleType: "source" | "target"
): RelationshipSeed {
  const seed = toRelationshipSeed(relationshipView);
  return stationaryHandleType === "source" ? seed : toReversedRelationshipSeed(seed);
}

function toRelationshipSeed(relationshipView: RelationshipView): RelationshipSeed {
  return {
    sourceEndpointKind: relationshipView.sourceEndpointKind,
    targetEndpointKind: relationshipView.targetEndpointKind,
    lineKind: relationshipView.lineKind,
    sourceMultiplicity: relationshipView.sourceMultiplicity ?? null,
    targetMultiplicity: relationshipView.targetMultiplicity ?? null,
    label: relationshipView.label ?? null,
  };
}

function toReversedRelationshipSeed(seed: RelationshipSeed): RelationshipSeed {
  return {
    sourceEndpointKind: seed.targetEndpointKind,
    targetEndpointKind: seed.sourceEndpointKind,
    lineKind: seed.lineKind,
    sourceMultiplicity: seed.targetMultiplicity,
    targetMultiplicity: seed.sourceMultiplicity,
    label: seed.label,
  };
}

function toScreenPoint(event: MouseEvent | TouchEvent): XYPosition | null {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  return { x: event.clientX, y: event.clientY };
}

function normalizeRect(first: Point, second: Point): Rect {
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  return { x, y, w: Math.abs(second.x - first.x), h: Math.abs(second.y - first.y) };
}
