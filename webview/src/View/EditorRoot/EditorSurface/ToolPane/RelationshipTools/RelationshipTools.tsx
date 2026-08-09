/**
 * @behavior Relationship placement preset mapping and active preset comparison.
 * @render Relationship creation tools.
 */

import type { ReactElement } from "react";
import type { GlyphDescriptor } from "../../../../../shared/glyph";
import type { RelationshipType } from "../../../../../shared/uml";
import type { NodePlacementState, RelationshipSeed } from "../../../../state/editorStates";
import ToggleButton from "../../../../../Ui/chrome/primitives/ToggleButton/ToggleButton";
import {
  aggregationGlyph,
  associationGlyph,
  bidirectionalAssociationGlyph,
  compositionGlyph,
  dependencyGlyph,
  directedAssociationGlyph,
  inheritanceGlyph,
  realizationGlyph,
} from "./icons";

type RelationshipToolsProps = {
  readonly relationshipPlacementState: Extract<NodePlacementState, { kind: "relationship" }> | null;
  readonly onRelationshipPlacementStart: (seed: RelationshipSeed) => void;
};

type ToolPaneItem = {
  readonly relationshipType: RelationshipType;
  readonly icon: GlyphDescriptor;
  readonly name: string;
  readonly seed: RelationshipSeed;
};

const relationshipTools: readonly ToolPaneItem[] = [
  {
    relationshipType: "association",
    icon: associationGlyph,
    name: "Association",
    seed: {
      sourceEndpointKind: "none",
      lineKind: "solid",
      targetEndpointKind: "none",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "directedAssociation",
    icon: directedAssociationGlyph,
    name: "Directed association",
    seed: {
      sourceEndpointKind: "none",
      lineKind: "solid",
      targetEndpointKind: "arrow",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "bidirectionalAssociation",
    icon: bidirectionalAssociationGlyph,
    name: "Bidirectional association",
    seed: {
      sourceEndpointKind: "arrow",
      lineKind: "solid",
      targetEndpointKind: "arrow",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "dependency",
    icon: dependencyGlyph,
    name: "Dependency",
    seed: {
      sourceEndpointKind: "none",
      lineKind: "dashed",
      targetEndpointKind: "arrow",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "inheritance",
    icon: inheritanceGlyph,
    name: "Inheritance",
    seed: {
      sourceEndpointKind: "none",
      lineKind: "solid",
      targetEndpointKind: "triangle",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "realization",
    icon: realizationGlyph,
    name: "Realization",
    seed: {
      sourceEndpointKind: "none",
      lineKind: "dashed",
      targetEndpointKind: "triangle",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "aggregation",
    icon: aggregationGlyph,
    name: "Aggregation",
    seed: {
      sourceEndpointKind: "aggregation",
      lineKind: "solid",
      targetEndpointKind: "none",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
  {
    relationshipType: "composition",
    icon: compositionGlyph,
    name: "Composition",
    seed: {
      sourceEndpointKind: "composition",
      lineKind: "solid",
      targetEndpointKind: "none",
      sourceMultiplicity: null,
      targetMultiplicity: null,
      label: null,
    },
  },
];

export default function RelationshipTools({
  relationshipPlacementState,
  onRelationshipPlacementStart,
}: RelationshipToolsProps): ReactElement {
  return (
    <>
      {relationshipTools.map((tool) => {
        const isActive = seedsEqual(relationshipPlacementState?.seed ?? null, tool.seed);
        return (
          <ToggleButton
            key={tool.relationshipType}
            icon={tool.icon}
            pressed={isActive}
            title={tool.name}
            size="glyphTile"
            onClick={() => onRelationshipPlacementStart(tool.seed)}
          />
        );
      })}
    </>
  );
}

// Private helpers
function seedsEqual(left: RelationshipSeed | null, right: RelationshipSeed): boolean {
  return (
    left !== null &&
    left.sourceEndpointKind === right.sourceEndpointKind &&
    left.lineKind === right.lineKind &&
    left.targetEndpointKind === right.targetEndpointKind &&
    left.sourceMultiplicity === right.sourceMultiplicity &&
    left.targetMultiplicity === right.targetMultiplicity &&
    left.label === right.label
  );
}
