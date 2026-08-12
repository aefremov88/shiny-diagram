/**
 * @behavior Class duplicate and delete transaction dispatch.
 */

import { useCallback } from "react";
import { useDispatchTransaction } from "../../../../../contexts";
import type { ClassView } from "../../../../../views/schema";
import { toClassDeleteTransaction, toClassDuplicateTransaction } from "./transactions";
import { logAction } from "../../../../../../shared/logging";

type Interactions = {
  readonly onDuplicate: () => void;
  readonly onDelete: () => void;
};

export function useInteractions(view: readonly ClassView[]): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onDuplicate = useCallback(() => {
    logAction("duplicate", view.map((classView) => classView.classId).join(","));
    dispatchTransaction(toClassDuplicateTransaction(view));
  }, [dispatchTransaction, view]);

  const onDelete = useCallback(() => {
    logAction("delete", view.map((classView) => classView.classId).join(","));
    dispatchTransaction(toClassDeleteTransaction(view));
  }, [dispatchTransaction, view]);

  return { onDuplicate, onDelete };
}
