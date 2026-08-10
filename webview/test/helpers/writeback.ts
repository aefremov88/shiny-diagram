import { expect } from "vitest";
import type { EditorCommand, TransactionOutcome } from "../../src/View/commands";
import type { DiagramGraph } from "../../src/Controller/model/diagramGraph";
import type { SourceEdit, SourcePosition } from "../../src/Controller/model/sourceEdit";
import { parseDiagram } from "../../src/Controller/parse";
import { resolveIntents } from "../../src/Controller/resolve";
import { translateCommands } from "../../src/Controller/translate";

export type ExpectedWritebackEffect = {
  readonly targetLines: readonly RegExp[];
  readonly assertGraph: (graph: DiagramGraph, resultingSource: string) => void;
  readonly outcome?: Partial<TransactionOutcome>;
};

export function expectWriteback(
  command: EditorCommand,
  initialSource: string,
  expected: ExpectedWritebackEffect
): { readonly source: string; readonly outcome: TransactionOutcome } {
  let resultingSource = "<translation did not complete>";
  try {
    const initial = parseGraph(initialSource);
    const translated = translateCommands(
      [command],
      initial.graph,
      initial.provenance,
      initialSource
    );
    const edits = resolveIntents(translated.intents, initial.provenance, initialSource);
    resultingSource = applyEdits(initialSource, edits);
    const reparsed = parseGraph(resultingSource);

    expected.assertGraph(reparsed.graph, resultingSource);
    assertUntargetedLinesPreserved(initialSource, resultingSource, edits, expected.targetLines);
    if (expected.outcome) expect(translated.outcome).toMatchObject(expected.outcome);
    return { source: resultingSource, outcome: translated.outcome };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${message}\n\nINITIAL SOURCE\n${initialSource}\n\nRESULTING SOURCE\n${resultingSource}`
    );
  }
}

function parseGraph(source: string) {
  const result = parseDiagram(source);
  if (result.status !== "ready" && result.status !== "missingAnnotations") {
    throw new Error(`Expected a graph parse, received ${result.status}`);
  }
  return result;
}

function assertUntargetedLinesPreserved(
  initial: string,
  resulting: string,
  edits: readonly SourceEdit[],
  targets: readonly RegExp[]
): void {
  const editedLines = new Set<number>();
  edits.forEach((edit) => {
    const finalLine =
      edit.end.character === 0 && edit.end.line > edit.start.line
        ? edit.end.line - 1
        : edit.end.line;
    for (let line = edit.start.line; line <= finalLine; line++) editedLines.add(line);
  });
  const untouched = initial
    .split(/(?<=\n)/)
    .filter(
      (line, index) => !editedLines.has(index) && !targets.some((pattern) => pattern.test(line))
    );
  const resultLines = resulting.split(/(?<=\n)/);
  let cursor = 0;
  untouched.forEach((line) => {
    cursor = resultLines.indexOf(line, cursor);
    expect(
      cursor,
      `Untargeted line changed or disappeared: ${JSON.stringify(line)}`
    ).toBeGreaterThanOrEqual(0);
    cursor++;
  });
}

function applyEdits(source: string, edits: readonly SourceEdit[]): string {
  return [...edits]
    .sort(
      (left, right) => positionToOffset(source, right.start) - positionToOffset(source, left.start)
    )
    .reduce((next, edit) => {
      const start = positionToOffset(source, edit.start);
      const end = positionToOffset(source, edit.end);
      return `${next.slice(0, start)}${edit.replacementText}${next.slice(end)}`;
    }, source);
}

function positionToOffset(source: string, position: SourcePosition): number {
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    const next = source.indexOf("\n", offset);
    if (next < 0) return source.length;
    offset = next + 1;
  }
  return offset + position.character;
}
