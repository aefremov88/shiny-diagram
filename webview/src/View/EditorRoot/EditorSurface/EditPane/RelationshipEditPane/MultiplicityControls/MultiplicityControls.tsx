/**
 * @behavior Relationship multiplicity preset and custom commit routing.
 * @render Relationship multiplicity controls.
 */

import type { ReactElement } from "react";
import type { RelationshipView } from "../../../../../views/schema";
import { useDispatchTransaction } from "../../../../../contexts";
import {
  CHROME_MENU_ABOVE_CONTROL_Z_INDEX,
  CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX,
} from "../../../../../config/editorUiConfig";
import CommitComboBox from "../../../../../../Ui/chrome/composites/CommitComboBox/CommitComboBox";
import FieldGrid from "../../../../../../Ui/chrome/templates/FieldGrid/FieldGrid";
import { toRelationshipMultiplicitySetTransaction } from "./transactions";

const multiplicityPresets = ["1", "0..1", "*", "0..*", "1..*"] as const;

type MultiplicityControlsProps = {
  readonly view: RelationshipView;
};

export default function MultiplicityControls({ view }: MultiplicityControlsProps): ReactElement {
  const dispatchTransaction = useDispatchTransaction();

  return (
    <FieldGrid
      variant="endpointPair"
      rows={[
        {
          label: "Source",
          control: (
            <CommitComboBox
              initialValue={view.sourceMultiplicity ?? ""}
              options={toMultiplicityOptions()}
              validate={() => []}
              ariaLabel="Source"
              isLabelVisible={false}
              menuStacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
              validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
              onCommit={(value) =>
                dispatchTransaction(
                  toRelationshipMultiplicitySetTransaction(
                    view.relationshipId,
                    "source",
                    value.trim() === "" ? null : value.trim()
                  )
                )
              }
              onDiscard={() => undefined}
              onCancel={() => undefined}
            />
          ),
        },
        {
          label: "Target",
          control: (
            <CommitComboBox
              initialValue={view.targetMultiplicity ?? ""}
              options={toMultiplicityOptions()}
              validate={() => []}
              ariaLabel="Target"
              isLabelVisible={false}
              menuStacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
              validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
              onCommit={(value) =>
                dispatchTransaction(
                  toRelationshipMultiplicitySetTransaction(
                    view.relationshipId,
                    "target",
                    value.trim() === "" ? null : value.trim()
                  )
                )
              }
              onDiscard={() => undefined}
              onCancel={() => undefined}
            />
          ),
        },
      ]}
    />
  );
}

// Private helpers
function toMultiplicityOptions(): readonly { value: string; label: string }[] {
  return [
    { value: "", label: "None" },
    ...multiplicityPresets.map((preset) => ({ value: preset, label: preset })),
  ];
}
