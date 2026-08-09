/**
 * @render Note attachment ghost line.
 */

import type { ReactElement } from "react";
import type { Point } from "../../../../../../shared/geometry";
import { NOTE_ATTACH_GHOST_Z_INDEX } from "../../../../../config/editorUiConfig";
import EdgeGhostLine from "../../../../../../Ui/canvas/primitives/EdgeGhostLine/EdgeGhostLine";
import CanvasOverlayFrame from "../../../../../../Ui/canvas/templates/CanvasOverlayFrame/CanvasOverlayFrame";

type NoteAttachGhostLineProps = {
  readonly sourcePoint: Point;
  readonly targetPoint: Point;
};

export default function NoteAttachGhostLine({
  sourcePoint,
  targetPoint,
}: NoteAttachGhostLineProps): ReactElement {
  return (
    <CanvasOverlayFrame stacking={NOTE_ATTACH_GHOST_Z_INDEX}>
      <EdgeGhostLine
        d={`M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`}
        lineKind="dashed"
        tone="attachment"
      />
    </CanvasOverlayFrame>
  );
}
