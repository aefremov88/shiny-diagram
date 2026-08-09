/**
 * @behavior Selected relationship style section routing.
 * @render Relationship style inspector sections.
 */

import type { ReactElement } from "react";
import type { RelationshipId } from "../../../../../shared/ids";
import type { RelationshipSeed } from "../../../../state/editorStates";
import type { RelationshipView } from "../../../../views/schema";
import EdgeActions from "./EdgeActions/EdgeActions";
import EdgeShapeControls from "./EdgeShapeControls/EdgeShapeControls";
import LabelControls from "./LabelControls/LabelControls";
import MultiplicityControls from "./MultiplicityControls/MultiplicityControls";
import PaneSection from "../../../../../Ui/chrome/templates/PaneSection/PaneSection";

type RelationshipEditPaneProps = {
  readonly view: RelationshipView;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
  readonly onRelationshipDuplicate: (seed: RelationshipSeed) => void;
};

export default function RelationshipEditPane({
  view,
  onRelationshipSelect,
  onRelationshipDuplicate,
}: RelationshipEditPaneProps): ReactElement {
  return (
    <>
      <PaneSection label="Relationship label">
        <LabelControls view={view} />
      </PaneSection>
      <PaneSection label="Relationship shape">
        <EdgeShapeControls view={view} onRelationshipSelect={onRelationshipSelect} />
      </PaneSection>
      <PaneSection label="Multiplicity">
        <MultiplicityControls view={view} />
      </PaneSection>
      <PaneSection label="Actions">
        <EdgeActions view={view} onRelationshipDuplicate={onRelationshipDuplicate} />
      </PaneSection>
    </>
  );
}
