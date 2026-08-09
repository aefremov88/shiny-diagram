/**
 * @behavior Class header commit adapters.
 * @render Class header text controls.
 */

import type { ReactElement } from "react";
import type { ReactNode } from "react";
import type { ClassId } from "../../../../../../shared/ids";
import type { ClassAnnotation } from "../../../../../../shared/uml";
import type { ClassView } from "../../../../../views/schema";
import {
  CHROME_MENU_ABOVE_CONTROL_Z_INDEX,
  CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX,
} from "../../../../../config/editorUiConfig";
import CommitClearableTextField from "../../../../../../Ui/chrome/composites/CommitClearableTextField/CommitClearableTextField";
import CommitComboBox from "../../../../../../Ui/chrome/composites/CommitComboBox/CommitComboBox";
import CommitTextField from "../../../../../../Ui/chrome/composites/CommitTextField/CommitTextField";
import FieldGrid from "../../../../../../Ui/chrome/templates/FieldGrid/FieldGrid";

type HeaderTextControlsProps = {
  readonly view: ClassView;
  readonly styleControl: ReactNode;
  readonly onNameCommit: (classId: ClassId, name: string) => readonly string[];
  readonly onAnnotationCommit: (
    classId: ClassId,
    annotation: ClassAnnotation | null
  ) => readonly string[];
  readonly onLabelCommit: (classId: ClassId, label: string | null) => readonly string[];
};

const ANNOTATION_PRESETS = ["interface", "abstract", "service", "enumeration"] as const;

export default function HeaderTextControls({
  view,
  styleControl,
  onNameCommit,
  onAnnotationCommit,
  onLabelCommit,
}: HeaderTextControlsProps): ReactElement {
  const label = view.header.label === view.header.name ? "" : view.header.label;

  return (
    <FieldGrid
      variant="headerText"
      rows={[
        {
          label: "",
          control: (
            <CommitComboBox
              initialValue={view.header.stereotype ?? ""}
              options={[
                { value: "", label: "No annotaion" },
                ...ANNOTATION_PRESETS.map((preset) => ({
                  value: preset,
                  label: preset,
                })),
              ]}
              validate={() => []}
              ariaLabel="Annotation"
              isLabelVisible={false}
              menuStacking={CHROME_MENU_ABOVE_CONTROL_Z_INDEX}
              validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
              onCommit={(draft) => onAnnotationCommit(view.classId, draft.trim() || null)}
              onDiscard={() => undefined}
              onCancel={() => undefined}
            />
          ),
        },
        {
          label: "Name",
          control: (
            <CommitTextField
              initialValue={view.header.name}
              validate={(draft) => onNameCommit(view.classId, draft.trim())}
              ariaLabel="Name"
              isLabelVisible={false}
              validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
              onCommit={() => undefined}
              onDiscard={() => undefined}
              onCancel={() => undefined}
            />
          ),
        },
        {
          label: "Label",
          control: (
            <CommitClearableTextField
              initialValue={label}
              validate={() => []}
              ariaLabel="Label"
              isLabelVisible={false}
              validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
              onCommit={(draft) => onLabelCommit(view.classId, draft.trim() || null)}
              onClear={() => onLabelCommit(view.classId, null)}
              onDiscard={() => undefined}
              onCancel={() => undefined}
            />
          ),
        },
        {
          label: "Style",
          alignment: "start",
          control: styleControl,
        },
      ]}
    />
  );
}
