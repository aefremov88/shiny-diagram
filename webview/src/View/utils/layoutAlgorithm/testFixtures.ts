import { toClassId, toNamespaceId, toNoteId, toRelationshipId } from "../../../shared/ids";
import type { LayoutInput } from "./layoutContracts";

export const classId = toClassId;
export const namespaceId = toNamespaceId;
export const noteId = toNoteId;
export const relationshipId = toRelationshipId;

export function layoutClass(
  id: string,
  parentNamespaceId: string | null = null,
  bounds: LayoutInput["classes"][number]["bounds"] = null
): LayoutInput["classes"][number] {
  return {
    id: classId(id),
    parentNamespaceId: parentNamespaceId ? namespaceId(parentNamespaceId) : null,
    headerTexts: [id],
    members: [],
    bounds,
  };
}

export function emptyInput(overrides: Partial<LayoutInput> = {}): LayoutInput {
  return {
    direction: "TB",
    classes: [],
    namespaces: [],
    relationships: [],
    notes: [],
    missingClassIds: [],
    ...overrides,
  };
}
