/**
 * @behavior Class header text-block edit transaction dispatch.
 */

import { useCallback } from "react";
import type { ClassId } from "../../../../../shared/ids";
import type { SelectionState } from "../../../../state/editorStates";
import type { ClassAnnotation } from "../../../../../shared/uml";
import { useDispatchTransaction } from "../../../../contexts";
import type { TransactionResult } from "../../../../commands/editorCommands";
import type { ClassView, DeclaredStyleView } from "../../../../views/schema";
import {
  toClassAnnotationCommitTransaction,
  toClassLabelCommitTransaction,
  toClassNameCommitTransaction,
  toClassStyleSaveTransaction,
} from "./transactions";
import { logAction } from "../../../../../shared/logging";

type UseInteractionsInput = {
  readonly onSelectionRestore: (selectionState: SelectionState) => void;
  readonly styles: readonly DeclaredStyleView[];
  readonly selectedNamedStyle: DeclaredStyleView | undefined;
  readonly selectedDirectStyle: ClassView | undefined;
  readonly origin: Extract<SelectionState, { readonly kind: "classes" }>;
  readonly onStyleSelect: (
    styleDefId: DeclaredStyleView["styleDefId"],
    origin: Extract<SelectionState, { readonly kind: "classes" }>
  ) => void;
  readonly onStyleCreateCommitted: (
    result: TransactionResult,
    origin: Extract<SelectionState, { readonly kind: "classes" }>
  ) => void;
};

type Interactions = {
  readonly onNameCommit: (classId: ClassId, name: string) => readonly string[];
  readonly onAnnotationCommit: (
    classId: ClassId,
    annotation: ClassAnnotation | null
  ) => readonly string[];
  readonly onLabelCommit: (classId: ClassId, label: string | null) => readonly string[];
  readonly onStyleAction: () => void;
};

export function useInteractions({
  onSelectionRestore,
  styles,
  selectedNamedStyle,
  selectedDirectStyle,
  origin,
  onStyleSelect,
  onStyleCreateCommitted,
}: UseInteractionsInput): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onNameCommit = useCallback(
    (classId: ClassId, name: string) => {
      logAction("name-set", classId, { name });
      const result = dispatchTransaction(toClassNameCommitTransaction(classId, name));
      if (result.status === "committed") {
        const renamed = result.outcome.classes.renamed.find((entry) => entry.from === classId);
        if (renamed) {
          onSelectionRestore({
            kind: "classes",
            classIds: origin.classIds.map((id) => (id === renamed.from ? renamed.to : id)),
          });
        }
      }
      return result.status === "rejected" ? result.errors.map((error) => error.message) : [];
    },
    [dispatchTransaction, onSelectionRestore, origin.classIds]
  );

  const onAnnotationCommit = useCallback(
    (classId: ClassId, annotation: ClassAnnotation | null) => {
      logAction("annotation-set", classId, { annotation });
      const result = dispatchTransaction(toClassAnnotationCommitTransaction(classId, annotation));
      return result.status === "rejected" ? result.errors.map((error) => error.message) : [];
    },
    [dispatchTransaction]
  );

  const onLabelCommit = useCallback(
    (classId: ClassId, label: string | null) => {
      logAction("label-set", classId, { label });
      const result = dispatchTransaction(toClassLabelCommitTransaction(classId, label));
      return result.status === "rejected" ? result.errors.map((error) => error.message) : [];
    },
    [dispatchTransaction]
  );

  const onStyleAction = useCallback(() => {
    if (selectedNamedStyle) {
      onStyleSelect(selectedNamedStyle.styleDefId, origin);
      return;
    }
    if (selectedDirectStyle) {
      const result = dispatchTransaction(toClassStyleSaveTransaction(selectedDirectStyle, styles));
      onStyleCreateCommitted(result, origin);
    }
  }, [
    dispatchTransaction,
    onStyleCreateCommitted,
    onStyleSelect,
    origin,
    selectedDirectStyle,
    selectedNamedStyle,
    styles,
  ]);

  return { onNameCommit, onAnnotationCommit, onLabelCommit, onStyleAction };
}
