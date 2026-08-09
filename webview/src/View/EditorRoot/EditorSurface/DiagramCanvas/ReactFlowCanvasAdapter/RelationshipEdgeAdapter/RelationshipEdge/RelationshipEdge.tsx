/**
 * @behavior Relationship selection and inline text editing.
 * @render Relationship edge path, markers, multiplicities, and label.
 */

import type { ReactElement } from "react";
import { useState } from "react";
import type { RelationshipId } from "../../../../../../../shared/ids";
import {
  RELATIONSHIP_EDGE_MULTIPLICITY_POSITION_FRACTION,
  RELATIONSHIP_EDGE_MULTIPLICITY_NORMAL_OFFSET,
  INLINE_VALIDATION_POPUP_Z_INDEX,
} from "../../../../../../config/editorUiConfig";
import type { RelationshipView } from "../../../../../../views/schema";
import { endpointGlyphs } from "../../RelationshipMarker/icons";
import EditableEdgeText from "../../../../../../../Ui/canvas/composites/EditableEdgeText/EditableEdgeText";
import EdgeEndpointHandle from "../../../../../../../Ui/canvas/primitives/EdgeEndpointHandle/EdgeEndpointHandle";
import EdgeEndpointMarker from "../../../../../../../Ui/canvas/primitives/EdgeEndpointMarker/EdgeEndpointMarker";
import EdgeHitPath from "../../../../../../../Ui/canvas/primitives/EdgeHitPath/EdgeHitPath";
import EdgePath from "../../../../../../../Ui/canvas/primitives/EdgePath/EdgePath";
import type { EditTarget } from "./state";
import { useInteractions } from "./useInteractions";

type RelationshipEdgeProps = {
  readonly view: RelationshipView;
  readonly isSelected: boolean;
  readonly edgePath: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
};

export default function RelationshipEdge({
  view,
  isSelected,
  edgePath,
  labelX,
  labelY,
  sourceX,
  sourceY,
  targetX,
  targetY,
  onRelationshipSelect,
}: RelationshipEdgeProps): ReactElement {
  // State creation: local state - inline text edit target and draft value
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  // Event handler props derivation
  const { onEdgeSelect, onEditStart, onEditCommit, onEditCancel } = useInteractions({
    view,
    isSelected,
    onRelationshipSelect,
    editTarget,
    setEditTarget,
  });

  // UI props derivation
  const isLabelEditing = editTarget === "label";
  const isSourceMultiplicityEditing = editTarget === "sourceMultiplicity";
  const isTargetMultiplicityEditing = editTarget === "targetMultiplicity";
  const sourceMarkerId = `${view.relationshipId}-source-${view.sourceEndpointKind}`;
  const targetMarkerId = `${view.relationshipId}-target-${view.targetEndpointKind}`;
  const sourceMultiplicityX =
    sourceX + (labelX - sourceX) * RELATIONSHIP_EDGE_MULTIPLICITY_POSITION_FRACTION;
  const sourceMultiplicityY =
    sourceY + (labelY - sourceY) * RELATIONSHIP_EDGE_MULTIPLICITY_POSITION_FRACTION;
  const targetMultiplicityX =
    targetX + (labelX - targetX) * RELATIONSHIP_EDGE_MULTIPLICITY_POSITION_FRACTION;
  const targetMultiplicityY =
    targetY + (labelY - targetY) * RELATIONSHIP_EDGE_MULTIPLICITY_POSITION_FRACTION;
  const multiplicityNormal = toNormalOffset(
    sourceX,
    sourceY,
    targetX,
    targetY,
    RELATIONSHIP_EDGE_MULTIPLICITY_NORMAL_OFFSET
  );

  return (
    // React Flow owns the edge shell, so the five edge elements remain consumer-side assembly.
    <g
      onClick={(event) => {
        event.stopPropagation();
        onEdgeSelect();
      }}
    >
      <defs>
        {view.sourceEndpointKind === "none" ? null : (
          <EdgeEndpointMarker
            id={sourceMarkerId}
            glyph={endpointGlyphs[view.sourceEndpointKind]}
            side="source"
            selected={isSelected}
          />
        )}
        {view.targetEndpointKind === "none" ? null : (
          <EdgeEndpointMarker
            id={targetMarkerId}
            glyph={endpointGlyphs[view.targetEndpointKind]}
            side="target"
            selected={isSelected}
          />
        )}
      </defs>
      <EdgeHitPath d={edgePath} />
      <EdgePath
        d={edgePath}
        lineKind={view.lineKind}
        selected={isSelected}
        startMarkerId={view.sourceEndpointKind === "none" ? undefined : sourceMarkerId}
        endMarkerId={view.targetEndpointKind === "none" ? undefined : targetMarkerId}
      />
      <EdgeEndpointHandle point={{ x: sourceX, y: sourceY }} visible={isSelected} />
      <EdgeEndpointHandle point={{ x: targetX, y: targetY }} visible={isSelected} />
      {view.sourceMultiplicity || isSourceMultiplicityEditing ? (
        <EdgeText
          x={sourceMultiplicityX + multiplicityNormal.x}
          y={sourceMultiplicityY + multiplicityNormal.y}
          text={view.sourceMultiplicity ?? ""}
          variant="multiplicity"
          isEditing={isSourceMultiplicityEditing}
          isClickEditEnabled={isSelected}
          onSelect={onEdgeSelect}
          onEditStart={() => onEditStart("sourceMultiplicity")}
          onCommit={onEditCommit}
          onEditCancel={onEditCancel}
        />
      ) : null}
      {view.targetMultiplicity || isTargetMultiplicityEditing ? (
        <EdgeText
          x={targetMultiplicityX + multiplicityNormal.x}
          y={targetMultiplicityY + multiplicityNormal.y}
          text={view.targetMultiplicity ?? ""}
          variant="multiplicity"
          isEditing={isTargetMultiplicityEditing}
          isClickEditEnabled={isSelected}
          onSelect={onEdgeSelect}
          onEditStart={() => onEditStart("targetMultiplicity")}
          onCommit={onEditCommit}
          onEditCancel={onEditCancel}
        />
      ) : null}
      {view.label || isLabelEditing ? (
        <EdgeText
          x={labelX}
          y={labelY}
          text={view.label ?? ""}
          variant="label"
          isEditing={isLabelEditing}
          isClickEditEnabled={isSelected}
          onSelect={onEdgeSelect}
          onEditStart={() => onEditStart("label")}
          onCommit={onEditCommit}
          onEditCancel={onEditCancel}
        />
      ) : null}
    </g>
  );
}

function EdgeText({
  x,
  y,
  text,
  variant,
  isEditing,
  isClickEditEnabled,
  onSelect,
  onEditStart,
  onCommit,
  onEditCancel,
}: {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly variant: "label" | "multiplicity";
  readonly isEditing: boolean;
  readonly isClickEditEnabled: boolean;
  readonly onSelect: () => void;
  readonly onEditStart: () => void;
  readonly onCommit: (value: string) => void;
  readonly onEditCancel: () => void;
}): ReactElement {
  return (
    <g className={isEditing ? "nopan" : undefined} transform={`translate(${x} ${y})`}>
      <EditableEdgeText
        text={text}
        treatment={variant}
        isEditing={isEditing}
        isClickEditEnabled={isClickEditEnabled}
        validationStacking={INLINE_VALIDATION_POPUP_Z_INDEX}
        onSelect={onSelect}
        onEditRequest={onEditStart}
        onCommit={onCommit}
        onCancel={onEditCancel}
      />
    </g>
  );
}

function toNormalOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  distance: number
): { readonly x: number; readonly y: number } {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.hypot(dx, dy);
  return length === 0
    ? { x: 0, y: -distance }
    : { x: (-dy / length) * distance, y: (dx / length) * distance };
}
