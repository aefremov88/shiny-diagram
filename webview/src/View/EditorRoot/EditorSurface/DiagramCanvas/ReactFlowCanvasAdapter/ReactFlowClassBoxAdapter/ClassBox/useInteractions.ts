/**
 * @behavior Class-box selection and header commit semantic handlers.
 * @framework DOM click modifier state to additive class selection fact.
 */

import { useCallback } from "react";
import type { MouseEvent } from "react";
import type { ClassId } from "../../../../../../../shared/ids";
import { useDispatchTransaction } from "../../../../../../contexts";
import { toClassHeaderCommitTransaction } from "./transactions";
import { logAction } from "../../../../../../../shared/logging";

type Interactions = {
  readonly onClassBoxClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onHeaderCommit: (
    block: "annotation" | "name" | "label",
    value: string | null
  ) => readonly string[];
};

export function useInteractions(
  classId: ClassId,
  onClassSelect: (classId: ClassId, additive: boolean) => void
): Interactions {
  const dispatchCommand = useDispatchTransaction();

  // Event handler props derivation
  const onClassBoxClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      onClassSelect(classId, event.ctrlKey || event.metaKey);
    },
    [classId, onClassSelect]
  );

  const onHeaderCommit = useCallback(
    (block: "annotation" | "name" | "label", value: string | null) => {
      logAction(`${block}-set`, classId, { value });
      const result = dispatchCommand(toClassHeaderCommitTransaction(classId, block, value));
      return result.status === "rejected" ? result.errors.map((error) => error.message) : [];
    },
    [classId, dispatchCommand]
  );

  return { onClassBoxClick, onHeaderCommit };
}
