/**
 * @behavior Diagram style management and selected-style section routing.
 * @render Saved styles and named style inspector sections.
 */

import type { ReactElement } from "react";
import type { SelectionState } from "../../../../state/editorStates";
import type { TransactionResult } from "../../../../commands/editorCommands";
import type { DeclaredStyleView, DiagramView } from "../../../../views/schema";
import Button from "../../../../../Ui/chrome/primitives/Button/Button";
import ReservedBackLink from "../../../../../Ui/chrome/primitives/ReservedBackLink/ReservedBackLink";
import PaneSection from "../../../../../Ui/chrome/templates/PaneSection/PaneSection";
import ChangeStylePalette from "./ChangeStylePalette/ChangeStylePalette";
import SavedStyles from "./SavedStyles/SavedStyles";
import StyleNameEditor from "./StyleNameEditor/StyleNameEditor";
import { useInteractions } from "./useInteractions";
import { COLOR_PRESETS } from "../../../../config/stylePresets";
import { CLASS_STYLE_CONSTANTS } from "../../../../config/styleConstants";
import { toDocumentColors, toStrokeSelectUIProps } from "./childProps";

type DiagramEditPaneProps = {
  readonly view: Pick<DiagramView, "styles">;
  readonly selectionState: SelectionState;
  readonly onSelectionRestore: (selectionState: SelectionState) => void;
  readonly onStyleSelect: (styleDefId: DeclaredStyleView["styleDefId"]) => void;
  readonly onStyleCreateCommitted: (result: TransactionResult) => void;
  readonly onStyleRenameCommitted: (
    result: TransactionResult,
    previousStyleDefId: DeclaredStyleView["styleDefId"]
  ) => void;
};

export default function DiagramEditPane({
  view,
  selectionState,
  onSelectionRestore,
  onStyleSelect,
  onStyleCreateCommitted,
  onStyleRenameCommitted,
}: DiagramEditPaneProps): ReactElement {
  // View and State slice props derivation
  const declaredStyles = view.styles.filter((styleView) => styleView.kind === "declared");
  const namedStyles = declaredStyles;
  const selectedStyle =
    selectionState.kind === "style"
      ? namedStyles.find((styleView) => styleView.styleDefId === selectionState.styleDefId)
      : undefined;
  const origin = selectionState.kind === "style" ? selectionState.origin : undefined;

  // UI props derivation
  const documentColors = toDocumentColors(view.styles);
  const widthSelectUIProps = toStrokeSelectUIProps(
    view.styles,
    "strokeWidth",
    CLASS_STYLE_CONSTANTS.strokeWidth
  );
  const dashSelectUIProps = toStrokeSelectUIProps(
    view.styles,
    "strokeDasharray",
    CLASS_STYLE_CONSTANTS.strokeDasharray
  );

  // Event handler props derivation
  const { onCreate, onBack, onDelete, onNamedStylePropertyChange } = useInteractions({
    styles: declaredStyles,
    selectedStyle,
    origin,
    onSelectionRestore,
    onStyleCreateCommitted,
  });

  return (
    <>
      <ReservedBackLink label="← Back" visible={origin !== undefined} onClick={onBack} />
      <SavedStyles
        view={namedStyles}
        selectionState={selectionState}
        onStyleSelect={onStyleSelect}
        onCreate={onCreate}
      />
      {selectedStyle && selectionState.kind === "style" ? (
        <>
          <PaneSection label="Edit style">
            <StyleNameEditor
              view={namedStyles}
              selectionState={selectionState}
              onRenameCommitted={onStyleRenameCommitted}
            />
            <ChangeStylePalette
              view={selectedStyle.properties}
              presets={COLOR_PRESETS}
              documentColors={documentColors}
              widthSelectUIProps={widthSelectUIProps}
              dashSelectUIProps={dashSelectUIProps}
              onPropertyChange={onNamedStylePropertyChange}
            />
          </PaneSection>
          <PaneSection label="Actions">
            <Button label="Delete style" variant="danger" onClick={onDelete} />
          </PaneSection>
        </>
      ) : null}
    </>
  );
}
