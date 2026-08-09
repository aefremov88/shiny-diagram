/**
 * @behavior Saved style selection state interpretation and chip activation routing.
 * @render Named-style chips plus style creation action.
 */

import type { ReactElement } from "react";
import type { StyleDefId } from "../../../../../../shared/ids";
import type { SelectionState } from "../../../../../state/editorStates";
import type { DeclaredStyleView } from "../../../../../views/schema";
import Button from "../../../../../../Ui/chrome/primitives/Button/Button";
import ControlGroup from "../../../../../../Ui/chrome/templates/ControlGroup/ControlGroup";
import PaneSection from "../../../../../../Ui/chrome/templates/PaneSection/PaneSection";
import StyleChip from "./StyleChip/StyleChip";

type SavedStylesProps = {
  readonly view: readonly DeclaredStyleView[];
  readonly selectionState: SelectionState;
  readonly onStyleSelect: (styleDefId: StyleDefId) => void;
  readonly onCreate: () => void;
};

export default function SavedStyles({
  view,
  selectionState,
  onStyleSelect,
  onCreate,
}: SavedStylesProps): ReactElement {
  // View and State slice props derivation
  // UI props derivation
  const selectedStyleId = selectionState.kind === "style" ? selectionState.styleDefId : undefined;

  return (
    <PaneSection label="Saved styles">
      <ControlGroup spacing="wide">
        <ControlGroup>
          {view.map((styleView) => (
            <StyleChip
              key={styleView.styleDefId}
              view={styleView}
              pressed={styleView.styleDefId === selectedStyleId}
              onStyleSelect={onStyleSelect}
            />
          ))}
        </ControlGroup>
      </ControlGroup>
      <Button label="+ New style" onClick={onCreate} />
    </PaneSection>
  );
}
