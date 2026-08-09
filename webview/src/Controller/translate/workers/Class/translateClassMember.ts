/**
 * @fileoverview Translates opaque class member edit commands.
 */

import type { EditorCommandOf } from "../../../../View/commands";
import type { AttributeId, MethodId } from "../../../../shared/ids";
import type { MemberKind } from "../../../../shared/uml";
import type { ClassNode, DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import type { SourcePosition, SourceSpan } from "../../../model/sourceEdit";
import { spellIdentity } from "../../../model/identitySpelling";
import { toSourceMemberText } from "../../../model/memberText";
import {
  anchorBlockOpening,
  anchorAfterExactStatement,
  asSameKind,
} from "../../anchors/statementAnchors";
import { rewriteBlocklessClassWithFirstChild } from "../../placement/classBlockEnsure";
import type { StatementAnchor, StatementRef, WriteIntent } from "../../writeIntent";

/**
 * Makes one write:
 *
 * 1. member text **value**
 *    - in place
 */
export function translateClassAttributeSet(
  command: EditorCommandOf<"class.attribute.set">
): WriteIntent[] {
  return [
    {
      kind: "replaceValue",
      target: { kind: "memberName", memberId: command.attributeId },
      payload: toSourceMemberText({ text: command.text, classifier: command.classifier }, "field"),
    },
  ];
}

/**
 * Makes one write:
 *
 * 1. member text **value**
 *    - in place
 */
export function translateClassMethodSet(
  command: EditorCommandOf<"class.method.set">
): WriteIntent[] {
  return [
    {
      kind: "replaceValue",
      target: { kind: "memberName", memberId: command.methodId },
      payload: toSourceMemberText({ text: command.text, classifier: command.classifier }, "method"),
    },
  ];
}

/**
 * Makes one of two write options:
 *
 * a. attribute written in block form → block member **statement** deleted
 * b. otherwise → short member **statement** deleted
 */
export function translateClassAttributeDelete(
  command: EditorCommandOf<"class.attribute.delete">,
  provenance: ProvenanceIndex
): WriteIntent[] {
  return [deleteMemberIntent(command.attributeId, provenance)];
}

/**
 * Makes one of two write options:
 *
 * a. method written in block form → block member **statement** deleted
 * b. otherwise → short member **statement** deleted
 */
export function translateClassMethodDelete(
  command: EditorCommandOf<"class.method.delete">,
  provenance: ProvenanceIndex
): WriteIntent[] {
  return [deleteMemberIntent(command.methodId, provenance)];
}

/**
 * Makes one of three write options:
 *
 * a. no class body and appending → Makes two writes:
 *    1. old class declaration **statement** deleted
 *    2. new class declaration **statement** carrying the source declaration and a body with
 *       the block member statement, at the old location
 * b. preceding attribute is a short member statement → short member **statement**, in
 *    **diagram body**
 *    - after the preceding short member statement
 * c. otherwise → block member **statement**, in **class body** (anchored at first match)
 *    - after the preceding block member statement
 *    - at block opening
 *
 * Errors when the class or a requested insertion anchor is missing.
 */
export function translateClassAttributeCreate(
  command: EditorCommandOf<"class.attribute.create">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string
): WriteIntent[] {
  const payload = toSourceMemberText(
    { text: command.text, classifier: command.classifier },
    "field"
  );
  if (command.beforeAttributeId === null && isBlocklessClass(command.classId, provenance)) {
    return rewriteBlocklessClassWithFirstChild(
      command.classId,
      graph,
      provenance,
      sourceText,
      payload
    );
  }
  const placement = memberCreatePlacement(
    graph,
    provenance,
    graph.classes.get(command.classId),
    "field",
    command.beforeAttributeId
  );
  return [
    {
      kind: "insertStatement",
      payload: composeMemberStatement(command.classId, payload, placement.form),
      anchor: placement.anchor,
    },
  ];
}

/**
 * Makes one of three write options:
 *
 * a. no class body and appending → Makes two writes:
 *    1. old class declaration **statement** deleted
 *    2. new class declaration **statement** carrying the source declaration and a body with
 *       the block member statement, at the old location
 * b. preceding method is a short member statement → short member **statement**, in **diagram
 *    body**
 *    - after the preceding short member statement
 * c. otherwise → block member **statement**, in **class body** (anchored at first match)
 *    - after the preceding block member statement
 *    - at block opening
 *
 * Errors when the class or a requested insertion anchor is missing.
 */
export function translateClassMethodCreate(
  command: EditorCommandOf<"class.method.create">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string
): WriteIntent[] {
  const payload = toSourceMemberText(
    { text: command.text, classifier: command.classifier },
    "method"
  );
  if (command.beforeMethodId === null && isBlocklessClass(command.classId, provenance)) {
    return rewriteBlocklessClassWithFirstChild(
      command.classId,
      graph,
      provenance,
      sourceText,
      payload
    );
  }
  const placement = memberCreatePlacement(
    graph,
    provenance,
    graph.classes.get(command.classId),
    "method",
    command.beforeMethodId
  );
  return [
    {
      kind: "insertStatement",
      payload: composeMemberStatement(command.classId, payload, placement.form),
      anchor: placement.anchor,
    },
  ];
}

/**
 * Makes four groups of writes — one deletion selected by the source form and one insertion
 * selected by the anchor form:
 *
 * 1. block member **statement** deleted, when the moved attribute is written in block form
 * 2. short member **statement** deleted, when the moved attribute is written in short form
 * 3. short member **statement** carrying the source member text with the target class owner,
 *    in **diagram body**, when the preceding attribute is a short member statement
 *    - after the preceding short member statement
 * 4. block member **statement** carrying the source member text, in **class body**, otherwise
 *    (anchored at first match)
 *    - after the preceding block member statement
 *    - at block opening
 *
 * Errors when the class, moved attribute, or a requested insertion anchor is missing.
 */
export function translateClassAttributeMove(
  command: EditorCommandOf<"class.attribute.move">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string
): WriteIntent[] {
  const classNode = graph.classes.get(command.classId);
  const placement = memberCreatePlacement(
    graph,
    provenance,
    classNode,
    "field",
    command.beforeAttributeId
  );
  return [
    deleteMemberIntent(command.attributeId, provenance),
    {
      kind: "insertStatement",
      payload: composeMemberStatement(
        command.classId,
        readMemberSource(command.attributeId, provenance, sourceText),
        placement.form
      ),
      anchor: placement.anchor,
    },
  ];
}

/**
 * Makes four groups of writes — one deletion selected by the source form and one insertion
 * selected by the anchor form:
 *
 * 1. block member **statement** deleted, when the moved method is written in block form
 * 2. short member **statement** deleted, when the moved method is written in short form
 * 3. short member **statement** carrying the source member text with the target class owner,
 *    in **diagram body**, when the preceding method is a short member statement
 *    - after the preceding short member statement
 * 4. block member **statement** carrying the source member text, in **class body**, otherwise
 *    (anchored at first match)
 *    - after the preceding block member statement
 *    - at block opening
 *
 * Errors when the class, moved method, or a requested insertion anchor is missing.
 */
export function translateClassMethodMove(
  command: EditorCommandOf<"class.method.move">,
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  sourceText: string
): WriteIntent[] {
  const classNode = graph.classes.get(command.classId);
  const placement = memberCreatePlacement(
    graph,
    provenance,
    classNode,
    "method",
    command.beforeMethodId
  );
  return [
    deleteMemberIntent(command.methodId, provenance),
    {
      kind: "insertStatement",
      payload: composeMemberStatement(
        command.classId,
        readMemberSource(command.methodId, provenance, sourceText),
        placement.form
      ),
      anchor: placement.anchor,
    },
  ];
}

function deleteMemberIntent(
  memberId: AttributeId | MethodId,
  provenance: ProvenanceIndex
): WriteIntent {
  return {
    kind: "deleteStatement",
    target: provenance.blockMembers.has(memberId)
      ? { kind: "blockMember", memberId }
      : { kind: "shortMember", memberId },
  };
}

function isBlocklessClass(classId: ClassNode["id"], provenance: ProvenanceIndex): boolean {
  return provenance.classes.get(classId)?.body === null;
}

type MemberPlacement = {
  readonly anchor: StatementAnchor;
  readonly form: "block" | "short";
};

function memberCreatePlacement(
  graph: DiagramGraph,
  provenance: ProvenanceIndex,
  classNode: ClassNode | undefined,
  kind: MemberKind,
  beforeMemberId: AttributeId | MethodId | null
): MemberPlacement {
  if (!classNode) throw new Error("Cannot insert member into missing class");

  const classRecord = provenance.classes.get(classNode.id);
  if (!classRecord?.body) {
    throw new Error(`Cannot insert member into blockless class ${classNode.id}`);
  }

  const orderedMembers = kind === "field" ? classNode.attributes : classNode.methods;
  const beforeIndex =
    beforeMemberId === null
      ? orderedMembers.length
      : orderedMembers.findIndex((member) => member.id === beforeMemberId);
  const previous = beforeIndex > 0 ? orderedMembers[beforeIndex - 1] : null;
  if (previous) {
    const form = provenance.blockMembers.has(previous.id) ? "block" : "short";
    return {
      anchor: requireSameKindAnchor(provenance, {
        kind: form === "block" ? "blockMember" : "shortMember",
        memberId: previous.id,
      }),
      form,
    };
  }

  return {
    anchor: anchorBlockOpening({ kind: "class", classId: classNode.id }),
    form: "block",
  };
}

function composeMemberStatement(
  classId: ClassNode["id"],
  memberText: string,
  form: MemberPlacement["form"]
): string {
  return form === "short" ? `${spellIdentity(classId)} : ${memberText}` : memberText;
}

function requireSameKindAnchor(
  provenance: ProvenanceIndex,
  statement: StatementRef
): StatementAnchor {
  const anchor = asSameKind(anchorAfterExactStatement(provenance, statement));
  if (!anchor) throw new Error(`Missing provenance for member anchor ${statement.kind}`);
  return anchor;
}

function readMemberSource(
  memberId: AttributeId | MethodId,
  provenance: ProvenanceIndex,
  sourceText: string
): string {
  const record = provenance.blockMembers.get(memberId) ?? provenance.shortMembers.get(memberId);
  if (!record) throw new Error(`Missing provenance for member ${memberId}`);
  return sliceSpan(sourceText, record.fields.text);
}

function sliceSpan(sourceText: string, span: SourceSpan): string {
  return sourceText.slice(
    positionToOffset(sourceText, span.start),
    positionToOffset(sourceText, span.end)
  );
}

function positionToOffset(sourceText: string, position: SourcePosition): number {
  let offset = 0;
  let line = 0;
  while (line < position.line && offset < sourceText.length) {
    const nextLf = sourceText.indexOf("\n", offset);
    if (nextLf === -1) return sourceText.length;
    offset = nextLf + 1;
    line++;
  }
  return offset + position.character;
}
