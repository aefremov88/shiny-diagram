/**
 * @fileoverview Translates `note.spatial.set`.
 */

import type { EditorCommandOf } from "../../../../View/commands";
import type { DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import { anchorAboveStatement } from "../../anchors/statementAnchors";
import { composeNoteAnnotation } from "../../syntax/noteSyntax";
import type { WriteIntent } from "../../writeIntent";

/**
 * Makes one of two write options:
 *
 * a. note annotation already written → Makes four writes:
 *    1. spatial coordinate **value** for x
 *       - in place
 *    2. spatial coordinate **value** for y
 *       - in place
 *    3. spatial coordinate **value** for w
 *       - in place
 *    4. spatial coordinate **value** for h
 *       - in place
 *
 * b. otherwise → note annotation **statement**, in **diagram body**
 *    - directly above the bound note statement
 */
export function translateNoteSpatialSet(
  command: EditorCommandOf<"note.spatial.set">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex
): WriteIntent[] {
  void graph;
  if (!provenance.noteAnnotations.has(command.noteId)) {
    const anchor = anchorAboveStatement(provenance, { kind: "note", noteId: command.noteId });
    if (!anchor) throw new Error(`Missing provenance for note ${command.noteId}`);
    return [{ kind: "insertStatement", payload: composeNoteAnnotation(command.spatial), anchor }];
  }
  return [
    { coord: "x" as const, value: Math.round(command.spatial.position.x) },
    { coord: "y" as const, value: Math.round(command.spatial.position.y) },
    { coord: "w" as const, value: command.spatial.size.width },
    { coord: "h" as const, value: command.spatial.size.height },
  ].map(({ coord, value }) => ({
    kind: "replaceValue",
    target: { kind: "noteSpatialCoord", noteId: command.noteId, coord },
    payload: String(value),
  }));
}
