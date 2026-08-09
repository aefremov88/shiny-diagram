/**
 * @behavior Relationship duplicate and delete action routing.
 * @render Relationship action buttons.
 */

import { useEffect, type ReactElement } from "react";
import type { RelationshipSeed } from "../../../../../state/editorStates";
import type { RelationshipView } from "../../../../../views/schema";
import { shouldIgnoreKeyboardShortcutEvent } from "../../../../../utils/keyboardEvents";
import Button from "../../../../../../Ui/chrome/primitives/Button/Button";
import ControlGroup from "../../../../../../Ui/chrome/templates/ControlGroup/ControlGroup";
import { useInteractions } from "./useInteractions";

type EdgeActionsProps = {
  readonly view: RelationshipView;
  readonly onRelationshipDuplicate: (seed: RelationshipSeed) => void;
};

export default function EdgeActions({
  view,
  onRelationshipDuplicate,
}: EdgeActionsProps): ReactElement {
  // Event handler props derivation
  const { onDuplicate, onDelete } = useInteractions(view, onRelationshipDuplicate);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Delete" || shouldIgnoreKeyboardShortcutEvent(event)) return;

      event.preventDefault();
      onDelete();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDelete]);

  return (
    <ControlGroup columns={2}>
      <Button label="Duplicate" onClick={onDuplicate} />
      <Button label="Delete" variant="danger" onClick={onDelete} />
    </ControlGroup>
  );
}
