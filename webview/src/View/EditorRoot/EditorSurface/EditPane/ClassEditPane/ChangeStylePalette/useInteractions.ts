/**
 * @behavior Class style palette transaction dispatch.
 */

import { useCallback } from "react";
import { useDispatchTransaction } from "../../../../../contexts";
import type { ClassView } from "../../../../../views/schema";
import type { StylePropertyName } from "../../../../../../shared/style";
import { toClassStylePropertySetTransaction } from "./transactions";
import { logAction } from "../../../../../../shared/logging";

type Interactions = {
  readonly onPropertyChange: (property: StylePropertyName, value: string | null) => void;
};

export function useInteractions(view: readonly ClassView[]): Interactions {
  const dispatchTransaction = useDispatchTransaction();

  // Event handler props derivation
  const onPropertyChange = useCallback(
    (property: StylePropertyName, value: string | null) => {
      logAction("style-property-set", view.map((classView) => classView.classId).join(","), {
        property,
        value,
      });
      dispatchTransaction(toClassStylePropertySetTransaction(view, property, value));
    },
    [dispatchTransaction, view]
  );

  return { onPropertyChange };
}
