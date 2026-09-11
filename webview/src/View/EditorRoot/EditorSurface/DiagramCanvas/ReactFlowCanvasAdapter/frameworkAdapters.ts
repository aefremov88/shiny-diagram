/**
 * @framework View diagram canvas props and React Flow event payloads to adapter boundary values.
 */

import type {
  Connection,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  NodeChange as ReactFlowNodeChange,
} from "@xyflow/react";
import type { Point, Rect } from "../../../../../shared/geometry";
import type { ClassId, NamespaceId, NoteId, RelationshipId } from "../../../../../shared/ids";
import { toClassId } from "../../../../../shared/ids";
import type {
  ClassBoxPlacementState,
  EditingState,
  NamespaceGestureState,
  NoteAttachState,
  NoteBoxPlacementState,
  SelectionState,
} from "../../../../state/editorStates";
import type {
  ClassView,
  DiagramView,
  NamespaceView,
  NoteView,
  RelationshipView,
} from "../../../../views/schema";
import type { TransactionResult } from "../../../../commands/editorCommands";
import {
  CLASS_NODE_Z_INDEX,
  NAMESPACE_MARGIN,
  NAMESPACE_NODE_Z_INDEX,
  NOTE_NODE_Z_INDEX,
  RELATIONSHIP_EDGE_Z_INDEX,
} from "../../../../config/editorUiConfig";

export type ClassBoxNodeData = {
  readonly view: ClassView;
  readonly bounds: Rect;
  readonly isSelected: boolean;
  readonly isResizeVisible: boolean;
  readonly isConnectSourceEnabled: boolean;
  readonly isPendingMember: boolean;
  readonly haloColor: string | null;
  readonly haloTone: "canvas" | "faint" | null;
  readonly onClassSelect: (classId: ClassId, additive: boolean) => void;
  readonly onClassResizeHandlePress: (
    classId: ClassId,
    bounds: Rect,
    handle: NamespaceResizeHandle,
    screenPoint: Point
  ) => void;
  readonly editingState: EditingState;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onContentHeightChange: (classId: ClassId, height: number) => void;
};

export type ClassBoxNodeDescriptor = ReactFlowNode<ClassBoxNodeData, "classBox">;
export type NamespaceNodeData = {
  readonly view: NamespaceView;
  readonly bounds: Rect;
  readonly isSelected: boolean;
  readonly isPendingMember: boolean;
  readonly onNamespaceSelect: (namespaceId: NamespaceId) => void;
  readonly onNamespaceResizeHandlePress: (
    namespaceId: NamespaceId,
    bounds: Rect,
    handle: NamespaceResizeHandle,
    screenPoint: Point
  ) => void;
  readonly editingState: EditingState;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onNamespaceRenameCommitted: (
    result: TransactionResult,
    previousNamespaceId: NamespaceId
  ) => void;
};

export type NamespaceNodeDescriptor = ReactFlowNode<NamespaceNodeData, "namespaceBox">;
export type NamespaceResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type NoteBoxNodeData = {
  readonly view: NoteView;
  readonly bounds: Rect;
  readonly isSelected: boolean;
  readonly isResizeVisible: boolean;
  readonly editingState: EditingState;
  readonly onNoteSelect: (noteId: NoteView["noteId"]) => void;
  readonly onNoteResizeEnd: (change: NoteBoxPlacementChange) => void;
  readonly onNoteResizeHandlePress: (
    noteId: NoteView["noteId"],
    bounds: Rect,
    handle: NamespaceResizeHandle,
    screenPoint: Point
  ) => void;
  readonly onTextBlockEditStart: (
    editingState: Exclude<EditingState, { readonly kind: "none" }>
  ) => void;
  readonly onTextBlockEditCancel: () => void;
  readonly onContentHeightChange: (noteId: NoteId, height: number) => void;
};

export type NoteBoxNodeDescriptor = ReactFlowNode<NoteBoxNodeData, "noteBox">;

export type RelationshipEdgeData = {
  readonly view: RelationshipView;
  readonly isSelected: boolean;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
};

export type RelationshipEdgeDescriptor = ReactFlowEdge<RelationshipEdgeData, "relationship">;

export type NoteAttachmentEdgeData = {
  readonly isActive: boolean;
};

export type NoteAttachmentEdgeDescriptor = ReactFlowEdge<NoteAttachmentEdgeData, "noteAttachment">;

export type ClassBoxPlacementChange = {
  readonly classId: ClassId;
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
};

export type NoteBoxPlacementChange = {
  readonly noteId: NoteView["noteId"];
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
};

export type NamespaceDragState = {
  readonly namespaceId: NamespaceId;
  readonly delta: Point;
};

export type RelationshipConnection = {
  readonly sourceClassId: ClassId;
  readonly targetClassId: ClassId;
};

export type RelationshipReconnect = {
  readonly relationshipId: RelationshipId;
  readonly end: "source" | "target";
  readonly newClassId: ClassId;
};

// Framework prop and event adaptation
export function toClassBoxNodeDescriptors(
  classes: readonly ClassView[],
  selectedClassIds: readonly ClassId[],
  classBoxPlacementState: ClassBoxPlacementState,
  namespaceGeometry: NamespaceGeometry,
  isConnectSourceEnabled: boolean,
  onClassSelect: (classId: ClassId, additive: boolean) => void,
  onClassResizeHandlePress: ClassBoxNodeData["onClassResizeHandlePress"],
  editingState: EditingState,
  onTextBlockEditStart: (editingState: Exclude<EditingState, { readonly kind: "none" }>) => void,
  onTextBlockEditCancel: () => void,
  onContentHeightChange: ClassBoxNodeData["onContentHeightChange"]
): ClassBoxNodeDescriptor[] {
  const selected = new Set<ClassId>(selectedClassIds);
  return classes.flatMap((classView) => {
    const placement = classBoxPlacementState.rectByClassId.get(classView.classId);
    if (!placement) return [];

    return [
      {
        id: classView.classId,
        type: "classBox" as const,
        position: { x: placement.x, y: placement.y },
        data: {
          view: classView,
          bounds: placement,
          isSelected: selected.has(classView.classId),
          isResizeVisible: selected.size === 1 && selected.has(classView.classId),
          isConnectSourceEnabled,
          isPendingMember: namespaceGeometry.pendingClassIds.has(classView.classId),
          haloColor: namespaceGeometry.haloColorByClassId.get(classView.classId) ?? null,
          haloTone: namespaceGeometry.haloToneByClassId.get(classView.classId) ?? null,
          onClassSelect,
          onClassResizeHandlePress,
          editingState,
          onTextBlockEditStart,
          onTextBlockEditCancel,
          onContentHeightChange,
        },
        selectable: false,
        focusable: false,
        zIndex: CLASS_NODE_Z_INDEX,
        width: placement.w,
        height: placement.h,
        style: {
          width: placement.w,
          height: placement.h,
          overflow: "visible",
          // Inline editors remain clickable when React Flow disables dragging.
          ...(editingState.kind === "none" ? {} : { pointerEvents: "auto" as const }),
        },
      },
    ];
  });
}

export function toNamespaceDragClassBoxPlacementState(
  view: Pick<DiagramView, "classes" | "namespaces">,
  classBoxPlacementState: ClassBoxPlacementState,
  namespaceDragState: NamespaceDragState | null
): ClassBoxPlacementState {
  if (!namespaceDragState) return classBoxPlacementState;
  const memberClassIds = new Set(
    toTransitiveMemberClassIds(namespaceDragState.namespaceId, view.namespaces)
  );
  if (memberClassIds.size === 0) return classBoxPlacementState;

  const rectByClassId = new Map(classBoxPlacementState.rectByClassId);
  for (const classId of memberClassIds) {
    const rect = rectByClassId.get(classId);
    if (!rect) continue;
    rectByClassId.set(classId, {
      ...rect,
      x: rect.x + namespaceDragState.delta.x,
      y: rect.y + namespaceDragState.delta.y,
    });
  }
  return { rectByClassId };
}

export function toNamespaceDragBoundsState(
  boundsByNamespaceId: ReadonlyMap<NamespaceId, Rect>,
  namespaces: readonly NamespaceView[],
  namespaceDragState: NamespaceDragState
): ReadonlyMap<NamespaceId, Rect> {
  const movedNamespaceIds = new Set([
    namespaceDragState.namespaceId,
    ...toDescendantNamespaceIds(namespaceDragState.namespaceId, namespaces),
  ]);
  const next = new Map(boundsByNamespaceId);
  for (const namespaceId of movedNamespaceIds) {
    const bounds = next.get(namespaceId);
    if (!bounds) continue;
    next.set(namespaceId, {
      ...bounds,
      x: bounds.x + namespaceDragState.delta.x,
      y: bounds.y + namespaceDragState.delta.y,
    });
  }
  return next;
}

export type NamespaceGeometry = {
  readonly boundsByNamespaceId: ReadonlyMap<NamespaceId, Rect>;
  readonly pendingClassIds: ReadonlySet<ClassId>;
  readonly pendingNamespaceIds: ReadonlySet<NamespaceId>;
  readonly haloColorByClassId: ReadonlyMap<ClassId, string>;
  readonly haloToneByClassId: ReadonlyMap<ClassId, "canvas" | "faint">;
  readonly pendingParentNamespaceId: NamespaceId | null;
};

export function toNamespaceGeometry(
  view: Pick<DiagramView, "classes" | "namespaces">,
  classBoxPlacementState: ClassBoxPlacementState,
  namespaceGestureState: NamespaceGestureState
): NamespaceGeometry {
  const boundsByNamespaceId = new Map(toNamespaceBounds(view.namespaces, classBoxPlacementState));
  const gestureRect =
    namespaceGestureState.kind === "creating" || namespaceGestureState.kind === "resizing"
      ? namespaceGestureState.rect
      : null;
  const pendingClassIds = new Set<ClassId>();
  const pendingNamespaceIds = new Set<NamespaceId>();
  if (
    gestureRect &&
    gestureRect.w > 0 &&
    gestureRect.h > 0 &&
    namespaceGestureState.kind === "creating"
  ) {
    for (const classView of view.classes) {
      const rect = classBoxPlacementState.rectByClassId.get(classView.classId);
      if (classView.parentNamespaceId === null && rect && overlaps(gestureRect, rect)) {
        pendingClassIds.add(classView.classId);
      }
    }
    for (const namespaceView of view.namespaces) {
      const rect = boundsByNamespaceId.get(namespaceView.namespaceId);
      if (namespaceView.parentNamespaceId === null && rect && overlaps(gestureRect, rect)) {
        pendingNamespaceIds.add(namespaceView.namespaceId);
      }
    }
  }
  if (
    gestureRect &&
    gestureRect.w > 0 &&
    gestureRect.h > 0 &&
    namespaceGestureState.kind === "resizing"
  ) {
    const namespaceView = view.namespaces.find(
      (candidate) => candidate.namespaceId === namespaceGestureState.namespaceId
    );
    if (namespaceView) {
      for (const classId of namespaceView.memberClassIds) {
        const rect = classBoxPlacementState.rectByClassId.get(classId);
        if (rect && overlaps(gestureRect, rect)) pendingClassIds.add(classId);
      }
      for (const namespaceId of namespaceView.childNamespaceIds) {
        const rect = boundsByNamespaceId.get(namespaceId);
        if (rect && overlaps(gestureRect, rect)) pendingNamespaceIds.add(namespaceId);
      }
      for (const classView of view.classes) {
        const rect = classBoxPlacementState.rectByClassId.get(classView.classId);
        if (classView.parentNamespaceId === null && rect && overlaps(gestureRect, rect)) {
          pendingClassIds.add(classView.classId);
        }
      }
      for (const candidate of view.namespaces) {
        const rect = boundsByNamespaceId.get(candidate.namespaceId);
        if (
          candidate.parentNamespaceId === null &&
          candidate.namespaceId !== namespaceView.namespaceId &&
          rect &&
          overlaps(gestureRect, rect)
        ) {
          pendingNamespaceIds.add(candidate.namespaceId);
        }
      }
      boundsByNamespaceId.set(namespaceView.namespaceId, gestureRect);
    }
  }
  return {
    boundsByNamespaceId,
    pendingClassIds,
    pendingNamespaceIds,
    ...toHaloTreatmentByClassId(view, classBoxPlacementState, boundsByNamespaceId),
    pendingParentNamespaceId: null,
  };
}

export function toNamespaceNodeDescriptors(
  namespaces: readonly NamespaceView[],
  namespaceGeometry: NamespaceGeometry,
  selectionState: SelectionState,
  onNamespaceSelect: (namespaceId: NamespaceId) => void,
  onNamespaceResizeHandlePress: NamespaceNodeData["onNamespaceResizeHandlePress"],
  editingState: EditingState,
  onTextBlockEditStart: NamespaceNodeData["onTextBlockEditStart"],
  onTextBlockEditCancel: () => void,
  onNamespaceRenameCommitted: NamespaceNodeData["onNamespaceRenameCommitted"]
): NamespaceNodeDescriptor[] {
  return namespaces.flatMap((namespaceView) => {
    const bounds = namespaceGeometry.boundsByNamespaceId.get(namespaceView.namespaceId);
    if (!bounds) return [];
    return [
      {
        id: `namespace:${namespaceView.namespaceId}`,
        type: "namespaceBox" as const,
        position: { x: bounds.x, y: bounds.y },
        data: {
          view: namespaceView,
          bounds,
          isSelected:
            selectionState.kind === "namespace" &&
            selectionState.namespaceId === namespaceView.namespaceId,
          isPendingMember: namespaceGeometry.pendingNamespaceIds.has(namespaceView.namespaceId),
          onNamespaceSelect,
          onNamespaceResizeHandlePress,
          editingState,
          onTextBlockEditStart,
          onTextBlockEditCancel,
          onNamespaceRenameCommitted,
        },
        selectable: false,
        focusable: false,
        draggable: true,
        zIndex: NAMESPACE_NODE_Z_INDEX,
        width: bounds.w,
        height: bounds.h,
        style: { width: bounds.w, height: bounds.h, pointerEvents: "auto" },
      },
    ];
  });
}

// Framework prop and event adaptation
export function toNoteBoxNodeDescriptors(
  notes: readonly NoteView[],
  selectionState: SelectionState,
  editingState: EditingState,
  noteBoxPlacementState: NoteBoxPlacementState,
  onNoteSelect: (noteId: NoteView["noteId"]) => void,
  onNoteResizeEnd: (change: NoteBoxPlacementChange) => void,
  onNoteResizeHandlePress: NoteBoxNodeData["onNoteResizeHandlePress"],
  onTextBlockEditStart: (editingState: Exclude<EditingState, { readonly kind: "none" }>) => void,
  onTextBlockEditCancel: () => void,
  onContentHeightChange: NoteBoxNodeData["onContentHeightChange"]
): NoteBoxNodeDescriptor[] {
  return notes.flatMap((noteView) => {
    const placement = noteBoxPlacementState.rectByNoteId.get(noteView.noteId);
    if (!placement) return [];
    const isSelected = selectionState.kind === "note" && selectionState.noteId === noteView.noteId;
    return [
      {
        id: noteView.noteId,
        type: "noteBox" as const,
        position: { x: placement.x, y: placement.y },
        data: {
          view: noteView,
          bounds: placement,
          isSelected,
          isResizeVisible: isSelected,
          editingState,
          onNoteSelect,
          onNoteResizeEnd,
          onNoteResizeHandlePress,
          onTextBlockEditStart,
          onTextBlockEditCancel,
          onContentHeightChange,
        },
        selectable: false,
        focusable: false,
        zIndex: NOTE_NODE_Z_INDEX,
        width: placement.w,
        height: placement.h,
        style: {
          width: placement.w,
          height: placement.h,
          overflow: "visible",
          pointerEvents: "auto",
        },
      },
    ];
  });
}

// Framework command adaptation
export function toRelationshipConnection(connection: Connection): RelationshipConnection | null {
  return connection.source && connection.target
    ? {
        sourceClassId: toClassId(connection.source),
        targetClassId: toClassId(connection.target),
      }
    : null;
}

// Framework command adaptation
export function toRelationshipReconnect(
  oldEdge: RelationshipEdgeDescriptor,
  newConnection: Connection
): RelationshipReconnect | null {
  const relationshipView = oldEdge.data?.view;
  if (!relationshipView || !newConnection.source || !newConnection.target) return null;

  const sourceChanged = relationshipView.sourceClassId !== newConnection.source;
  const targetChanged = relationshipView.targetClassId !== newConnection.target;
  if (sourceChanged === targetChanged) return null;

  return sourceChanged
    ? {
        relationshipId: relationshipView.relationshipId,
        end: "source",
        newClassId: toClassId(newConnection.source),
      }
    : {
        relationshipId: relationshipView.relationshipId,
        end: "target",
        newClassId: toClassId(newConnection.target),
      };
}

// Framework prop and event adaptation
export function toRelationshipEdgeDescriptors(
  classes: readonly ClassView[],
  relationships: readonly RelationshipView[],
  selectionState: SelectionState,
  classBoxPlacementState: ClassBoxPlacementState,
  isRelationshipPlacementArmed: boolean,
  onRelationshipSelect: (relationshipId: RelationshipId) => void
): RelationshipEdgeDescriptor[] {
  const classesById = new Map(
    classes.flatMap((classView) => {
      const placement = classBoxPlacementState.rectByClassId.get(classView.classId);
      if (!placement) return [];
      return [[classView.classId, placement] as const];
    })
  );

  return relationships.flatMap((rel) => {
    const sourceEntry = classesById.get(rel.sourceClassId);
    const targetEntry = classesById.get(rel.targetClassId);
    if (!sourceEntry || !targetEntry) return [];

    const sourceSide = chooseSourceSide(sourceEntry, targetEntry);
    const targetSide = oppositeSide(sourceSide);
    const isSelected =
      selectionState.kind === "relationship" &&
      selectionState.relationshipId === rel.relationshipId;

    return [
      {
        id: rel.relationshipId,
        source: rel.sourceClassId,
        target: rel.targetClassId,
        sourceHandle: sourceSide,
        targetHandle: `target-${targetSide}`,
        data: {
          view: rel,
          isSelected,
          onRelationshipSelect,
        },
        type: "relationship",
        className: `shiny-reconnect-source-${sourceSide} shiny-reconnect-target-${targetSide}`,
        zIndex: RELATIONSHIP_EDGE_Z_INDEX,
        selected: isSelected,
        reconnectable: isSelected && !isRelationshipPlacementArmed,
        selectable: false,
        focusable: false,
      },
    ];
  });
}

// Framework prop and event adaptation
export function toNoteAttachmentEdgeDescriptors(
  notes: readonly NoteView[],
  classes: readonly ClassView[],
  classBoxPlacementState: ClassBoxPlacementState,
  noteBoxPlacementState: NoteBoxPlacementState,
  noteAttachState: NoteAttachState
): NoteAttachmentEdgeDescriptor[] {
  const classRects = new Map(
    classes.flatMap((classView) => {
      const placement = classBoxPlacementState.rectByClassId.get(classView.classId);
      return placement ? [[classView.classId, placement] as const] : [];
    })
  );
  return notes.flatMap((noteView) => {
    if (!noteView.attachedToClassId) return [];
    const noteRect = noteBoxPlacementState.rectByNoteId.get(noteView.noteId);
    const classRect = classRects.get(noteView.attachedToClassId);
    if (!noteRect || !classRect) return [];
    const sourceSide = chooseSourceSide(noteRect, classRect);
    const targetSide = oppositeSide(sourceSide);
    return [
      {
        id: `${noteView.noteId}->${noteView.attachedToClassId}`,
        source: noteView.noteId,
        target: noteView.attachedToClassId,
        sourceHandle: sourceSide,
        targetHandle: `target-${targetSide}`,
        data: {
          isActive:
            noteAttachState.kind === "attaching" && noteAttachState.noteId === noteView.noteId,
        },
        type: "noteAttachment",
        reconnectable: false,
        selectable: false,
        focusable: false,
      },
    ];
  });
}

// Framework prop and event adaptation
export function normalizePositionChanges(
  view: Pick<DiagramView, "classes">,
  rfNodes: ClassBoxNodeDescriptor[]
): ReadonlyArray<{ readonly classId: ClassId; readonly x: number; readonly y: number }> {
  const classIds = new Set(view.classes.map((c) => c.classId));
  return rfNodes.flatMap((node) => {
    if (node.type !== "classBox" || !classIds.has(node.data.view.classId)) return [];
    return [{ classId: node.data.view.classId, x: node.position.x, y: node.position.y }];
  });
}

// Framework prop and event adaptation
export function toClassBoxPlacementChanges(
  changes: readonly ReactFlowNodeChange<
    ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
  >[]
): ClassBoxPlacementChange[] {
  return changes.flatMap((change): ClassBoxPlacementChange[] => {
    switch (change.type) {
      case "position":
        if (change.id.startsWith("note:") || change.id.startsWith("namespace:")) return [];
        return change.position === undefined
          ? []
          : [{ classId: toClassId(change.id), x: change.position.x, y: change.position.y }];
      case "dimensions":
        if (change.id.startsWith("note:") || change.id.startsWith("namespace:")) return [];
        return change.dimensions === undefined
          ? []
          : [
              {
                classId: toClassId(change.id),
                w: change.dimensions.width,
                h: change.dimensions.height,
              },
            ];
      default:
        return [];
    }
  });
}

// Framework prop and event adaptation
export function toNoteBoxPlacementChanges(
  changes: readonly ReactFlowNodeChange<
    ClassBoxNodeDescriptor | NamespaceNodeDescriptor | NoteBoxNodeDescriptor
  >[]
): NoteBoxPlacementChange[] {
  return changes.flatMap((change): NoteBoxPlacementChange[] => {
    if (!("id" in change)) return [];
    if (!change.id.startsWith("note:")) return [];
    switch (change.type) {
      case "position":
        return change.position === undefined
          ? []
          : [
              {
                noteId: change.id as NoteView["noteId"],
                x: change.position.x,
                y: change.position.y,
              },
            ];
      case "dimensions":
        return change.dimensions === undefined
          ? []
          : [
              {
                noteId: change.id as NoteView["noteId"],
                w: change.dimensions.width,
                h: change.dimensions.height,
              },
            ];
      default:
        return [];
    }
  });
}

// Private helpers
type BoxSide = "top" | "right" | "bottom" | "left";

function chooseSourceSide(source: Rect, target: Rect): BoxSide {
  const sourceCenterX = source.x + source.w / 2;
  const sourceCenterY = source.y + source.h / 2;
  const targetCenterX = target.x + target.w / 2;
  const targetCenterY = target.y + target.h / 2;
  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function oppositeSide(side: BoxSide): BoxSide {
  switch (side) {
    case "top":
      return "bottom";
    case "right":
      return "left";
    case "bottom":
      return "top";
    case "left":
      return "right";
  }
}

function toNamespaceBounds(
  namespaces: readonly NamespaceView[],
  classBoxPlacementState: ClassBoxPlacementState
): ReadonlyMap<NamespaceId, Rect> {
  const byId = new Map(
    namespaces.map((namespaceView) => [namespaceView.namespaceId, namespaceView])
  );
  const bounds = new Map<NamespaceId, Rect>();
  for (const namespaceView of namespaces) {
    toNamespaceBoundsFor(namespaceView, byId, classBoxPlacementState, bounds);
  }
  return bounds;
}

function toTransitiveMemberClassIds(
  namespaceId: NamespaceId,
  namespaces: readonly NamespaceView[]
): readonly ClassId[] {
  const namespaceView = namespaces.find((candidate) => candidate.namespaceId === namespaceId);
  if (!namespaceView) return [];
  return [
    ...namespaceView.memberClassIds,
    ...namespaceView.childNamespaceIds.flatMap((childNamespaceId) =>
      toTransitiveMemberClassIds(childNamespaceId, namespaces)
    ),
  ];
}

function toDescendantNamespaceIds(
  namespaceId: NamespaceId,
  namespaces: readonly NamespaceView[]
): readonly NamespaceId[] {
  const namespaceView = namespaces.find((candidate) => candidate.namespaceId === namespaceId);
  if (!namespaceView) return [];
  return namespaceView.childNamespaceIds.flatMap((childNamespaceId) => [
    childNamespaceId,
    ...toDescendantNamespaceIds(childNamespaceId, namespaces),
  ]);
}

function toNamespaceBoundsFor(
  namespaceView: NamespaceView,
  namespacesById: ReadonlyMap<NamespaceId, NamespaceView>,
  classBoxPlacementState: ClassBoxPlacementState,
  boundsByNamespaceId: Map<NamespaceId, Rect>
): Rect | null {
  const existing = boundsByNamespaceId.get(namespaceView.namespaceId);
  if (existing) return existing;

  const childRects = [
    ...namespaceView.memberClassIds.flatMap((classId) => {
      const rect = classBoxPlacementState.rectByClassId.get(classId);
      return rect ? [rect] : [];
    }),
    ...namespaceView.childNamespaceIds.flatMap((namespaceId) => {
      const child = namespacesById.get(namespaceId);
      if (!child) return [];
      const rect = toNamespaceBoundsFor(
        child,
        namespacesById,
        classBoxPlacementState,
        boundsByNamespaceId
      );
      return rect ? [rect] : [];
    }),
  ];
  if (childRects.length === 0) return null;

  const bounds = expandRect(unionRects(childRects), NAMESPACE_MARGIN);
  boundsByNamespaceId.set(namespaceView.namespaceId, bounds);
  return bounds;
}

function unionRects(rects: readonly Rect[]): Rect {
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.w));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function expandRect(rect: Rect, margin: number): Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    w: rect.w + margin * 2,
    h: rect.h + margin * 2,
  };
}

export function overlaps(left: Rect, right: Rect): boolean {
  return (
    left.x <= right.x + right.w &&
    left.x + left.w >= right.x &&
    left.y <= right.y + right.h &&
    left.y + left.h >= right.y
  );
}

function toHaloTreatmentByClassId(
  view: Pick<DiagramView, "classes" | "namespaces">,
  classBoxPlacementState: ClassBoxPlacementState,
  boundsByNamespaceId: ReadonlyMap<NamespaceId, Rect>
): Pick<NamespaceGeometry, "haloColorByClassId" | "haloToneByClassId"> {
  const haloColors = new Map<ClassId, string>();
  const haloTones = new Map<ClassId, "canvas" | "faint">();
  for (const classView of view.classes) {
    const rect = classBoxPlacementState.rectByClassId.get(classView.classId);
    if (!rect) continue;
    const containingNamespace = view.namespaces.find((namespaceView) => {
      const bounds = boundsByNamespaceId.get(namespaceView.namespaceId);
      return bounds ? overlaps(bounds, rect) : false;
    });
    if (!containingNamespace) continue;
    if (
      isClassTransitiveMember(classView.classId, containingNamespace, view.namespaces, view.classes)
    ) {
      continue;
    }
    const parent = classView.parentNamespaceId
      ? view.namespaces.find(
          (namespaceView) => namespaceView.namespaceId === classView.parentNamespaceId
        )
      : null;
    if (parent?.style?.fill) haloColors.set(classView.classId, parent.style.fill);
    else haloTones.set(classView.classId, classView.parentNamespaceId ? "faint" : "canvas");
  }
  return { haloColorByClassId: haloColors, haloToneByClassId: haloTones };
}

function isClassTransitiveMember(
  classId: ClassId,
  namespaceView: NamespaceView,
  namespaces: readonly NamespaceView[],
  classes: readonly ClassView[]
): boolean {
  const classView = classes.find((candidate) => candidate.classId === classId);
  let namespaceId = classView?.parentNamespaceId ?? null;
  while (namespaceId) {
    if (namespaceId === namespaceView.namespaceId) return true;
    namespaceId =
      namespaces.find((candidate) => candidate.namespaceId === namespaceId)?.parentNamespaceId ??
      null;
  }
  return false;
}
