/**
 * @behavior Active placement tool state slicing and UI prop derivation.
 * @render Diagram creation tool palette.
 */

import type { ReactElement } from "react";
import type {
  NamespaceGestureState,
  NodePlacementState,
  RelationshipSeed,
} from "../../../state/editorStates";
import { TOOL_PANE_WIDTH } from "../../../config/editorUiConfig";
import PaneFrame from "../../../../Ui/chrome/templates/PaneFrame/PaneFrame";
import PaneSection from "../../../../Ui/chrome/templates/PaneSection/PaneSection";
import NodePlacementTools from "./NodePlacementTools/NodePlacementTools";
import RelationshipTools from "./RelationshipTools/RelationshipTools";

type ToolPaneProps = {
  readonly nodePlacementState: NodePlacementState;
  readonly namespaceGestureState: NamespaceGestureState;
  readonly onClassPlacementStart: () => void;
  readonly onNotePlacementStart: () => void;
  readonly onNamespacePlacementStart: () => void;
  readonly onRelationshipPlacementStart: (seed: RelationshipSeed) => void;
};

export default function ToolPane({
  nodePlacementState,
  namespaceGestureState,
  onClassPlacementStart,
  onNotePlacementStart,
  onNamespacePlacementStart,
  onRelationshipPlacementStart,
}: ToolPaneProps): ReactElement {
  // View and State slice props derivation
  const relationshipPlacementState =
    nodePlacementState?.kind === "relationship" ? nodePlacementState : null;

  // UI props derivation
  const isClassPlacementActive = nodePlacementState?.kind === "class";
  const isNotePlacementActive = nodePlacementState?.kind === "note";
  const isNamespacePlacementActive = namespaceGestureState.kind === "creating";

  return (
    <PaneFrame width={TOOL_PANE_WIDTH}>
      <PaneSection label="Nodes">
        <NodePlacementTools
          kind="class"
          isClassPlacementActive={isClassPlacementActive}
          isNotePlacementActive={isNotePlacementActive}
          isNamespacePlacementActive={isNamespacePlacementActive}
          onClassPlacementStart={onClassPlacementStart}
          onNotePlacementStart={onNotePlacementStart}
          onNamespacePlacementStart={onNamespacePlacementStart}
        />
        <NodePlacementTools
          kind="namespace"
          isClassPlacementActive={isClassPlacementActive}
          isNotePlacementActive={isNotePlacementActive}
          isNamespacePlacementActive={isNamespacePlacementActive}
          onClassPlacementStart={onClassPlacementStart}
          onNotePlacementStart={onNotePlacementStart}
          onNamespacePlacementStart={onNamespacePlacementStart}
        />
        <NodePlacementTools
          kind="note"
          isClassPlacementActive={isClassPlacementActive}
          isNotePlacementActive={isNotePlacementActive}
          isNamespacePlacementActive={isNamespacePlacementActive}
          onClassPlacementStart={onClassPlacementStart}
          onNotePlacementStart={onNotePlacementStart}
          onNamespacePlacementStart={onNamespacePlacementStart}
        />
      </PaneSection>
      <PaneSection label="Edges" columns={2}>
        <RelationshipTools
          relationshipPlacementState={relationshipPlacementState}
          onRelationshipPlacementStart={onRelationshipPlacementStart}
        />
      </PaneSection>
    </PaneFrame>
  );
}
