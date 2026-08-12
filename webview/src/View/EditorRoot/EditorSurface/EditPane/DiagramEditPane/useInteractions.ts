/**
 * @behavior Diagram style creation, deletion, and rename outcome routing.
 */

import { useCallback } from "react";
import type { TransactionResult } from "../../../../commands/editorCommands";
import { useDispatchTransaction } from "../../../../contexts";
import type { SelectionState } from "../../../../state/editorStates";
import type { DeclaredStyleView } from "../../../../views/schema";
import type { StylePropertyName } from "../../../../../shared/style";
import {
  toStyleCreateTransaction,
  toStyleDeleteTransaction,
  toStylePropertySetTransaction,
} from "./transactions";
import { logAction } from "../../../../../shared/logging";

type UseInteractionsInput = {
  readonly styles: readonly DeclaredStyleView[];
  readonly selectedStyle: DeclaredStyleView | undefined;
  readonly origin: Extract<SelectionState, { readonly kind: "classes" }> | undefined;
  readonly onSelectionRestore: (selectionState: SelectionState) => void;
  readonly onStyleCreateCommitted: (result: TransactionResult) => void;
};

type Interactions = {
  readonly onCreate: () => void;
  readonly onBack: () => void;
  readonly onDelete: () => void;
  readonly onNamedStylePropertyChange: (property: StylePropertyName, value: string | null) => void;
};

export function useInteractions({
  styles,
  selectedStyle,
  origin,
  onSelectionRestore,
  onStyleCreateCommitted,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onCreate = useCallback(() => {
    logAction("create", "style-definition");
    const result = dispatchTransaction(toStyleCreateTransaction(styles));
    onStyleCreateCommitted(result);
  }, [dispatchTransaction, onStyleCreateCommitted, styles]);

  const onBack = useCallback(() => {
    if (origin) onSelectionRestore(origin);
  }, [onSelectionRestore, origin]);

  const onDelete = useCallback(() => {
    if (!selectedStyle) return;
    logAction("delete", selectedStyle.styleDefId);
    dispatchTransaction(toStyleDeleteTransaction(selectedStyle));
  }, [dispatchTransaction, selectedStyle]);

  const onNamedStylePropertyChange = useCallback(
    (property: StylePropertyName, value: string | null) => {
      if (!selectedStyle) return;
      logAction("style-property-set", selectedStyle.styleDefId, { property, value });
      dispatchTransaction(toStylePropertySetTransaction(selectedStyle, property, value));
    },
    [dispatchTransaction, selectedStyle]
  );

  return {
    onCreate,
    onBack,
    onDelete,
    onNamedStylePropertyChange,
  };
}
