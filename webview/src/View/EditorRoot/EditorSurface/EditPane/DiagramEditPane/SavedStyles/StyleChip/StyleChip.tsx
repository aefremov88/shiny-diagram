/**
 * @behavior Style chip activation routing.
 * @render One saved-style swatch toggle.
 */

import type { ReactElement } from "react";
import type { StyleDefId } from "../../../../../../../shared/ids";
import type { DeclaredStyleView } from "../../../../../../views/schema";
import SwatchToggle from "../../../../../../../Ui/chrome/composites/SwatchToggle/SwatchToggle";
import {
  CLASS_STYLE_CONSTANTS,
  resolveStyleProperties,
} from "../../../../../../config/styleConstants";

type StyleChipProps = {
  readonly view: DeclaredStyleView;
  readonly pressed: boolean;
  readonly onStyleSelect: (styleDefId: StyleDefId) => void;
};

export default function StyleChip({ view, pressed, onStyleSelect }: StyleChipProps): ReactElement {
  // Event handler props derivation
  const onClick = (): void => {
    onStyleSelect(view.styleDefId);
  };

  return (
    <SwatchToggle
      styleValues={resolveStyleProperties(view.properties, CLASS_STYLE_CONSTANTS)}
      label={view.name}
      pressed={pressed}
      onClick={onClick}
    />
  );
}
