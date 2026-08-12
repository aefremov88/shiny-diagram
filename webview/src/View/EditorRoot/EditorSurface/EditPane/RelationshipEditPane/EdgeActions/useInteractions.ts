/**
 * @behavior Relationship duplicate and delete action dispatch.
 */

import { useCallback } from "react";
import type { RelationshipSeed } from "../../../../../state/editorStates";
import type { RelationshipView } from "../../../../../views/schema";
import { useDispatchTransaction } from "../../../../../contexts";
import { toRelationshipDeleteTransaction } from "./transactions";
import { logAction } from "../../../../../../shared/logging";

type Interactions = {
  readonly onDelete: () => void;
  readonly onDuplicate: () => void;
};

export function useInteractions(
  view: RelationshipView,
  onRelationshipDuplicate: (seed: RelationshipSeed) => void
): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onDelete = useCallback(() => {
    logAction("delete", view.relationshipId);
    dispatchTransaction(toRelationshipDeleteTransaction(view.relationshipId));
  }, [dispatchTransaction, view.relationshipId]);

  const onDuplicate = useCallback(() => {
    logAction("duplicate", view.relationshipId);
    onRelationshipDuplicate({
      sourceEndpointKind: view.sourceEndpointKind,
      lineKind: view.lineKind,
      targetEndpointKind: view.targetEndpointKind,
      sourceMultiplicity: view.sourceMultiplicity ?? null,
      targetMultiplicity: view.targetMultiplicity ?? null,
      label: view.label ?? null,
    });
  }, [onRelationshipDuplicate, view]);

  return { onDelete, onDuplicate };
}
