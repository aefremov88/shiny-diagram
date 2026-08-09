/**
 * @behavior Selected class style property common-value derivation.
 * @render Class style property controls.
 */

import type { ReactElement } from "react";
import {
  STYLE_PROPERTIES,
  type StyleProperties,
  type StylePropertyName,
} from "../../../../../../shared/style";
import type { ClassView } from "../../../../../views/schema";
import { CLASS_STYLE_CONSTANTS } from "../../../../../config/styleConstants";
import type { ColorSelectPresetCatalog } from "../../../../../../Ui/chrome/composites/ColorSelect/ColorSelect";
import FieldGrid from "../../../../../../Ui/chrome/templates/FieldGrid/FieldGrid";
import StylePropertyControl from "./StylePropertyControl/StylePropertyControl";
import { useInteractions } from "./useInteractions";

const EMPTY_STYLE_PROPERTIES: StyleProperties = {
  fill: null,
  stroke: null,
  strokeWidth: null,
  strokeDasharray: null,
  color: null,
};

type ChangeStylePaletteProps = {
  readonly view: readonly ClassView[];
  readonly presets: ColorSelectPresetCatalog;
  readonly documentColors: readonly string[];
  readonly widthSelectUIProps: StrokeSelectUIProps;
  readonly dashSelectUIProps: StrokeSelectUIProps;
};

type StrokeSelectUIProps = {
  readonly constantValue: string;
  readonly documentValues: readonly string[];
};

export default function ChangeStylePalette({
  view,
  presets,
  documentColors,
  widthSelectUIProps,
  dashSelectUIProps,
}: ChangeStylePaletteProps): ReactElement {
  // Event handler props derivation
  const { onPropertyChange } = useInteractions(view);

  return (
    <FieldGrid
      variant="surfaceStyle"
      rows={STYLE_PROPERTIES.map(({ name }) => ({
        label: toFieldLabel(name),
        control: (
          <StylePropertyControl
            property={name}
            value={toCommonPropertyValue(view, name)}
            presets={presets}
            documentColors={documentColors}
            constantValue={
              name === "strokeWidth"
                ? widthSelectUIProps.constantValue
                : name === "strokeDasharray"
                  ? dashSelectUIProps.constantValue
                  : CLASS_STYLE_CONSTANTS[name]
            }
            documentValues={
              name === "strokeWidth"
                ? widthSelectUIProps.documentValues
                : dashSelectUIProps.documentValues
            }
            onChange={(value) => onPropertyChange(name, value)}
          />
        ),
      }))}
    />
  );
}

// Private helpers
function toCommonPropertyValue(
  classes: readonly ClassView[],
  property: StylePropertyName
): string | null | "multiple" {
  const first = (classes[0]?.style ?? EMPTY_STYLE_PROPERTIES)[property];
  return classes.every(
    (classView) => (classView.style ?? EMPTY_STYLE_PROPERTIES)[property] === first
  )
    ? first
    : "multiple";
}

function toFieldLabel(property: StylePropertyName): string {
  switch (property) {
    case "fill":
      return "Fill";
    case "stroke":
      return "Stroke";
    case "strokeWidth":
      return "Width";
    case "strokeDasharray":
      return "Dash";
    case "color":
      return "Text color";
  }
}
