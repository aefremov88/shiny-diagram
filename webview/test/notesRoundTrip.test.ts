import { describe, expect, it } from "vitest";
import type { EditorCommandTransaction } from "../src/View/commands";
import { toClassId } from "../src/shared/ids";
import { composeNoteId } from "../src/Controller/model/noteIdentity";
import type { SourceEdit, SourcePosition } from "../src/Controller/model/sourceEdit";
import { parseDiagram } from "../src/Controller/parse";
import { resolveIntents } from "../src/Controller/resolve";
import { translateCommands } from "../src/Controller/translate";

describe("note command round trips", () => {
  it("creates a note and then edits created note text in a separate transaction", () => {
    let source = baseSource();

    const create = dispatch(source, [
      {
        type: "note.create",
        text: "New note",
        spatial: { position: { x: 300, y: 120 }, size: { width: 160, height: 90 } },
        attachedToClassId: null,
      },
    ]);
    source = create.source;

    expect(create.outcome.notes.created).toEqual([composeNoteId(1)]);
    expect(parseReady(source).graph.notes.get(composeNoteId(1))).toMatchObject({
      text: "New note",
      spatial: { position: { x: 300, y: 120 }, size: { width: 160, height: 90 } },
    });

    source = dispatch(source, [
      { type: "note.text.set", noteId: composeNoteId(1), text: "Edited\nacross lines" },
    ]).source;

    expect(source).toContain(String.raw`note "Edited\nacross lines"`);
    expect(parseReady(source).graph.notes.get(composeNoteId(1))?.text).toBe("Edited\nacross lines");
  });

  it("creates the first note with its annotation directly adjacent to the note statement", () => {
    const result = dispatch(`classDiagram\nclass User\n%% @spatial:User x=10 y=20 w=220 h=160\n`, [
      {
        type: "note.create",
        text: "First note",
        spatial: { position: { x: 300, y: 120 }, size: { width: 160, height: 90 } },
        attachedToClassId: null,
      },
    ]);

    expect(result.source).toContain('%% @note: x=300 y=120 w=160 h=90\nnote "First note"');
    expect(result.source).not.toContain("@note: x=300 y=120 w=160 h=90\n\nnote");
    expect(parseReady(result.source).graph.notes.get(composeNoteId(0))?.spatial).toEqual({
      position: { x: 300, y: 120 },
      size: { width: 160, height: 90 },
    });
  });

  it("can attach and duplicate a newly-created first note after reparse", () => {
    let source = dispatch(`classDiagram\nclass User\n%% @spatial:User x=10 y=20 w=220 h=160\n`, [
      {
        type: "note.create",
        text: "First note",
        spatial: { position: { x: 300, y: 120 }, size: { width: 160, height: 90 } },
        attachedToClassId: null,
      },
    ]).source;

    source = dispatch(source, [
      {
        type: "note.attachment.set",
        noteId: composeNoteId(0),
        attachedToClassId: toClassId("User"),
      },
    ]).source;

    expect(parseReady(source).graph.notes.get(composeNoteId(0))?.attachedToClassId).toBe(
      toClassId("User")
    );

    const duplicated = dispatch(source, [{ type: "note.duplicate", noteId: composeNoteId(0) }]);

    expect(duplicated.outcome.notes.created).toEqual([composeNoteId(1)]);
    expect(parseReady(duplicated.source).graph.notes.get(composeNoteId(1))).toMatchObject({
      text: "First note",
      attachedToClassId: toClassId("User"),
      spatial: { position: { x: 324, y: 144 }, size: { width: 160, height: 90 } },
    });
  });

  it("updates note spatial coordinates", () => {
    const source = dispatch(baseSource(), [
      {
        type: "note.spatial.set",
        noteId: composeNoteId(0),
        spatial: { position: { x: 10, y: 11 }, size: { width: 120, height: 70 } },
      },
    ]).source;

    expect(parseReady(source).graph.notes.get(composeNoteId(0))?.spatial).toEqual({
      position: { x: 10, y: 11 },
      size: { width: 120, height: 70 },
    });
  });

  it("inserts missing spatial directly above a note after a blank line", () => {
    const source = `classDiagram
note "Previous"

note "Target"
`;
    const result = dispatch(source, [missingSpatialCommand(composeNoteId(1))]);

    expect(result.source).toBe(`classDiagram
note "Previous"

%% @note: x=10 y=21 w=100 h=80
note "Target"
`);
  });

  it("inserts missing spatial directly above a note after a comment", () => {
    const source = `classDiagram
note "Previous"
%% explanatory comment
note "Target"
`;
    const result = dispatch(source, [missingSpatialCommand(composeNoteId(1))]);

    expect(result.source).toBe(`classDiagram
note "Previous"
%% explanatory comment
%% @note: x=10 y=21 w=100 h=80
note "Target"
`);
  });

  it("inserts missing spatial directly above the first note statement", () => {
    const source = `classDiagram
note "Target"
`;
    const result = dispatch(source, [missingSpatialCommand(composeNoteId(0))]);

    expect(result.source).toBe(`classDiagram
%% @note: x=10 y=21 w=100 h=80
note "Target"
`);
  });

  it("copies missing-spatial indentation from the target note", () => {
    const source = `classDiagram
note "Previous"
    note "Target"
`;
    const result = dispatch(source, [missingSpatialCommand(composeNoteId(1))]);

    expect(result.source).toBe(`classDiagram
note "Previous"
    %% @note: x=10 y=21 w=100 h=80
    note "Target"
`);
  });

  it("binds generated spatial after reparse and preserves every other line", () => {
    const source = `classDiagram
class User
%% @spatial:User x=10 y=20 w=220 h=160
note "Previous"

note "Target"
`;
    const result = dispatch(source, [missingSpatialCommand(composeNoteId(1))]);
    const reparsed = parseReady(result.source);

    expect(reparsed.graph.notes.get(composeNoteId(1))?.spatial).toEqual({
      position: { x: 10, y: 21 },
      size: { width: 100, height: 80 },
    });
    expect(
      result.source
        .split("\n")
        .filter((line) => !line.startsWith("%% @note:"))
        .join("\n")
    ).toBe(source);
  });

  it("attaches and detaches without changing the annotation line", () => {
    const attached = dispatch(baseSource(), [
      {
        type: "note.attachment.set",
        noteId: composeNoteId(0),
        attachedToClassId: toClassId("User"),
      },
    ]).source;

    expect(noteAnnotationLine(attached)).toBe("%% @note: x=100 y=120 w=200 h=80");
    expect(parseReady(attached).graph.notes.get(composeNoteId(0))?.attachedToClassId).toBe(
      toClassId("User")
    );

    const detached = dispatch(attached, [
      { type: "note.attachment.set", noteId: composeNoteId(0), attachedToClassId: null },
    ]).source;

    expect(noteAnnotationLine(detached)).toBe("%% @note: x=100 y=120 w=200 h=80");
    expect(parseReady(detached).graph.notes.get(composeNoteId(0))?.attachedToClassId).toBeNull();
  });

  it("duplicates a note with offset spatial data and reports the created id", () => {
    const result = dispatch(baseSource(), [{ type: "note.duplicate", noteId: composeNoteId(0) }]);
    const note = parseReady(result.source).graph.notes.get(composeNoteId(1));

    expect(result.outcome.notes.created).toEqual([composeNoteId(1)]);
    expect(note).toMatchObject({
      text: "Existing",
      spatial: { position: { x: 124, y: 144 }, size: { width: 200, height: 80 } },
    });
  });

  it("deletes an annotated note as annotation plus statement pair", () => {
    const source = dispatch(baseSource(), [
      { type: "note.delete", noteId: composeNoteId(0) },
    ]).source;

    expect(source).not.toContain("@note:");
    expect(source).not.toContain('note "Existing"');
    expect(parseReady(source).graph.notes.size).toBe(0);
  });
});

function baseSource(): string {
  return `classDiagram
class User
%% @spatial:User x=10 y=20 w=220 h=160
%% @note: x=100 y=120 w=200 h=80
note "Existing"
`;
}

function dispatch(source: string, transaction: EditorCommandTransaction) {
  const parsed = parseReady(source);
  const translated = translateCommands(transaction, parsed.graph, parsed.provenance, source);
  const edits = resolveIntents(translated.intents, parsed.provenance, source);
  return { source: applyEdits(source, edits), outcome: translated.outcome };
}

function parseReady(source: string) {
  const result = parseDiagram(source);
  if (result.status !== "ready") throw new Error(`Expected ready parse, got ${result.status}`);
  return result;
}

function noteAnnotationLine(source: string): string {
  return source.split("\n").find((line) => line.includes("@note:")) ?? "";
}

function missingSpatialCommand(noteId: ReturnType<typeof composeNoteId>) {
  return {
    type: "note.spatial.set" as const,
    noteId,
    spatial: { position: { x: 10.4, y: 20.6 }, size: { width: 100, height: 80 } },
  };
}

function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  return [...edits]
    .sort(
      (left, right) => positionToOffset(source, right.start) - positionToOffset(source, left.start)
    )
    .reduce(
      (nextSource, edit) =>
        `${nextSource.slice(0, positionToOffset(source, edit.start))}${edit.replacementText}${nextSource.slice(
          positionToOffset(source, edit.end)
        )}`,
      source
    );
}

function positionToOffset(source: string, position: SourcePosition): number {
  let offset = 0;
  let line = 0;
  while (line < position.line && offset < source.length) {
    const nextLf = source.indexOf("\n", offset);
    if (nextLf === -1) return source.length;
    offset = nextLf + 1;
    line++;
  }
  return offset + position.character;
}
