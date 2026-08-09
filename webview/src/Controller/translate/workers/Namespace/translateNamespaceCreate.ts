/**
 * @fileoverview Translates `namespace.create` by moving top-level member declarations into a new namespace block.
 */

import type { EditorCommandOf } from "../../../../View/commands";
import type { NamespaceId } from "../../../../shared/ids";
import type { DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import { spellIdentity } from "../../../model/identitySpelling";
import type { StatementRef, WriteIntent } from "../../writeIntent";
import {
  anchorAfterKindList,
  anchorBlockOpening,
  asDifferentKind,
} from "../../anchors/statementAnchors";
import { movedStatementPayload } from "../../placement/moveStatementSlice";
import type { TranslateContext } from "../../translateContext";

/**
 * Makes three groups of writes:
 *
 * 1. class declaration **statement** deleted, for every initial class
 * 2. namespace declaration **statement** deleted, for every initial namespace
 * 3. namespace declaration **statement** carrying the moved source blocks verbatim, in
 *    **diagram body**
 *    - at block opening
 */
export function translateNamespaceCreate(
  command: EditorCommandOf<"namespace.create">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string,
  context: TranslateContext
): WriteIntent[] {
  const namespaceId = context.allocateNamespaceId();
  const memberStatements = toMemberStatements(command);
  const deleteIntents = memberStatements.map(
    (target): WriteIntent => ({ kind: "deleteStatement", target })
  );
  const insertIntent: WriteIntent = {
    kind: "insertStatement",
    payload: composeNamespaceBlock(namespaceId, memberStatements, provenance, sourceText),
    anchor:
      asDifferentKind(
        anchorAfterKindList(graph, provenance, { kind: "diagram" }, [
          "direction",
          "configDirective",
        ])
      ) ?? anchorBlockOpening({ kind: "diagram" }),
  };

  return [...deleteIntents, insertIntent];
}

function toMemberStatements(command: EditorCommandOf<"namespace.create">): StatementRef[] {
  return [
    ...command.initialClassIds.map((classId) => ({ kind: "class" as const, classId })),
    ...command.initialNamespaceIds.map((namespaceId) => ({
      kind: "namespace" as const,
      namespaceId,
    })),
  ];
}

function composeNamespaceBlock(
  namespaceId: NamespaceId,
  memberStatements: readonly StatementRef[],
  provenance: ProvenanceIndex,
  sourceText: string
): string {
  const memberLines = memberStatements.map((statement) =>
    movedStatementPayload(statement, provenance, sourceText, 1)
  );
  return [`namespace ${spellIdentity(namespaceId)} {`, ...memberLines, "}"].join("\n");
}
