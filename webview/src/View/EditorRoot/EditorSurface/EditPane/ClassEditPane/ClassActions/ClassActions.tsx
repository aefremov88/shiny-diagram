/**
 * @behavior Class action interaction routing.
 * @render Duplicate and delete class actions.
 */

import { useEffect, type ReactElement } from "react";
import type { ClassView } from "../../../../../views/schema";
import { shouldIgnoreKeyboardShortcutEvent } from "../../../../../utils/keyboardEvents";
import Button from "../../../../../../Ui/chrome/primitives/Button/Button";
import ControlGroup from "../../../../../../Ui/chrome/templates/ControlGroup/ControlGroup";
import { useInteractions } from "./useInteractions";

type ClassActionsProps = {
  readonly view: readonly ClassView[];
};

export default function ClassActions({ view }: ClassActionsProps): ReactElement {
  // Event handler props derivation
  const { onDuplicate, onDelete } = useInteractions(view);

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
