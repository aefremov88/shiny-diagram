import type { NamespaceId } from "../../../../shared/ids";
import type { Rect } from "../../../../shared/geometry";
import type { LayoutInput, SpatialAssignment } from "../layoutContracts";
import { estimateClassSize, estimateNoteSize } from "../sizeEstimation";
import { runDagre, type DagreEdgeInput, type DagreNodeInput } from "./dagreAdapter";
import { liftRelationshipEdges } from "./edgeLifting";
import { NAMESPACE_MARGIN } from "../../../config/editorUiConfig";

type NamespaceLayout = {
  readonly width: number;
  readonly height: number;
  readonly classes: Map<string, Rect>;
};

export function fullLayout(input: LayoutInput): readonly SpatialAssignment[] {
  if (input.classes.length === 0 && input.notes.length === 0) return [];
  const namespaceLayouts = new Map<NamespaceId, NamespaceLayout>();
  const namespaces = new Map(input.namespaces.map((item) => [item.id, item]));

  const layoutNamespace = (id: NamespaceId): NamespaceLayout => {
    const namespace = namespaces.get(id);
    if (!namespace) return { width: 0, height: 0, classes: new Map() };
    namespace.childNamespaceIds.forEach((childId) => {
      if (!namespaceLayouts.has(childId)) namespaceLayouts.set(childId, layoutNamespace(childId));
    });
    const directClasses = input.classes.filter((item) => item.parentNamespaceId === id);
    const nodes: DagreNodeInput[] = [
      ...directClasses.map((item) => ({
        id: item.id,
        width: estimateClassSize(item).w,
        height: estimateClassSize(item).h,
      })),
      ...namespace.childNamespaceIds.map((childId) => {
        const child = required(namespaceLayouts.get(childId), `namespace layout ${childId}`);
        return { id: childId, width: child.width, height: child.height };
      }),
    ];
    const result = runDagre(input.direction, nodes, liftRelationshipEdges(input, id), {
      x: NAMESPACE_MARGIN,
      y: NAMESPACE_MARGIN,
    });
    const classes = new Map<string, Rect>();
    directClasses.forEach((item) =>
      classes.set(item.id, required(result.nodes.get(item.id), `class node ${item.id}`))
    );
    namespace.childNamespaceIds.forEach((childId) => {
      const offset = required(result.nodes.get(childId), `namespace node ${childId}`);
      required(namespaceLayouts.get(childId), `namespace layout ${childId}`).classes.forEach(
        (rect, classId) =>
          classes.set(classId, { ...rect, x: rect.x + offset.x, y: rect.y + offset.y })
      );
    });
    return { width: result.width, height: result.height, classes };
  };

  input.namespaces.forEach((item) => {
    if (!namespaceLayouts.has(item.id)) namespaceLayouts.set(item.id, layoutNamespace(item.id));
  });
  const topClasses = input.classes.filter((item) => item.parentNamespaceId === null);
  const topNamespaces = input.namespaces.filter((item) => item.parentNamespaceId === null);
  const nodes: DagreNodeInput[] = [
    ...topClasses.map((item) => ({
      id: item.id,
      width: estimateClassSize(item).w,
      height: estimateClassSize(item).h,
    })),
    ...topNamespaces.map((item) => {
      const layout = required(namespaceLayouts.get(item.id), `namespace layout ${item.id}`);
      return { id: item.id, width: layout.width, height: layout.height };
    }),
    ...input.notes.map((note) => ({
      id: note.id,
      width: estimateNoteSize(note).w,
      height: estimateNoteSize(note).h,
    })),
  ];
  const edges: DagreEdgeInput[] = [...liftRelationshipEdges(input, null)];
  input.notes.forEach((note) => {
    if (!note.attachedToClassId) return;
    const target = rootRepresentative(note.attachedToClassId, input);
    edges.push({
      id: `note:${note.id}`,
      sourceId: note.id,
      targetId: target,
      weight: 1,
      minlen: 1,
    });
  });
  const root = runDagre(input.direction, nodes, edges);
  const assignments: SpatialAssignment[] = [];
  topClasses.forEach((item) =>
    assignments.push({
      kind: "class",
      classId: item.id,
      bounds: required(root.nodes.get(item.id), `class node ${item.id}`),
    })
  );
  topNamespaces.forEach((item) => {
    const offset = required(root.nodes.get(item.id), `namespace node ${item.id}`);
    required(namespaceLayouts.get(item.id), `namespace layout ${item.id}`).classes.forEach(
      (rect, classId) =>
        assignments.push({
          kind: "class",
          classId: classId as (typeof item.memberClassIds)[number],
          bounds: { ...rect, x: rect.x + offset.x, y: rect.y + offset.y },
        })
    );
  });
  input.notes.forEach((note) =>
    assignments.push({
      kind: "note",
      noteId: note.id,
      bounds: required(root.nodes.get(note.id), `note node ${note.id}`),
    })
  );
  return assignments;
}

function rootRepresentative(classId: string, input: LayoutInput): string {
  const item = input.classes.find((candidate) => candidate.id === classId);
  if (!item?.parentNamespaceId) return classId;
  const namespaces = new Map(input.namespaces.map((namespace) => [namespace.id, namespace]));
  let current = item.parentNamespaceId;
  let parent = namespaces.get(current)?.parentNamespaceId ?? null;
  while (parent !== null) {
    current = parent;
    parent = namespaces.get(current)?.parentNamespaceId ?? null;
  }
  return current;
}

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}
