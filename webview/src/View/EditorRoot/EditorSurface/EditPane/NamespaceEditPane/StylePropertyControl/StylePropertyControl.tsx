/**
 * @behavior Namespace style color and line preset normalization.
 * @render One namespace style property selector.
 */

import type { ReactElement } from "react";
import type { StylePropertyName } from "../../../../../../shared/style";
import { DASH_PRESETS, WIDTH_PRESETS } from "../../../../../config/stylePresets";
import { CHROME_SELECTOR_POPUP_ABOVE_CONTROL_Z_INDEX } from "../../../../../config/editorUiConfig";
import ColorSelect from "../../../../../../Ui/chrome/composites/ColorSelect/ColorSelect";
import type { ColorSelectPresetCatalog } from "../../../../../../Ui/chrome/composites/ColorSelect/ColorSelect";
import StrokeSelect from "../../../../../../Ui/chrome/composites/StrokeSelect/StrokeSelect";

type StylePropertyControlProps = {
  readonly property: StylePropertyName;
  readonly value: string | null;
  readonly presets: ColorSelectPresetCatalog;
  readonly documentColors: readonly string[];
  readonly constantValue: string;
  readonly documentValues: readonly string[];
  readonly onChange: (value: string | null) => void;
};

export default function StylePropertyControl({
  property,
  value,
  presets,
  documentColors,
  constantValue,
  documentValues,
  onChange,
}: StylePropertyControlProps): ReactElement {
  // UI props derivation
  if (isColorProperty(property)) {
    return (
      <ColorSelect
        preview={property === "color" ? "text" : property}
        presets={presets}
        documentColors={documentColors}
        constantValue={constantValue}
        value={value}
        stacking={CHROME_SELECTOR_POPUP_ABOVE_CONTROL_Z_INDEX}
        onChange={onChange}
      />
    );
  }

  return (
    <StrokeSelect
      kind={property === "strokeWidth" ? "width" : "dash"}
      value={value}
      constantValue={constantValue}
      presets={property === "strokeWidth" ? WIDTH_PRESETS : DASH_PRESETS}
      documentValues={documentValues}
      stacking={CHROME_SELECTOR_POPUP_ABOVE_CONTROL_Z_INDEX}
      onChange={onChange}
    />
  );
}

// Private helpers
function isColorProperty(property: StylePropertyName): property is "fill" | "stroke" | "color" {
  return property === "fill" || property === "stroke" || property === "color";
}
