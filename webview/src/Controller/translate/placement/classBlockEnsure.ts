/** @fileoverview Rewrites a blockless class declaration with its first body statement. */

import type { ClassId } from "../../../shared/ids";
import type { DiagramGraph } from "../../model/diagramGraph";
import type { ProvenanceIndex, SourceSpan } from "../../model/provenanceIndex";
import type { SourcePosition } from "../../model/sourceEdit";
import {
  STATEMENT_KINDS,
  anchorAfterPredecessorOf,
  anchorBlockOpening,
  asDifferentKind,
  asSameKind,
} from "../anchors/statementAnchors";
import type { BlockRef, WriteIntent } from "../writeIntent";

export function rewriteBlocklessClassWithFirstChild(
  classId: ClassId,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string,
  childPayload: string
): WriteIntent[] {
  const record = provenance.classes.get(classId);
  if (!record) throw new Error(`Missing provenance for class ${classId}`);
  if (record.body) throw new Error(`Class ${classId} already has a body`);
  const block = classContainer(classId, graph);
  const previous = anchorAfterPredecessorOf(graph, provenance, block, record.self, STATEMENT_KINDS);
  const declaration = sliceSpan(sourceText, record.self).trim();
  const childLines = childPayload.split("\n").map((line) => `  ${line}`);
  return [
    { kind: "deleteStatement", target: { kind: "class", classId } },
    {
      kind: "insertStatement",
      payload: `${declaration} {\n${childLines.join("\n")}\n}`,
      anchor:
        (previous?.kind === "class" ? asSameKind(previous) : asDifferentKind(previous)) ??
        anchorBlockOpening(block),
    },
  ];
}

function classContainer(classId: ClassId, graph: DiagramGraph): BlockRef {
  const parentNamespaceId = graph.classes.get(classId)?.parentNamespaceId ?? null;
  return parentNamespaceId === null
    ? { kind: "diagram" }
    : { kind: "namespace", namespaceId: parentNamespaceId };
}

function sliceSpan(sourceText: string, span: SourceSpan): string {
  return sourceText.slice(
    positionToOffset(sourceText, span.start),
    positionToOffset(sourceText, span.end)
  );
}

function positionToOffset(sourceText: string, position: SourcePosition): number {
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    const nextLf = sourceText.indexOf("\n", offset);
    if (nextLf === -1) return sourceText.length;
    offset = nextLf + 1;
  }
  return offset + position.character;
}
