/**
 * @behavior Missing annotations generation transaction derivation.
 */

import type { EditorCommandTransaction } from "../commands/editorCommands";
import { generateSpatialAssignments, type LayoutInput } from "../utils/layoutAlgorithm";
import type { DiagramView, UnpositionedClassView } from "../views/schema";

// Implementing interaction through command transaction
export function toMissingAnnotationsGenerateTransaction(
  diagram: DiagramView,
  missingClasses: readonly UnpositionedClassView[]
): EditorCommandTransaction {
  const input: LayoutInput = {
    direction: diagram.direction,
    classes: [
      ...diagram.classes.map((item) => ({
        id: item.classId,
        parentNamespaceId: item.parentNamespaceId,
        headerTexts: [item.header.name, item.header.label, item.header.stereotype ?? ""],
        members: item.members.map(({ kind, text }) => ({ kind, text })),
        bounds: item.bounds,
      })),
      ...missingClasses.map((item) => ({
        id: item.classId,
        parentNamespaceId: item.parentNamespaceId,
        headerTexts: [item.header.name, item.header.label, item.header.stereotype ?? ""],
        members: item.members.map(({ kind, text }) => ({ kind, text })),
        bounds: null,
      })),
    ],
    namespaces: diagram.namespaces.map((item) => ({
      id: item.namespaceId,
      parentNamespaceId: item.parentNamespaceId,
      memberClassIds: item.memberClassIds,
      childNamespaceIds: item.childNamespaceIds,
    })),
    relationships: diagram.relationships.map((item) => ({
      id: item.relationshipId,
      sourceClassId: item.sourceClassId,
      targetClassId: item.targetClassId,
      sourceEndpointKind: item.sourceEndpointKind,
      targetEndpointKind: item.targetEndpointKind,
    })),
    notes: diagram.notes.map((item) => ({
      id: item.noteId,
      text: item.text,
      attachedToClassId: item.attachedToClassId,
      bounds: item.bounds,
    })),
    missingClassIds: missingClasses.map((item) => item.classId),
  };

  return generateSpatialAssignments(input).map((assignment) => {
    const spatial = {
      position: { x: assignment.bounds.x, y: assignment.bounds.y },
      size: { width: assignment.bounds.w, height: assignment.bounds.h },
    };
    return assignment.kind === "class"
      ? { type: "class.spatial.set", classId: assignment.classId, spatial }
      : { type: "note.spatial.set", noteId: assignment.noteId, spatial };
  });
}
