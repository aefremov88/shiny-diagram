/**
 * @behavior Named style selection scenario.
 * @render Named style selector.
 */

import type { ReactElement } from "react";
import { toStyleDefId } from "../../../../../../shared/ids";
import type { StyleProperties } from "../../../../../../shared/style";
import type { ClassView, DeclaredStyleView } from "../../../../../views/schema";
import { CHROME_MENU_ABOVE_CONTROL_Z_INDEX } from "../../../../../config/editorUiConfig";
import Dropdown from "../../../../../../Ui/chrome/composites/Dropdown/Dropdown";
import { useInteractions } from "./useInteractions";

type NamedStyleSelectorProps = {
  readonly view: readonly ClassView[];
  readonly styles: readonly DeclaredStyleView[];
};

export default function NamedStyleSelector({
  view,
  styles: styleViews,
}: NamedStyleSelectorProps): ReactElement {
  // Event handler props derivation
  const { onStyleChange } = useInteractions(view);
  const selectedValue = toSelectedValue(view);

  function onChange(value: string): void {
    if (value === "multiple" || value === "custom") return;
    onStyleChange(value === "none" ? null : toStyleDefId(value));
  }

  return (
    <Dropdown
      value={selectedValue}
      stacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
      options={[
        ...(selectedValue === "multiple"
          ? [
              {
                value: "multiple",
                label: "Multiple",
                swatchKind: "boxLabel" as const,
                swatchStyle: {},
              },
            ]
          : []),
        ...(selectedValue === "custom"
          ? [
              {
                value: "custom",
                label: "Custom style",
                swatchKind: "boxLabel" as const,
                swatchStyle: toCustomSwatchStyle(view),
              },
            ]
          : []),
        { value: "none", label: "No style", swatchKind: "boxLabel", swatchStyle: {} },
        ...styleViews.map((styleView) => ({
          value: styleView.styleDefId,
          label: styleView.name,
          swatchKind: "boxLabel" as const,
          swatchStyle: styleView.properties,
        })),
      ]}
      onChange={onChange}
    />
  );
}

// Private helpers
function toCustomSwatchStyle(classes: readonly ClassView[]): Partial<StyleProperties> {
  return classes.length === 1 ? (classes[0]?.style ?? {}) : {};
}

function toSelectedValue(classes: readonly ClassView[]): string {
  const first = classes[0]?.appliedStyleId;
  if (classes.every((classView) => classView.appliedStyleId === first)) {
    if (first) return first;
    return classes.some((classView) => classView.style !== undefined) ? "custom" : "none";
  }
  return "multiple";
}
