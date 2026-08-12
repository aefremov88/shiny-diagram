/**
 * @behavior Relationship edge selection and inline edit semantic handlers with commit dispatch.
 */

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RelationshipId } from "../../../../../../../shared/ids";
import type { RelationshipView } from "../../../../../../views/schema";
import { useDispatchTransaction } from "../../../../../../contexts";
import type { EditTarget } from "./state";
import {
  toRelationshipLabelSetTransaction,
  toRelationshipMultiplicitySetTransaction,
} from "./transactions";
import { logAction } from "../../../../../../../shared/logging";

type Interactions = {
  readonly onEdgeSelect: () => void;
  readonly onEditStart: (target: EditTarget) => void;
  readonly onEditCommit: (value: string) => void;
  readonly onEditCancel: () => void;
};

type UseInteractionsInput = {
  readonly view: RelationshipView;
  readonly isSelected: boolean;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
  readonly editTarget: EditTarget | null;
  readonly setEditTarget: Dispatch<SetStateAction<EditTarget | null>>;
};

export function useInteractions({
  view,
  isSelected,
  onRelationshipSelect,
  editTarget,
  setEditTarget,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onEdgeSelect = useCallback(() => {
    onRelationshipSelect(view.relationshipId);
  }, [onRelationshipSelect, view.relationshipId]);

  const onEditStart = useCallback(
    (target: EditTarget) => {
      if (!isSelected) onRelationshipSelect(view.relationshipId);
      setEditTarget(target);
    },
    [isSelected, onRelationshipSelect, setEditTarget, view.relationshipId]
  );

  const onEditCommit = useCallback(
    (value: string) => {
      if (editTarget === null) return;
      const trimmed = value.trim();
      logAction(`${editTarget}-set`, view.relationshipId, {
        value: trimmed === "" ? null : trimmed,
      });
      // Implementing interaction through command transaction
      dispatchTransaction(
        editTarget === "label"
          ? toRelationshipLabelSetTransaction(view.relationshipId, trimmed === "" ? null : trimmed)
          : toRelationshipMultiplicitySetTransaction(
              view.relationshipId,
              editTarget === "sourceMultiplicity" ? "source" : "target",
              trimmed === "" ? null : trimmed
            )
      );
      setEditTarget(null);
    },
    [dispatchTransaction, editTarget, setEditTarget, view.relationshipId]
  );

  const onEditCancel = useCallback(() => {
    setEditTarget(null);
  }, [setEditTarget]);

  return { onEdgeSelect, onEditStart, onEditCommit, onEditCancel };
}
