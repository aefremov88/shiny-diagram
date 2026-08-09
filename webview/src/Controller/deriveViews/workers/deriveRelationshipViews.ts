/**
 * @fileoverview Derives View-owned relationship render models from Controller relationship edges.
 */

import type { DiagramGraph } from "../../model/diagramGraph";
import type { RelationshipView } from "../../../View/views";

/**
 * Derives all relationship views. Rendering is gated to ready diagrams, where
 * every class has spatial data; Generate also needs relationships beforehand.
 */
export function deriveRelationshipViews(model: DiagramGraph): RelationshipView[] {
  return [...model.relationships.values()].map((rel) => ({
    relationshipId: rel.id,
    sourceClassId: rel.source.classId,
    targetClassId: rel.target.classId,
    sourceEndpointKind: rel.source.endpointKind,
    targetEndpointKind: rel.target.endpointKind,
    lineKind: rel.lineKind,
    sourceMultiplicity: rel.source.multiplicity ?? undefined,
    targetMultiplicity: rel.target.multiplicity ?? undefined,
    label: rel.label ?? undefined,
  }));
}
