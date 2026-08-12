/**
 * @behavior Placement drawing pointer lifecycle, class creation dispatch, and draw origin and draft rectangle updates from pointer gestures.
 * @framework React Flow canvas coordinates to View diagram placement.
 */

import { useCallback } from "react";
import type { Dispatch, PointerEvent, SetStateAction } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Point, Rect } from "../../../../../../shared/geometry";
import type { TransactionResult } from "../../../../../commands/editorCommands";
import { PLACEMENT_OVERLAY_DRAG_THRESHOLD } from "../../../../../config/editorUiConfig";
import { useDispatchTransaction } from "../../../../../contexts";
import type { NodePlacementState } from "../../../../../state/editorStates";
import type { DrawOrigin } from "./state";
import { toClassCreateTransaction, toNoteCreateTransaction } from "./transactions";
import { toDiagramPoint } from "./frameworkAdapters";
import { logAction } from "../../../../../../shared/logging";

type Interactions = {
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

type UseInteractionsInput = {
  readonly nodePlacementState: NodePlacementState;
  readonly origin: DrawOrigin | null;
  readonly setOrigin: Dispatch<SetStateAction<DrawOrigin | null>>;
  readonly setDraftRect: Dispatch<SetStateAction<Rect | null>>;
  readonly onPlacementComplete: (result: TransactionResult | null) => void;
};

export function useInteractions({
  nodePlacementState,
  origin,
  setOrigin,
  setDraftRect,
  onPlacementComplete,
}: UseInteractionsInput): Interactions {
  const { screenToFlowPosition } = useReactFlow();
  const dispatchCommand = useDispatchTransaction();

  // Event handler props derivation
  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      // Framework-domain command adaptation
      setOrigin({
        pointerId: event.pointerId,
        client: { x: event.clientX, y: event.clientY },
        diagram: toDiagramPoint(screenToFlowPosition({ x: event.clientX, y: event.clientY })),
      });
      setDraftRect(null);
    },
    [screenToFlowPosition, setOrigin, setDraftRect]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!origin || event.pointerId !== origin.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.getBoundingClientRect();
      setDraftRect(
        normalizeRect(
          { x: origin.client.x - bounds.left, y: origin.client.y - bounds.top },
          { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
        )
      );
    },
    [origin, setDraftRect]
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!origin || event.pointerId !== origin.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const endClient = { x: event.clientX, y: event.clientY };

      // Framework-domain command adaptation
      const endDiagramPoint = toDiagramPoint(screenToFlowPosition(endClient));
      const isMeaningfulDrag =
        Math.abs(endClient.x - origin.client.x) >= PLACEMENT_OVERLAY_DRAG_THRESHOLD ||
        Math.abs(endClient.y - origin.client.y) >= PLACEMENT_OVERLAY_DRAG_THRESHOLD;
      setOrigin(null);
      setDraftRect(null);
      if (!isMeaningfulDrag) return;

      // Implementing interaction through command transaction
      const rect = normalizeRect(origin.diagram, endDiagramPoint);
      logAction("create", nodePlacementState?.kind === "note" ? "note" : "class", rect);
      const result =
        nodePlacementState?.kind === "note"
          ? dispatchCommand(toNoteCreateTransaction(origin.diagram))
          : dispatchCommand(toClassCreateTransaction(rect));
      onPlacementComplete(result);
    },
    [
      dispatchCommand,
      nodePlacementState,
      onPlacementComplete,
      origin,
      screenToFlowPosition,
      setDraftRect,
      setOrigin,
    ]
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}

// Private helpers
function normalizeRect(first: Point, second: Point): Rect {
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  return { x, y, w: Math.abs(second.x - first.x), h: Math.abs(second.y - first.y) };
}
