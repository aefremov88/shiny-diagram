/**
 * @render Note attachment edge path.
 */

import type { ReactElement } from "react";
import AttachmentEdge from "../../../../../../../Ui/canvas/composites/AttachmentEdge/AttachmentEdge";

type NoteAttachmentEdgeProps = {
  readonly edgePath: string;
};

export default function NoteAttachmentEdge({ edgePath }: NoteAttachmentEdgeProps): ReactElement {
  return <AttachmentEdge d={edgePath} />;
}
