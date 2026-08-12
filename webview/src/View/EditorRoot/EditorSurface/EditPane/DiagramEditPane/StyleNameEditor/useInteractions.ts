/**
 * @behavior Style definition rename transaction dispatch and identity outcome routing.
 */

import { useCallback } from "react";
import type { StyleDefId } from "../../../../../../shared/ids";
import type { TransactionResult } from "../../../../../commands/editorCommands";
import { useDispatchTransaction } from "../../../../../contexts";
import type { DeclaredStyleView } from "../../../../../views/schema";
import { toStyleNameSetTransaction } from "./transactions";
import { logAction } from "../../../../../../shared/logging";

type UseInteractionsInput = {
  readonly view: DeclaredStyleView | undefined;
  readonly onRenameCommitted: (result: TransactionResult, previousStyleDefId: StyleDefId) => void;
};

type Interactions = {
  readonly onNameCommit: (draft: string) => void;
};

export function useInteractions({ view, onRenameCommitted }: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onNameCommit = useCallback(
    (draft: string) => {
      if (!view) return;
      const name = toStyleName(draft);
      if (name === "" || name === view.name) return;
      logAction("name-set", view.styleDefId, { name });
      const result = dispatchTransaction(toStyleNameSetTransaction(view, name));
      onRenameCommitted(result, view.styleDefId);
    },
    [dispatchTransaction, onRenameCommitted, view]
  );

  return { onNameCommit };
}

// Private helpers
function toStyleName(value: string): string {
  return value
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(toCapitalizedWord)
    .join("");
}

function toCapitalizedWord(value: string): string {
  const lower = value.toLowerCase();
  return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
}
