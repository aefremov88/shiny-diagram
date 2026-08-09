/**
 * @fileoverview Translates `note.attachment.set`.
 */

import type { EditorCommandOf } from "../../../../View/commands";
import type { NoteId } from "../../../../shared/ids";
import type { DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import type { SourceSpan } from "../../../model/sourceEdit";
import {
  anchorBlockOpening,
  anchorAfterExactStatement,
  asSameKind,
  type StatementKind,
} from "../../anchors/statementAnchors";
import { composeNoteStatement } from "../../syntax/noteSyntax";
import type { StatementAnchor, StatementRef, WriteIntent } from "../../writeIntent";

/**
 * Makes two writes:
 *
 * 1. new note **statement**, in **diagram body**
 *    - at the old location, immediately after the bound note annotation statement when it
 *      exists
 * 2. old note **statement** deleted
 *
 * Errors when the note or requested attachment class is missing.
 */
export function translateNoteAttachmentSet(
  command: EditorCommandOf<"note.attachment.set">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex
): WriteIntent[] {
  const note = graph.notes.get(command.noteId);
  if (!note) throw new Error(`Note ${command.noteId} does not exist`);
  if (command.attachedToClassId && !graph.classes.has(command.attachedToClassId)) {
    throw new Error(`Class ${command.attachedToClassId} does not exist`);
  }

  return [
    {
      kind: "insertStatement",
      payload: composeNoteStatement({
        text: note.text,
        attachedToClassId: command.attachedToClassId,
      }),
      anchor: toReplacementAnchor(command.noteId, provenance),
    },
    { kind: "deleteStatement", target: { kind: "note", noteId: command.noteId } },
  ];
}

function toReplacementAnchor(noteId: NoteId, provenance: ProvenanceIndex): StatementAnchor {
  const annotationAnchor = asSameKind(
    anchorAfterExactStatement(provenance, { kind: "noteAnnotation", noteId })
  );
  if (annotationAnchor) return annotationAnchor;

  const noteRecord = provenance.notes.get(noteId);
  if (!noteRecord) throw new Error(`Missing provenance for note ${noteId}`);
  const previous = findPreviousStatement(provenance, noteRecord.self);
  return previous
    ? { kind: "afterSameKind", statement: previous }
    : anchorBlockOpening({ kind: "diagram" });
}

function findPreviousStatement(
  provenance: ProvenanceIndex,
  before: SourceSpan
): StatementRef | null {
  const candidates: Array<{ readonly ref: StatementRef; readonly span: SourceSpan }> = [
    ...entries(provenance.classes, "class", "classId"),
    ...entries(provenance.namespaces, "namespace", "namespaceId"),
    ...entries(provenance.shortMembers, "shortMember", "memberId"),
    ...entries(provenance.relationships, "relationship", "relationshipId"),
    ...entries(provenance.lollipopInterfaces, "lollipopInterface", "lollipopInterfaceId"),
    ...entries(provenance.styleDefinitions, "styleDefinition", "styleDefId"),
    ...entries(provenance.classDirectStyles, "classDirectStyle", "classId"),
    ...entries(provenance.styleApplications, "styleApplication", "styleApplicationId"),
    ...entries(provenance.classSpatial, "classSpatial", "classId"),
    ...entries(provenance.noteAnnotations, "noteAnnotation", "noteId"),
    ...entries(provenance.notes, "note", "noteId"),
  ].filter((candidate) => compareSpans(candidate.span, before) < 0);

  candidates.sort((left, right) => compareSpans(right.span, left.span));
  return candidates[0]?.ref ?? null;
}

function entries<Id, Key extends string>(
  records: ReadonlyMap<Id, { readonly self: SourceSpan }>,
  kind: StatementKind,
  key: Key
): Array<{ readonly ref: StatementRef; readonly span: SourceSpan }> {
  return [...records.entries()].map(([id, record]) => ({
    ref: { kind, [key]: id } as unknown as StatementRef,
    span: record.self,
  }));
}

function compareSpans(left: SourceSpan, right: SourceSpan): number {
  return (
    left.start.line - right.start.line ||
    left.start.character - right.start.character ||
    left.end.line - right.end.line ||
    left.end.character - right.end.character
  );
}
