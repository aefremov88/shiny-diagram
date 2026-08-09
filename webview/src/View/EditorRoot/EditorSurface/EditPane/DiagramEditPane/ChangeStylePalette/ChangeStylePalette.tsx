/**
 * @behavior Style property control routing.
 * @render Named style property controls.
 */

import type { ReactElement } from "react";
import { STYLE_PROPERTIES, type StylePropertyName } from "../../../../../../shared/style";
import type { DeclaredStyleView } from "../../../../../views/schema";
import { CLASS_STYLE_CONSTANTS } from "../../../../../config/styleConstants";
import FieldGrid from "../../../../../../Ui/chrome/templates/FieldGrid/FieldGrid";
import StylePropertyControl from "./StylePropertyControl/StylePropertyControl";
import type { ColorSelectPresetCatalog } from "../../../../../../Ui/chrome/composites/ColorSelect/ColorSelect";

type ChangeStylePaletteProps = {
  readonly view: DeclaredStyleView["properties"];
  readonly presets: ColorSelectPresetCatalog;
  readonly documentColors: readonly string[];
  readonly widthSelectUIProps: StrokeSelectUIProps;
  readonly dashSelectUIProps: StrokeSelectUIProps;
  readonly onPropertyChange: (property: StylePropertyName, value: string | null) => void;
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
  onPropertyChange,
}: ChangeStylePaletteProps): ReactElement {
  return (
    <FieldGrid
      variant="canvasStyle"
      rows={STYLE_PROPERTIES.map(({ name }) => ({
        label: toFieldLabel(name),
        control: (
          <StylePropertyControl
            property={name}
            value={view[name] ?? null}
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
