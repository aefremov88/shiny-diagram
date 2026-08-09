import type { ElementId } from "./types";

export type Coupling = ReadonlyMap<ElementId, ReadonlySet<ElementId>>;

export function selectNextElement(
  unplacedIds: readonly ElementId[],
  placedIds: ReadonlySet<ElementId>,
  coupling: Coupling
): ElementId {
  return [...unplacedIds].sort((left, right) => {
    const leftEdges = coupling.get(left) ?? new Set();
    const rightEdges = coupling.get(right) ?? new Set();
    const scoreDifference = countPlaced(rightEdges, placedIds) - countPlaced(leftEdges, placedIds);
    if (scoreDifference !== 0) return scoreDifference;
    const totalDifference = rightEdges.size - leftEdges.size;
    if (totalDifference !== 0) return totalDifference;
    return String(left).localeCompare(String(right));
  })[0];
}

function countPlaced(edges: ReadonlySet<ElementId>, placedIds: ReadonlySet<ElementId>): number {
  let count = 0;
  edges.forEach((id) => {
    if (placedIds.has(id)) count++;
  });
  return count;
}
