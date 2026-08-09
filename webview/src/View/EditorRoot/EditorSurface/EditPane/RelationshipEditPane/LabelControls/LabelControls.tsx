/**
 * @behavior Relationship label draft and commit routing.
 * @render Relationship label controls.
 */

import type { ReactElement } from "react";
import type { RelationshipView } from "../../../../../views/schema";
import { useDispatchTransaction } from "../../../../../contexts";
import { CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX } from "../../../../../config/editorUiConfig";
import CommitClearableTextField from "../../../../../../Ui/chrome/composites/CommitClearableTextField/CommitClearableTextField";
import { toRelationshipLabelSetTransaction } from "./transactions";

type LabelControlsProps = {
  readonly view: RelationshipView;
};

export default function LabelControls({ view }: LabelControlsProps): ReactElement {
  const dispatchTransaction = useDispatchTransaction();

  return (
    <CommitClearableTextField
      initialValue={view.label ?? ""}
      validate={() => []}
      ariaLabel="Relationship label"
      isLabelVisible={false}
      validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
      onCommit={(value) =>
        dispatchTransaction(
          toRelationshipLabelSetTransaction(
            view.relationshipId,
            value.trim() === "" ? null : value.trim()
          )
        )
      }
      onClear={() =>
        dispatchTransaction(toRelationshipLabelSetTransaction(view.relationshipId, null))
      }
      onDiscard={() => undefined}
      onCancel={() => undefined}
    />
  );
}
