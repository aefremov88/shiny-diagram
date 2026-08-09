/**
 * @behavior Selected note action routing.
 * @render Note inspector actions.
 */

import type { ReactElement } from "react";
import type { NoteId } from "../../../../../shared/ids";
import type { StyleProperties } from "../../../../../shared/style";
import type { TransactionResult } from "../../../../commands/editorCommands";
import type { NoteView } from "../../../../views/schema";
import Button from "../../../../../Ui/chrome/primitives/Button/Button";
import PaneSection from "../../../../../Ui/chrome/templates/PaneSection/PaneSection";
import ControlGroup from "../../../../../Ui/chrome/templates/ControlGroup/ControlGroup";
import StyledBoxSwatch from "../../../../../Ui/chrome/primitives/StyledBoxSwatch/StyledBoxSwatch";
import { useInteractions } from "./useInteractions";

type NoteEditPaneProps = {
  readonly view: NoteView;
  readonly attachedClassLabel: string | null;
  readonly attachedClassStyle: Partial<StyleProperties> | null;
  readonly onNoteAttachStart: (noteId: NoteId) => void;
  readonly onNoteDuplicateCommitted: (result: TransactionResult) => void;
};

export default function NoteEditPane({
  view,
  attachedClassLabel,
  attachedClassStyle,
  onNoteAttachStart,
  onNoteDuplicateCommitted,
}: NoteEditPaneProps): ReactElement {
  // Event handler props derivation
  const { onAttachmentToggle, onDuplicate, onDelete } = useInteractions({
    view,
    onNoteAttachStart,
    onNoteDuplicateCommitted,
  });

  return (
    <>
      <PaneSection label="Attachment" spacingAfter="compact">
        {attachedClassLabel && attachedClassStyle ? (
          <>
            <StyledBoxSwatch styleValues={attachedClassStyle} label={attachedClassLabel} />
            <Button label="Detach" variant="rowAction" onClick={onAttachmentToggle} />
          </>
        ) : (
          <>
            <Button label="Attach to class" onClick={onAttachmentToggle} />
            <Button label="Detach" variant="rowAction" visible={false} />
          </>
        )}
      </PaneSection>
      <PaneSection label="Actions">
        <ControlGroup columns={2}>
          <Button label="Duplicate" onClick={onDuplicate} />
          <Button label="Delete" variant="danger" onClick={onDelete} />
        </ControlGroup>
      </PaneSection>
    </>
  );
}
