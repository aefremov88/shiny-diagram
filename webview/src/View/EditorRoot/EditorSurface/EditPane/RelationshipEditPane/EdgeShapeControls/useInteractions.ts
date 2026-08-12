/**
 * @behavior Relationship shape control command dispatch handlers.
 */

import { useCallback } from "react";
import type { RelationshipId } from "../../../../../../shared/ids";
import type { RelationshipEndpointKind, RelationshipLineKind } from "../../../../../../shared/uml";
import { useDispatchTransaction } from "../../../../../contexts";
import type { RelationshipView } from "../../../../../views/schema";
import {
  toLineKindSetTransaction,
  toRelationshipReverseTransaction,
  toSourceEndpointKindSetTransaction,
  toTargetEndpointKindSetTransaction,
} from "./transactions";
import { logAction } from "../../../../../../shared/logging";

type Interactions = {
  readonly onSourceEndpointKindChange: (endpointKind: RelationshipEndpointKind) => void;
  readonly onLineKindChange: (lineKind: RelationshipLineKind) => void;
  readonly onTargetEndpointKindChange: (endpointKind: RelationshipEndpointKind) => void;
  readonly onReverse: () => void;
};

export function useInteractions(
  view: RelationshipView,
  onRelationshipSelect: (relationshipId: RelationshipId) => void
): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onSourceEndpointKindChange = useCallback(
    (endpointKind: RelationshipEndpointKind) => {
      if (endpointKind === view.sourceEndpointKind) return;
      logAction("source-endpoint-set", view.relationshipId, { endpointKind });
      dispatchTransaction(toSourceEndpointKindSetTransaction(view.relationshipId, endpointKind));
    },
    [dispatchTransaction, view.relationshipId, view.sourceEndpointKind]
  );

  const onLineKindChange = useCallback(
    (lineKind: RelationshipLineKind) => {
      if (lineKind === view.lineKind) return;
      logAction("line-kind-set", view.relationshipId, { lineKind });
      dispatchTransaction(toLineKindSetTransaction(view.relationshipId, lineKind));
    },
    [dispatchTransaction, view.lineKind, view.relationshipId]
  );

  const onTargetEndpointKindChange = useCallback(
    (endpointKind: RelationshipEndpointKind) => {
      if (endpointKind === view.targetEndpointKind) return;
      logAction("target-endpoint-set", view.relationshipId, { endpointKind });
      dispatchTransaction(toTargetEndpointKindSetTransaction(view.relationshipId, endpointKind));
    },
    [dispatchTransaction, view.relationshipId, view.targetEndpointKind]
  );

  const onReverse = useCallback(() => {
    const transaction = toRelationshipReverseTransaction(view);
    if (transaction.length === 0) return;
    logAction("reverse", view.relationshipId);
    const outcome = dispatchTransaction(transaction);
    onRelationshipSelect(
      outcome.status === "committed"
        ? (outcome.outcome.relationships.renamed[0]?.to ?? view.relationshipId)
        : view.relationshipId
    );
  }, [dispatchTransaction, onRelationshipSelect, view]);

  return {
    onSourceEndpointKindChange,
    onLineKindChange,
    onTargetEndpointKindChange,
    onReverse,
  };
}
