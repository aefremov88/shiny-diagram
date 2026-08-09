import type { NamespaceId } from "../../../../shared/ids";
import type { LayoutInput } from "../layoutContracts";
import { normalizeRelationship } from "./rankNormalization";

export type LiftedEdge = {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
  readonly minlen: number;
};

export function liftRelationshipEdges(
  input: LayoutInput,
  level: NamespaceId | null
): readonly LiftedEdge[] {
  const classes = new Map(input.classes.map((item) => [item.id, item]));
  const namespaces = new Map(input.namespaces.map((item) => [item.id, item]));
  const groups = new Map<
    string,
    { directions: Map<string, number>; first: string; count: number }
  >();

  input.relationships.forEach((relationship) => {
    const normalized = normalizeRelationship(relationship);
    if (!normalized) return;
    const sourceClass = classes.get(normalized.sourceId as never);
    const targetClass = classes.get(normalized.targetId as never);
    if (!sourceClass || !targetClass) return;
    if (
      lowestCommonAncestor(
        sourceClass.parentNamespaceId,
        targetClass.parentNamespaceId,
        namespaces
      ) !== level
    )
      return;
    const sourceId = representative(
      sourceClass.id,
      sourceClass.parentNamespaceId,
      level,
      namespaces
    );
    const targetId = representative(
      targetClass.id,
      targetClass.parentNamespaceId,
      level,
      namespaces
    );
    if (sourceId === targetId) return;
    const pair = [sourceId, targetId].sort().join("\u0000");
    const direction = `${sourceId}\u0000${targetId}`;
    const group = groups.get(pair) ?? { directions: new Map(), first: direction, count: 0 };
    group.directions.set(direction, (group.directions.get(direction) ?? 0) + 1);
    group.count += 1;
    groups.set(pair, group);
  });

  return [...groups.entries()].map(([pair, group]) => {
    const winner = [...group.directions.entries()].reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      [group.first, group.directions.get(group.first) ?? 0]
    )[0];
    const [sourceId, targetId] = winner.split("\u0000");
    return { id: pair, sourceId, targetId, weight: group.count, minlen: 1 };
  });
}

function lowestCommonAncestor(
  left: NamespaceId | null,
  right: NamespaceId | null,
  namespaces: ReadonlyMap<NamespaceId, LayoutInput["namespaces"][number]>
): NamespaceId | null {
  const ancestors = new Set<NamespaceId | null>(chain(left, namespaces));
  return chain(right, namespaces).find((id) => ancestors.has(id)) ?? null;
}

function chain(
  start: NamespaceId | null,
  namespaces: ReadonlyMap<NamespaceId, LayoutInput["namespaces"][number]>
): (NamespaceId | null)[] {
  const result: (NamespaceId | null)[] = [];
  let current = start;
  while (current !== null) {
    result.push(current);
    current = namespaces.get(current)?.parentNamespaceId ?? null;
  }
  result.push(null);
  return result;
}

function representative(
  classId: string,
  scope: NamespaceId | null,
  level: NamespaceId | null,
  namespaces: ReadonlyMap<NamespaceId, LayoutInput["namespaces"][number]>
): string {
  if (scope === level) return classId;
  let current = scope;
  while (current !== null && namespaces.get(current)?.parentNamespaceId !== level)
    current = namespaces.get(current)?.parentNamespaceId ?? null;
  return current ?? classId;
}
