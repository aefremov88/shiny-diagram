/**
 * @behavior Namespace name, style property, reset, and delete transaction dispatch.
 */

import { useCallback } from "react";
import type { NamespaceId } from "../../../../../shared/ids";
import type { StylePropertyName } from "../../../../../shared/style";
import type { TransactionResult } from "../../../../commands/editorCommands";
import { useDispatchTransaction } from "../../../../contexts";
import type { NamespaceView } from "../../../../views/schema";
import {
  toNamespaceDeleteTransaction,
  toNamespaceNameCommitTransaction,
  toNamespaceStylePropertySetTransaction,
  toNamespaceStyleResetTransaction,
} from "./transactions";
import { logAction } from "../../../../../shared/logging";

type UseInteractionsInput = {
  readonly view: NamespaceView;
  readonly onNamespaceRenameCommitted: (
    result: TransactionResult,
    previousNamespaceId: NamespaceId
  ) => void;
};

type Interactions = {
  readonly onNameCommit: (name: string) => readonly string[];
  readonly onPropertyChange: (property: StylePropertyName, value: string | null) => void;
  readonly onReset: () => void;
  readonly onDelete: () => void;
};

export function useInteractions({
  view,
  onNamespaceRenameCommitted,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onNameCommit = useCallback(
    (name: string): readonly string[] => {
      logAction("name-set", view.namespaceId, { name: name.trim() });
      const result = dispatchTransaction(
        toNamespaceNameCommitTransaction(view.namespaceId, name.trim())
      );
      if (result.status === "committed") {
        onNamespaceRenameCommitted(result, view.namespaceId);
        return [];
      }
      return result.errors.map((error) => error.message);
    },
    [dispatchTransaction, onNamespaceRenameCommitted, view.namespaceId]
  );

  const onPropertyChange = useCallback(
    (property: StylePropertyName, value: string | null) => {
      logAction("style-property-set", view.namespaceId, { property, value });
      dispatchTransaction(toNamespaceStylePropertySetTransaction(view, property, value));
    },
    [dispatchTransaction, view]
  );

  const onReset = useCallback(() => {
    logAction("style-reset", view.namespaceId);
    dispatchTransaction(toNamespaceStyleResetTransaction(view.namespaceId));
  }, [dispatchTransaction, view.namespaceId]);

  const onDelete = useCallback(() => {
    logAction("delete", view.namespaceId);
    dispatchTransaction(toNamespaceDeleteTransaction(view.namespaceId));
  }, [dispatchTransaction, view.namespaceId]);

  return { onNameCommit, onPropertyChange, onReset, onDelete };
}
