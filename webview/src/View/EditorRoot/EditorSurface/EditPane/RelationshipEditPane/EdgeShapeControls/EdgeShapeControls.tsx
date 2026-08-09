/**
 * @behavior Relationship marker, line, and reverse edit routing.
 * @render Relationship shape controls.
 */

import type { ReactElement } from "react";
import type { RelationshipId } from "../../../../../../shared/ids";
import type { RelationshipEndpointKind, RelationshipLineKind } from "../../../../../../shared/uml";
import type { RelationshipView } from "../../../../../views/schema";
import { CHROME_MENU_ABOVE_CONTROL_Z_INDEX } from "../../../../../config/editorUiConfig";
import Button from "../../../../../../Ui/chrome/primitives/Button/Button";
import Dropdown from "../../../../../../Ui/chrome/composites/Dropdown/Dropdown";
import FieldGrid from "../../../../../../Ui/chrome/templates/FieldGrid/FieldGrid";
import ControlGroup from "../../../../../../Ui/chrome/templates/ControlGroup/ControlGroup";
import { useInteractions } from "./useInteractions";

const endpointKinds: readonly RelationshipEndpointKind[] = [
  "none",
  "arrow",
  "triangle",
  "composition",
  "aggregation",
  "lollipop",
];

const lineKinds: readonly RelationshipLineKind[] = ["solid", "dashed"];

type EdgeShapeControlsProps = {
  readonly view: RelationshipView;
  readonly onRelationshipSelect: (relationshipId: RelationshipId) => void;
};

export default function EdgeShapeControls({
  view,
  onRelationshipSelect,
}: EdgeShapeControlsProps): ReactElement {
  // UI props derivation
  const endpointOptions = endpointKinds.map((endpointKind) => ({
    value: endpointKind,
    label: toEndpointLabel(endpointKind),
    isLabelVisible: endpointKind === "none",
    ...toEndpointVisual(endpointKind),
  }));

  // Event handler props derivation
  const { onSourceEndpointKindChange, onLineKindChange, onTargetEndpointKindChange, onReverse } =
    useInteractions(view, onRelationshipSelect);

  return (
    <FieldGrid
      variant="endpointPair"
      rows={[
        {
          label: "Source\nendpoint",
          control: (
            <Dropdown
              options={endpointOptions}
              value={view.sourceEndpointKind}
              stacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
              onChange={(value) => onSourceEndpointKindChange(value as RelationshipEndpointKind)}
            />
          ),
        },
        {
          label: "Line",
          control: (
            <Dropdown
              options={lineKinds.map((lineKind) => ({
                value: lineKind,
                label: toLineLabel(lineKind),
                isLabelVisible: false,
                swatchKind: lineKind === "solid" ? ("line" as const) : ("dash" as const),
                swatchStyle: { strokeDasharray: lineKind === "solid" ? "0" : "4 4" },
              }))}
              value={view.lineKind}
              stacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
              onChange={(value) => onLineKindChange(value as RelationshipLineKind)}
            />
          ),
        },
        {
          label: "Target\nendpoint",
          control: (
            <Dropdown
              options={endpointOptions}
              value={view.targetEndpointKind}
              stacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
              onChange={(value) => onTargetEndpointKindChange(value as RelationshipEndpointKind)}
            />
          ),
        },
        {
          label: "",
          control: (
            <ControlGroup>
              <Button label="Reverse" variant="rowAction" onClick={onReverse} />
            </ControlGroup>
          ),
        },
      ]}
    />
  );
}

function toEndpointVisual(endpointKind: RelationshipEndpointKind): {
  readonly swatchKind?: "none" | "arrow" | "triangle" | "diamond" | "circle";
  readonly swatchStyle?: { readonly fill?: string };
} {
  switch (endpointKind) {
    case "none":
      return {};
    case "arrow":
      return { swatchKind: "arrow" };
    case "triangle":
      return { swatchKind: "triangle" };
    case "composition":
      return { swatchKind: "diamond", swatchStyle: { fill: "currentColor" } };
    case "aggregation":
      return { swatchKind: "diamond" };
    case "lollipop":
      return { swatchKind: "circle" };
  }
}

// Private helpers
function toEndpointLabel(endpointKind: RelationshipEndpointKind): string {
  switch (endpointKind) {
    case "none":
      return "None";
    case "arrow":
      return "Arrow";
    case "triangle":
      return "Triangle";
    case "composition":
      return "Composition";
    case "aggregation":
      return "Aggregation";
    case "lollipop":
      return "Lollipop";
  }
}

function toLineLabel(lineKind: RelationshipLineKind): string {
  switch (lineKind) {
    case "solid":
      return "Solid";
    case "dashed":
      return "Dashed";
  }
}
