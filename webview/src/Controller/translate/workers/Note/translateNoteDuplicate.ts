/**
 * @fileoverview Translates `note.duplicate`.
 */

import type { EditorCommandOf } from "../../../../View/commands";
import type { SpatialAttachment } from "../../../../shared/geometry";
import type { NoteId } from "../../../../shared/ids";
import type { DiagramGraph } from "../../../model/diagramGraph";
import { composeNoteId } from "../../../model/noteIdentity";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import { anchorAfterExactStatement, asSameKind } from "../../anchors/statementAnchors";
import { insertNotePair } from "../../placement/notePairPlacement";
import type { TranslateContext } from "../../translateContext";
import type { StatementAnchor, WriteIntent } from "../../writeIntent";

const DUPLICATE_OFFSET = 24;

/**
 * Makes two writes:
 *
 * 1. note annotation **statement**, in **diagram body**
 *    - after the source note statement
 * 2. note **statement**, in **diagram body**
 *    - immediately after the new note annotation statement
 *
 * Errors when the source note, its spatial data, or its source statement is missing.
 */
export function translateNoteDuplicate(
  command: EditorCommandOf<"note.duplicate">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  context: TranslateContext
): WriteIntent[] {
  const note = graph.notes.get(command.noteId);
  if (!note) throw new Error(`Note ${command.noteId} does not exist`);
  if (!note.spatial) throw new Error(`Note ${command.noteId} has no spatial data`);

  context.recordNoteCreated(composeNoteId(graph.notes.size + context.noteCreateCount()));

  return insertNotePair(
    { text: note.text, attachedToClassId: note.attachedToClassId },
    offsetSpatial(note.spatial),
    requireExactAnchor(provenance, command.noteId)
  );
}

function offsetSpatial(spatial: SpatialAttachment): SpatialAttachment {
  return {
    position: {
      x: spatial.position.x + DUPLICATE_OFFSET,
      y: spatial.position.y + DUPLICATE_OFFSET,
    },
    size: spatial.size,
  };
}

function requireExactAnchor(provenance: ProvenanceIndex, noteId: NoteId): StatementAnchor {
  const anchor = asSameKind(anchorAfterExactStatement(provenance, { kind: "note", noteId }));
  if (!anchor) throw new Error(`Missing provenance for note ${noteId} duplicate anchor`);
  return anchor;
}
