/**
 * @behavior Selected class style section routing.
 * @render Class style inspector sections.
 */

import type { ReactElement } from "react";
import type { StyleDefId } from "../../../../../shared/ids";
import type { SelectionState } from "../../../../state/editorStates";
import type { TransactionResult } from "../../../../commands/editorCommands";
import type { DiagramView } from "../../../../views/schema";
import ChangeStylePalette from "./ChangeStylePalette/ChangeStylePalette";
import ClassActions from "./ClassActions/ClassActions";
import HeaderTextControls from "./HeaderTextControls/HeaderTextControls";
import NamedStyleSelector from "./NamedStyleSelector/NamedStyleSelector";
import { useInteractions } from "./useInteractions";
import PaneSection from "../../../../../Ui/chrome/templates/PaneSection/PaneSection";
import Button from "../../../../../Ui/chrome/primitives/Button/Button";
import ControlGroup from "../../../../../Ui/chrome/templates/ControlGroup/ControlGroup";
import { COLOR_PRESETS } from "../../../../config/stylePresets";
import { CLASS_STYLE_CONSTANTS } from "../../../../config/styleConstants";
import { toDocumentColors, toStrokeSelectUIProps } from "./childProps";

type ClassEditPaneProps = {
  readonly view: Pick<DiagramView, "classes" | "styles">;
  readonly selectionState: Extract<SelectionState, { readonly kind: "classes" }>;
  readonly onStyleSelect: (
    styleDefId: StyleDefId,
    origin: Extract<SelectionState, { readonly kind: "classes" }>
  ) => void;
  readonly onStyleCreateCommitted: (
    result: TransactionResult,
    origin: Extract<SelectionState, { readonly kind: "classes" }>
  ) => void;
};

export default function ClassEditPane({
  view,
  selectionState,
  onStyleSelect,
  onStyleCreateCommitted,
}: ClassEditPaneProps): ReactElement {
  // View and State slice props derivation
  const selectedClassIds = new Set(selectionState.classIds);
  const declaredStyles = view.styles.filter((styleView) => styleView.kind === "declared");
  const selectedClasses = view.classes.filter((classView) =>
    selectedClassIds.has(classView.classId)
  );
  const selectedNamedStyleId =
    selectedClasses.length === 1 ? selectedClasses[0]?.appliedStyleId : undefined;
  const selectedNamedStyle = selectedNamedStyleId
    ? declaredStyles.find((styleView) => styleView.styleDefId === selectedNamedStyleId)
    : undefined;
  const selectedDirectStyle =
    selectedClasses.length === 1 && !selectedClasses[0]?.appliedStyleId && selectedClasses[0]?.style
      ? selectedClasses[0]
      : undefined;
  const origin = selectionState;

  // UI props derivation
  const styleActionLabel = selectedNamedStyle ? "Edit style" : "Save style";
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
  const { onNameCommit, onAnnotationCommit, onLabelCommit, onStyleAction } = useInteractions({
    styles: declaredStyles,
    selectedNamedStyle,
    selectedDirectStyle,
    origin,
    onStyleSelect,
    onStyleCreateCommitted,
  });

  return (
    <>
      {selectedClasses.length === 1 ? (
        <PaneSection label="Class properties">
          <HeaderTextControls
            view={selectedClasses[0]}
            styleControl={
              <ControlGroup>
                <NamedStyleSelector view={selectedClasses} styles={declaredStyles} />
                <Button
                  label={styleActionLabel}
                  variant="rowAction"
                  disabled={!selectedNamedStyle && !selectedDirectStyle}
                  onClick={onStyleAction}
                />
              </ControlGroup>
            }
            onNameCommit={onNameCommit}
            onAnnotationCommit={onAnnotationCommit}
            onLabelCommit={onLabelCommit}
          />
        </PaneSection>
      ) : null}
      <PaneSection label="Configure style">
        <ChangeStylePalette
          view={selectedClasses}
          presets={COLOR_PRESETS}
          documentColors={documentColors}
          widthSelectUIProps={widthSelectUIProps}
          dashSelectUIProps={dashSelectUIProps}
        />
      </PaneSection>
      <PaneSection label="Actions">
        <ClassActions view={selectedClasses} />
      </PaneSection>
    </>
  );
}
