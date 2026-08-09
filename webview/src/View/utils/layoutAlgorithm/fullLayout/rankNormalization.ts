import type { LayoutInput } from "../layoutContracts";

const MARKED = new Set(["triangle", "composition", "aggregation"]);

export function normalizeRelationship(
  relationship: LayoutInput["relationships"][number]
): { readonly sourceId: string; readonly targetId: string } | null {
  if (
    relationship.sourceClassId === relationship.targetClassId ||
    relationship.sourceEndpointKind === "lollipop" ||
    relationship.targetEndpointKind === "lollipop"
  )
    return null;
  const sourceMarked = MARKED.has(relationship.sourceEndpointKind);
  const targetMarked = MARKED.has(relationship.targetEndpointKind);
  if (sourceMarked !== targetMarked) {
    return sourceMarked
      ? { sourceId: relationship.sourceClassId, targetId: relationship.targetClassId }
      : { sourceId: relationship.targetClassId, targetId: relationship.sourceClassId };
  }
  return { sourceId: relationship.sourceClassId, targetId: relationship.targetClassId };
}
