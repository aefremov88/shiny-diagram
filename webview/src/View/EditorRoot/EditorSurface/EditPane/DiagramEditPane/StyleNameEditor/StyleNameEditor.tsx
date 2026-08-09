/**
 * @behavior Style name validation and commit routing.
 * @render Named style swatch and commit name field.
 */

import type { ReactElement } from "react";
import type { DeclaredStyleView } from "../../../../../views/schema";
import type { SelectionState } from "../../../../../state/editorStates";
import type { TransactionResult } from "../../../../../commands/editorCommands";
import { CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX } from "../../../../../config/editorUiConfig";
import CommitTextField from "../../../../../../Ui/chrome/composites/CommitTextField/CommitTextField";
import FieldGrid from "../../../../../../Ui/chrome/templates/FieldGrid/FieldGrid";
import { useInteractions } from "./useInteractions";

type StyleNameEditorProps = {
  readonly view: readonly DeclaredStyleView[];
  readonly selectionState: Extract<SelectionState, { readonly kind: "style" }>;
  readonly onRenameCommitted: (
    result: TransactionResult,
    previousStyleDefId: DeclaredStyleView["styleDefId"]
  ) => void;
};

export default function StyleNameEditor({
  view,
  selectionState,
  onRenameCommitted,
}: StyleNameEditorProps): ReactElement {
  // View and State slice props derivation
  const selectedStyle = view.find(
    (styleView) => styleView.styleDefId === selectionState.styleDefId
  );

  // Event handler props derivation
  const { onNameCommit } = useInteractions({
    view: selectedStyle,
    onRenameCommitted,
  });

  // Child component routing
  if (!selectedStyle) return <></>;

  return (
    <FieldGrid
      variant="styleName"
      rows={[
        {
          label: "Name",
          control: (
            <CommitTextField
              initialValue={selectedStyle.name}
              validate={(draft) => validateStyleName(draft, selectedStyle, view)}
              ariaLabel="Style name"
              isLabelVisible={false}
              validationStacking={CHROME_VALIDATION_ABOVE_CONTROL_Z_INDEX}
              onCommit={onNameCommit}
              onDiscard={() => undefined}
              onCancel={() => undefined}
            />
          ),
        },
      ]}
    />
  );
}

// Private helpers
function validateStyleName(
  draft: string,
  view: DeclaredStyleView,
  styles: readonly DeclaredStyleView[]
): readonly string[] {
  const name = toStyleName(draft);
  if (name === "") return [];
  return styles.some(
    (styleView) => styleView.styleDefId !== view.styleDefId && styleView.name === name
  )
    ? [`Style "${name}" already exists.`]
    : [];
}

function toStyleName(value: string): string {
  return value
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(toCapitalizedWord)
    .join("");
}

function toCapitalizedWord(value: string): string {
  const lower = value.toLowerCase();
  return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
}
