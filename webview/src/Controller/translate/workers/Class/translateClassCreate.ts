import type { EditorCommandOf } from "../../../../View/commands";
import type { DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import type { ClassId } from "../../../../shared/ids";
import type { TranslateContext } from "../../translateContext";
import { spellIdentity } from "../../../model/identitySpelling";
import type { BlockRef, StatementAnchor, WriteIntent } from "../../writeIntent";
import {
  anchorAfterKindList,
  anchorBlockOpening,
  asDifferentKind,
  asSameKind,
  STATEMENT_KINDS,
} from "../../anchors/statementAnchors";
import { composeSpatialAnnotation } from "../../syntax/spatialSyntax";

/**
 * Makes two writes:
 *
 * 1. class declaration **statement**, in the **parent namespace body**, or **diagram body**
 *    if no parent namespace (anchored at first match)
 *    - after the latest class declaration statement
 *    - after the latest namespace declaration statement
 *    - at block opening
 * 2. spatial annotation **statement**, in **diagram body** (anchored at first match)
 *    - after the latest spatial annotation statement
 *    - after the latest statement of any kind
 *    - at block opening
 */
export function translateClassCreate(
  command: EditorCommandOf<"class.create">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  context: TranslateContext
): WriteIntent[] {
  const id = context.allocateClassId(null);
  const declarationScope: BlockRef = command.parentNamespaceId
    ? { kind: "namespace", namespaceId: command.parentNamespaceId }
    : { kind: "diagram" };
  const diagramScope: BlockRef = { kind: "diagram" };

  // ---
  // Class declaration
  // ---
  const declarationAnchor: StatementAnchor =
    asSameKind(anchorAfterKindList(graph, provenance, declarationScope, ["class"])) ??
    asDifferentKind(anchorAfterKindList(graph, provenance, declarationScope, ["namespace"])) ??
    (declarationScope.kind === "diagram"
      ? asDifferentKind(
          anchorAfterKindList(graph, provenance, declarationScope, ["direction", "configDirective"])
        )
      : null) ??
    anchorBlockOpening(declarationScope);
  const insertDeclarationIntent: WriteIntent = {
    kind: "insertStatement",
    payload: composeClassDeclaration(id),
    anchor: declarationAnchor,
  };

  // ---
  // Spatial annotation
  // ---
  const spatialAnchor: StatementAnchor =
    asSameKind(anchorAfterKindList(graph, provenance, diagramScope, ["classSpatial"])) ??
    asDifferentKind(anchorAfterKindList(graph, provenance, diagramScope, STATEMENT_KINDS)) ??
    anchorBlockOpening(diagramScope);
  const insertSpatialIntent: WriteIntent = {
    kind: "insertStatement",
    payload: composeSpatialAnnotation(id, command.spatial),
    anchor: spatialAnchor,
  };

  return [insertDeclarationIntent, insertSpatialIntent];
}

function composeClassDeclaration(classId: ClassId): string {
  return `class ${spellIdentity(classId)}`;
}
