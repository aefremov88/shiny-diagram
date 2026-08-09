/**
 * @behavior Placement gesture state lifecycle and active placement routing.
 * @render Placement interaction overlay and draft rectangle.
 * @framework Translates internal React Flow coordinates into diagram coordinates.
 */

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { NodePlacementState } from "../../../../../state/editorStates";
import type { TransactionResult } from "../../../../../commands/editorCommands";
import { PLACEMENT_OVERLAY_Z_INDEX } from "../../../../../config/editorUiConfig";
import RectDrawOverlay from "../../../../../../Ui/canvas/composites/RectDrawOverlay/RectDrawOverlay";
import { toInitialDraftRect, toInitialOrigin } from "./state";
import { useInteractions } from "./useInteractions";

type PlacementOverlayProps = {
  readonly nodePlacementState: NodePlacementState;
  readonly onPlacementComplete: (result: TransactionResult | null) => void;
};

export default function PlacementOverlay({
  nodePlacementState,
  onPlacementComplete,
}: PlacementOverlayProps): ReactElement | null {
  // State creation: local states - draw gesture anchor and current placement outline
  const [origin, setOrigin] = useState(() => toInitialOrigin());
  const [draftRect, setDraftRect] = useState(() => toInitialDraftRect());

  // UI props derivation

  // Event handler props derivation
  const { onPointerDown, onPointerMove, onPointerUp } = useInteractions({
    nodePlacementState,
    origin,
    setOrigin,
    setDraftRect,
    onPlacementComplete,
  });

  // Keystroke listener registration
  useEffect(() => {
    if (nodePlacementState?.kind !== "class" && nodePlacementState?.kind !== "note") return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onPlacementComplete(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nodePlacementState, onPlacementComplete]);

  // Child component routing
  if (nodePlacementState?.kind !== "class" && nodePlacementState?.kind !== "note") return null;

  return (
    <RectDrawOverlay
      rect={draftRect}
      stacking={PLACEMENT_OVERLAY_Z_INDEX}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}
