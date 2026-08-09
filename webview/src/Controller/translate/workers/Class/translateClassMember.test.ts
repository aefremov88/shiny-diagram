import { describe, expect, it } from "vitest";
import { toAttributeId, toClassId, toDiagramId } from "../../../../shared/ids";
import type { ClassMember } from "../../../model/diagramGraph";
import type { DiagramGraph } from "../../../model/diagramGraph";
import type { ProvenanceIndex } from "../../../model/provenanceIndex";
import type { SourceSpan } from "../../../model/sourceEdit";
import { translateClassAttributeCreate, translateClassAttributeMove } from "./translateClassMember";

const classId = toClassId("User");
const source = [
  "classDiagram",
  "class User {",
  "  +blockMoving",
  "  +blockAnchor",
  "}",
  "User : +shortMoving",
  "User : +shortAnchor",
  "User : +shortTail",
].join("\n");

const blockMoving = toAttributeId("User:blockMoving");
const blockAnchor = toAttributeId("User:blockAnchor");
const shortMoving = toAttributeId("User:shortMoving");
const shortAnchor = toAttributeId("User:shortAnchor");
const shortTail = toAttributeId("User:shortTail");

describe("class member target-form placement", () => {
  it("creates a short member after a short-form sibling with the target owner", () => {
    const graph = graphWithAttributes([member(shortAnchor), member(shortTail)]);
    const intents = translateClassAttributeCreate(
      {
        type: "class.attribute.create",
        classId,
        text: "+created",
        classifier: null,
        beforeAttributeId: shortTail,
      },
      graph,
      provenance(),
      source
    );

    expect(intents).toEqual([
      {
        kind: "insertStatement",
        payload: "User : +created",
        anchor: {
          kind: "afterSameKind",
          statement: { kind: "shortMember", memberId: shortAnchor },
        },
      },
    ]);
  });

  it("creates a block member after a block-form sibling", () => {
    const graph = graphWithAttributes([member(blockAnchor), member(shortTail)]);
    const intents = translateClassAttributeCreate(
      {
        type: "class.attribute.create",
        classId,
        text: "+created",
        classifier: null,
        beforeAttributeId: shortTail,
      },
      graph,
      provenance(),
      source
    );

    expect(intents).toEqual([
      {
        kind: "insertStatement",
        payload: "+created",
        anchor: {
          kind: "afterSameKind",
          statement: { kind: "blockMember", memberId: blockAnchor },
        },
      },
    ]);
  });

  it("moves a block member into short form after a short member", () => {
    const graph = graphWithAttributes([
      member(blockMoving),
      member(shortAnchor),
      member(shortTail),
    ]);
    const intents = translateClassAttributeMove(
      {
        type: "class.attribute.move",
        attributeId: blockMoving,
        classId,
        beforeAttributeId: shortTail,
      },
      graph,
      provenance(),
      source
    );

    expect(intents).toEqual([
      { kind: "deleteStatement", target: { kind: "blockMember", memberId: blockMoving } },
      {
        kind: "insertStatement",
        payload: "User : +blockMoving",
        anchor: {
          kind: "afterSameKind",
          statement: { kind: "shortMember", memberId: shortAnchor },
        },
      },
    ]);
  });

  it("moves a short member into block form after a block member", () => {
    const graph = graphWithAttributes([
      member(shortMoving),
      member(blockAnchor),
      member(shortTail),
    ]);
    const intents = translateClassAttributeMove(
      {
        type: "class.attribute.move",
        attributeId: shortMoving,
        classId,
        beforeAttributeId: shortTail,
      },
      graph,
      provenance(),
      source
    );

    expect(intents).toEqual([
      { kind: "deleteStatement", target: { kind: "shortMember", memberId: shortMoving } },
      {
        kind: "insertStatement",
        payload: "+shortMoving",
        anchor: {
          kind: "afterSameKind",
          statement: { kind: "blockMember", memberId: blockAnchor },
        },
      },
    ]);
  });

  it("appends in short form when every preceding member is short-form", () => {
    const graph = graphWithAttributes([member(shortAnchor), member(shortTail)]);
    const intents = translateClassAttributeCreate(
      {
        type: "class.attribute.create",
        classId,
        text: "+created",
        classifier: null,
        beforeAttributeId: null,
      },
      graph,
      provenance(),
      source
    );

    expect(intents[0]).toEqual({
      kind: "insertStatement",
      payload: "User : +created",
      anchor: {
        kind: "afterSameKind",
        statement: { kind: "shortMember", memberId: shortTail },
      },
    });
  });

  it("uses block form at the class-body opening when there is no preceding member", () => {
    const graph = graphWithAttributes([member(shortTail)]);
    const intents = translateClassAttributeCreate(
      {
        type: "class.attribute.create",
        classId,
        text: "+created",
        classifier: null,
        beforeAttributeId: shortTail,
      },
      graph,
      provenance(),
      source
    );

    expect(intents[0]).toEqual({
      kind: "insertStatement",
      payload: "+created",
      anchor: { kind: "atBlockOpening", block: { kind: "class", classId } },
    });
  });
});

function member(id: ClassMember["id"]): ClassMember {
  return { id, text: String(id).slice(String(id).indexOf(":") + 1), classifier: null };
}

function graphWithAttributes(attributes: readonly ClassMember[]): DiagramGraph {
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: null,
      config: { hideEmptyMembersBox: null, hierarchicalNamespaces: null },
    },
    classes: new Map([
      [
        classId,
        {
          kind: "class",
          id: classId,
          name: "User",
          label: "User",
          genericType: null,
          annotation: null,
          parentNamespaceId: null,
          spatial: null,
          attributes,
          methods: [],
          lollipopInterfaces: [],
          directStyle: null,
          interaction: null,
        },
      ],
    ]),
    namespaces: new Map(),
    relationships: new Map(),
    notes: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
  };
}

function provenance(): ProvenanceIndex {
  const empty = span(0, 0, 0);
  return {
    diagram: {
      self: empty,
      header: empty,
      body: empty,
      direction: null,
      configDirectives: [],
    },
    classes: new Map([
      [
        classId,
        {
          self: span(1, 0, 4, 1),
          header: span(1, 0, 12),
          body: span(1, 12, 4, 1),
          fields: { declaredName: span(1, 6, 10) },
        },
      ],
    ]),
    namespaces: new Map(),
    namespaceStyles: new Map(),
    blockMembers: new Map([
      [blockMoving, { self: span(2, 2, 14), fields: { text: span(2, 2, 14) } }],
      [blockAnchor, { self: span(3, 2, 14), fields: { text: span(3, 2, 14) } }],
    ]),
    shortMembers: new Map([
      [
        shortMoving,
        { self: span(5, 0, 19), fields: { owner: span(5, 0, 4), text: span(5, 7, 19) } },
      ],
      [
        shortAnchor,
        { self: span(6, 0, 19), fields: { owner: span(6, 0, 4), text: span(6, 7, 19) } },
      ],
      [shortTail, { self: span(7, 0, 17), fields: { owner: span(7, 0, 4), text: span(7, 7, 17) } }],
    ]),
    relationships: new Map(),
    lollipopInterfaces: new Map(),
    classDirectStyles: new Map(),
    styleDefinitions: new Map(),
    styleApplications: new Map(),
    classSpatial: new Map(),
    noteAnnotations: new Map(),
    notes: new Map(),
  };
}

function span(line: number, start: number, end: number): SourceSpan;
function span(startLine: number, start: number, endLine: number, end: number): SourceSpan;
function span(startLine: number, start: number, endLine: number, end?: number): SourceSpan {
  return {
    start: { line: startLine, character: start },
    end: { line: end === undefined ? startLine : endLine, character: end ?? endLine },
  };
}
