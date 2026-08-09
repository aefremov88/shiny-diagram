/**
 * @fileoverview Builds the Controller diagram graph and provenance index from parser tokens.
 */

import { toClassId, toDiagramId, toLollipopInterfaceId, toNamespaceId } from "../../../shared/ids";
import type { NamespaceId } from "../../../shared/ids";
import type { EditorDiagnostic } from "../parseResult";
import { IDENTITY_PATTERN, readIdentity } from "../../model/identitySpelling";
import { composeNoteId } from "../../model/noteIdentity";
import {
  STYLE_PROPERTIES,
  type StyleProperties,
  type StylePropertyName,
} from "../../../shared/style";
import type {
  ClassNode,
  DiagramGraph,
  LollipopInterface,
  NamespaceNode,
  NoteNode,
  RelationshipEdge,
  StyleApplicationEdge,
  StyleOccurrence,
  StyleDefNode,
} from "../../model/diagramGraph";
import type { DiagramDirection } from "../../../shared/uml";
import type {
  BlockMemberRecord,
  ClassDirectStyleRecord,
  ClassRecord,
  LollipopInterfaceRecord,
  NamespaceRecord,
  NamespaceStyleRecord,
  NoteRecord,
  ProvenanceIndex,
  RelationshipRecord,
  ShortMemberRecord,
  SpatialRecord,
  StyleApplicationRecord,
  StyleDefRecord,
  StylePropertyFields,
} from "../../model/provenanceIndex";
import type { SourceSpan } from "../../model/sourceEdit";
import { buildAppliesStyleEdge } from "./builders/buildAppliesStyleEdge";
import { buildClassNode, buildShortClassMember } from "./builders/buildClassNode";
import { buildInNamespaceEdges, type InNamespaceEdge } from "./builders/buildInNamespaceEdge";
import { buildNamespaceNode } from "./builders/buildNamespaceNode";
import { buildRelationshipEdge } from "./builders/buildRelationshipEdge";
import { buildStyleDefNode } from "./builders/buildStyleDefNode";
import type { ParseToken } from "./tokenizer";
import { toHeaderLocation, toLineFieldLocation, toSourceSpan } from "./toSourceSpan";

type MutableGraphBuild = {
  direction: DiagramDirection | null;
  readonly classes: Map<ClassNode["id"], ClassNode>;
  readonly styleDefinitions: Map<StyleDefNode["id"], StyleDefNode>;
  readonly namespaces: Map<NamespaceNode["id"], NamespaceNode>;
  readonly relationships: Map<RelationshipEdge["id"], RelationshipEdge>;
  readonly notes: Map<NoteNode["id"], NoteNode>;
  readonly lollipopInterfaces: Map<ClassNode["id"], LollipopInterface[]>;
  readonly styleApplications: Map<StyleApplicationEdge["id"], StyleApplicationEdge>;
  readonly styleOccurrences: StyleOccurrence[];
  readonly inNamespaceEdges: InNamespaceEdge[];
  readonly diagnostics: EditorDiagnostic[];
  readonly directStyleProperties: Map<ClassNode["id"], StyleProperties>;
  readonly namespaceStyleProperties: Map<NamespaceNode["id"], StyleProperties>;
  readonly provenance: {
    readonly classes: Map<ClassNode["id"], ClassRecord>;
    readonly blockMembers: Map<
      ClassNode["attributes"][number]["id"] | ClassNode["methods"][number]["id"],
      BlockMemberRecord
    >;
    readonly shortMembers: Map<
      ClassNode["attributes"][number]["id"] | ClassNode["methods"][number]["id"],
      ShortMemberRecord
    >;
    readonly namespaces: Map<NamespaceNode["id"], NamespaceRecord>;
    readonly namespaceStyles: Map<NamespaceNode["id"], NamespaceStyleRecord>;
    readonly styleDefinitions: Map<StyleDefNode["id"], StyleDefRecord>;
    readonly relationships: Map<RelationshipEdge["id"], RelationshipRecord>;
    readonly notes: Map<NoteNode["id"], NoteRecord>;
    readonly lollipopInterfaces: Map<LollipopInterface["id"], LollipopInterfaceRecord>;
    readonly classDirectStyles: Map<ClassNode["id"], ClassDirectStyleRecord>;
    readonly classSpatial: Map<ClassNode["id"], SpatialRecord>;
    readonly namespaceMemberships: Map<ClassNode["id"], SourceSpan>;
    readonly styleApplications: Map<StyleApplicationEdge["id"], StyleApplicationRecord>;
  };
};

export type GraphBuildResult = {
  readonly graph: DiagramGraph;
  readonly provenance: ProvenanceIndex;
  readonly diagnostics: readonly EditorDiagnostic[];
};

export function buildSpatiallyUnawareDiagramGraph(tokens: ParseToken[]): GraphBuildResult {
  const build: MutableGraphBuild = {
    direction: null,
    classes: new Map(),
    styleDefinitions: new Map(),
    namespaces: new Map(),
    relationships: new Map(),
    notes: new Map(),
    lollipopInterfaces: new Map(),
    styleApplications: new Map(),
    styleOccurrences: [],
    inNamespaceEdges: [],
    diagnostics: [],
    directStyleProperties: new Map(),
    namespaceStyleProperties: new Map(),
    provenance: {
      classes: new Map(),
      blockMembers: new Map(),
      shortMembers: new Map(),
      namespaces: new Map(),
      namespaceStyles: new Map(),
      styleDefinitions: new Map(),
      relationships: new Map(),
      notes: new Map(),
      lollipopInterfaces: new Map(),
      classDirectStyles: new Map(),
      classSpatial: new Map(),
      namespaceMemberships: new Map(),
      styleApplications: new Map(),
    },
  };

  traverseTokens(tokens, build, null);
  synthesizeImplicitClassNodes(build);
  attachLollipopInterfaces(build);
  attachDirectStyles(build);
  attachNamespaceStyles(build);
  attachNamespaceMembership(build);

  return {
    graph: toDiagramGraph(build),
    provenance: toProvenanceIndex(tokens, build),
    diagnostics: build.diagnostics,
  };
}

function traverseTokens(
  tokens: readonly ParseToken[],
  build: MutableGraphBuild,
  parentNamespaceId: NamespaceId | null
): void {
  for (const token of tokens) {
    switch (token.type) {
      case "direction": {
        const match = /^\s*direction\s+(TB|BT|RL|LR)\s*$/.exec(token.raw);
        if (match) build.direction = match[1] as DiagramDirection;
        break;
      }
      case "classDeclaration": {
        const parsed = buildClassNode(token);
        if (parsed) {
          const existing = build.classes.get(parsed.node.id);
          if (existing?.parentNamespaceId && existing.parentNamespaceId !== parentNamespaceId) {
            build.diagnostics.push({
              kind: "duplicateClassDeclaration",
              elementId: parsed.node.id,
              message: `Class "${parsed.node.id}" is declared in multiple namespaces; the last declaration wins`,
            });
          }
          build.classes.set(parsed.node.id, parsed.node);
          build.provenance.classes.set(
            parsed.node.id,
            toClassRecord(token, parsed.annotationLocation)
          );
          for (const [memberId, location] of parsed.memberLocations) {
            build.provenance.blockMembers.set(memberId, {
              self: location.self,
              fields: { text: location.text },
            });
          }
        }
        break;
      }
      case "classMember": {
        const parsed = buildShortClassMember(token);
        if (parsed) {
          const existing = build.classes.get(parsed.classId) ?? toImplicitClassNode(parsed.classId);
          const nextNode =
            parsed.kind === "method"
              ? { ...existing, methods: [...existing.methods, parsed.member] }
              : { ...existing, attributes: [...existing.attributes, parsed.member] };
          build.classes.set(parsed.classId, nextNode);
          build.provenance.shortMembers.set(parsed.member.id, {
            self: toSourceSpan(token),
            fields: { owner: parsed.ownerLocation, text: parsed.textLocation },
          });
        }
        break;
      }
      case "classDirectStyle": {
        const parsed = parseClassDirectStyle(token);
        if (parsed) {
          build.directStyleProperties.set(parsed.classId, parsed.properties);
          build.styleOccurrences.push({
            kind: "direct",
            classId: parsed.classId,
            properties: parsed.properties,
          });
          build.provenance.classDirectStyles.set(parsed.classId, parsed.record);
          const existing = build.classes.get(parsed.classId);
          if (existing) {
            build.classes.set(parsed.classId, { ...existing, directStyle: parsed.properties });
          }
        }
        break;
      }
      case "styleApplication": {
        const parsed = buildAppliesStyleEdge(token, build.styleApplications.size);
        if (parsed) {
          build.styleApplications.set(parsed.edge.id, parsed.edge);
          build.provenance.styleApplications.set(parsed.edge.id, toStyleApplicationRecord(token));
        }
        break;
      }
      case "styleDef": {
        const parsed = buildStyleDefNode(token);
        if (parsed) {
          build.styleDefinitions.set(parsed.node.id, parsed.node);
          build.styleOccurrences.push({
            kind: "declared",
            styleDefId: parsed.node.id,
            name: parsed.node.name,
            properties: parsed.node.properties,
          });
          build.provenance.styleDefinitions.set(parsed.node.id, toStyleDefRecord(token));
        }
        break;
      }
      case "relationship": {
        const parsed = buildRelationshipEdge(token, build.relationships.size);
        if (parsed?.kind === "edge") {
          build.relationships.set(parsed.edge.id, parsed.edge);
          build.provenance.relationships.set(parsed.edge.id, toRelationshipRecord(token));
        } else if (parsed?.kind === "lollipopInterface") {
          const classId = toClassId(parsed.className);
          const lollipopInterface = toLollipopInterface(classId, parsed.interfaceLabel);
          build.lollipopInterfaces.set(classId, [
            ...(build.lollipopInterfaces.get(classId) ?? []),
            lollipopInterface,
          ]);
          build.provenance.lollipopInterfaces.set(lollipopInterface.id, {
            self: parsed.location,
            fields: { label: parsed.location },
          });
        }
        break;
      }
      case "noteStatement": {
        const parsed = buildNoteNode(token, build.notes.size);
        if (parsed) {
          build.notes.set(parsed.node.id, parsed.node);
          build.provenance.notes.set(parsed.node.id, parsed.record);
        }
        break;
      }
      case "namespace": {
        const parsed = buildNamespaceNode(token, parentNamespaceId);
        if (parsed) {
          for (const node of parsed.nodes) {
            build.namespaces.set(node.id, build.namespaces.get(node.id) ?? node);
          }
          build.provenance.namespaces.set(parsed.explicitNode.id, {
            self: parsed.location,
            header: toHeaderLocation(token),
            body: toBodyLocation(token),
            fields: { declaredName: toDeclaredNameLocation(token, "namespace") },
          });
        }
        build.inNamespaceEdges.push(...buildInNamespaceEdges(token, parentNamespaceId));
        break;
      }
      case "namespaceStyleAnnotation": {
        const parsed = parseNamespaceStyleAnnotation(token);
        if (parsed) {
          build.namespaceStyleProperties.set(parsed.namespaceId, parsed.properties);
          build.styleOccurrences.push({
            kind: "namespace",
            namespaceId: parsed.namespaceId,
            properties: parsed.properties,
          });
          build.provenance.namespaceStyles.set(parsed.namespaceId, parsed.record);
        }
        break;
      }
    }

    if (token.blockTokens && token.type !== "classDeclaration") {
      const parsed =
        token.type === "namespace" ? buildNamespaceNode(token, parentNamespaceId) : null;
      traverseTokens(token.blockTokens, build, parsed?.explicitNode.id ?? parentNamespaceId);
    }
  }
}

function attachDirectStyles(build: MutableGraphBuild): void {
  for (const [classId, properties] of build.directStyleProperties) {
    const node = build.classes.get(classId);
    if (!node) continue;
    build.classes.set(classId, {
      ...node,
      directStyle: properties,
    });
  }
}

function attachNamespaceStyles(build: MutableGraphBuild): void {
  for (const [namespaceId, properties] of build.namespaceStyleProperties) {
    const node = build.namespaces.get(namespaceId);
    if (!node) continue;
    build.namespaces.set(namespaceId, {
      ...node,
      style: properties,
    });
  }
}

function synthesizeImplicitClassNodes(build: MutableGraphBuild): void {
  for (const relationship of build.relationships.values()) {
    for (const id of [relationship.source.classId, relationship.target.classId]) {
      if (!build.classes.has(id)) {
        build.classes.set(id, toImplicitClassNode(id));
      }
    }
  }
  for (const [classId] of build.provenance.classDirectStyles) {
    if (!build.classes.has(classId)) {
      build.classes.set(classId, toImplicitClassNode(classId));
    }
  }
  for (const [classId] of build.lollipopInterfaces) {
    if (!build.classes.has(classId)) {
      build.classes.set(classId, toImplicitClassNode(classId));
    }
  }
  for (const styleApplication of build.styleApplications.values()) {
    if (!build.classes.has(styleApplication.targetId)) {
      build.classes.set(styleApplication.targetId, toImplicitClassNode(styleApplication.targetId));
    }
  }
}

function attachLollipopInterfaces(build: MutableGraphBuild): void {
  for (const [classId, lollipopInterfaces] of build.lollipopInterfaces) {
    const node = build.classes.get(classId);
    if (!node) continue;
    build.classes.set(classId, {
      ...node,
      lollipopInterfaces: [...node.lollipopInterfaces, ...lollipopInterfaces],
    });
  }
}

function toLollipopInterface(classId: ClassNode["id"], label: string): LollipopInterface {
  return {
    id: toLollipopInterfaceId(`${classId}--${label}`),
    label,
    // Shiny: Mermaid source does not encode lollipop side; future spatial annotation owns it.
    side: "left",
  };
}

function attachNamespaceMembership(build: MutableGraphBuild): void {
  for (const edge of build.inNamespaceEdges) {
    if (edge.sourceKind === "class") {
      const node = build.classes.get(edge.source);
      if (!node) continue;
      if (node.parentNamespaceId && node.parentNamespaceId !== edge.target) {
        build.diagnostics.push({
          kind: "duplicateClassDeclaration",
          elementId: edge.source,
          message: `Class "${edge.source}" is declared in multiple namespaces; the last declaration wins`,
        });
      }
      build.classes.set(edge.source, { ...node, parentNamespaceId: edge.target });
      build.provenance.namespaceMemberships.set(edge.source, edge.location);
    } else {
      const node = build.namespaces.get(edge.source);
      if (!node) continue;
      build.namespaces.set(edge.source, { ...node, parentNamespaceId: edge.target });
    }
  }
}

function toImplicitClassNode(id: ClassNode["id"]): ClassNode {
  return {
    kind: "class",
    id,
    name: id,
    label: id,
    genericType: null,
    annotation: null,
    parentNamespaceId: null,
    spatial: null,
    attributes: [],
    methods: [],
    lollipopInterfaces: [],
    directStyle: null,
    interaction: null,
  };
}

function toDiagramGraph(build: MutableGraphBuild): DiagramGraph {
  return {
    diagram: {
      kind: "classDiagram",
      id: toDiagramId("classDiagram"),
      direction: build.direction,
      config: {
        hideEmptyMembersBox: null,
        hierarchicalNamespaces: null,
      },
    },
    classes: build.classes,
    namespaces: build.namespaces,
    relationships: build.relationships,
    notes: build.notes,
    styleDefinitions: build.styleDefinitions,
    styleApplications: build.styleApplications,
    styleOccurrences: build.styleOccurrences,
  };
}

function toProvenanceIndex(
  tokens: readonly ParseToken[],
  build: MutableGraphBuild
): ProvenanceIndex {
  return {
    diagram: toDiagramRecord(tokens),
    classes: build.provenance.classes,
    namespaces: build.provenance.namespaces,
    namespaceStyles: build.provenance.namespaceStyles,
    blockMembers: build.provenance.blockMembers,
    shortMembers: build.provenance.shortMembers,
    relationships: build.provenance.relationships,
    lollipopInterfaces: build.provenance.lollipopInterfaces,
    classDirectStyles: build.provenance.classDirectStyles,
    styleDefinitions: build.provenance.styleDefinitions,
    styleApplications: build.provenance.styleApplications,
    classSpatial: build.provenance.classSpatial,
    noteAnnotations: new Map(),
    notes: build.provenance.notes,
  };
}

export function toDiagramRecord(tokens: readonly ParseToken[]): ProvenanceIndex["diagram"] {
  const headerToken = tokens.find((token) => token.raw.trim().startsWith("classDiagram"));
  const directionToken = tokens.find((token) => token.type === "direction");
  const configDirectiveTokens = tokens.filter((token) => token.type === "configDirective");
  if (!headerToken) {
    const empty = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };
    return {
      self: empty,
      header: empty,
      body: empty,
      direction: null,
      configDirectives: [],
    };
  }
  const last = tokens.at(-1) ?? headerToken;
  return {
    self: {
      start: { line: headerToken.lineNumber, character: 0 },
      end: {
        line: last.endLine,
        character:
          last.endLine === last.lineNumber
            ? last.raw.length
            : (last.fullRaw.split("\n").at(-1)?.length ?? 0),
      },
    },
    header: toHeaderLocation(headerToken),
    direction: directionToken ? toSourceSpan(directionToken) : null,
    configDirectives: configDirectiveTokens.map(toSourceSpan),
    body: {
      start: { line: headerToken.lineNumber + 1, character: 0 },
      end: {
        line: last.endLine,
        character:
          last.endLine === last.lineNumber
            ? last.raw.length
            : (last.fullRaw.split("\n").at(-1)?.length ?? 0),
      },
    },
  };
}

function toClassRecord(token: ParseToken, annotation: SourceSpan | null): ClassRecord {
  const isBlock = token.raw.includes("{");
  const label = toClassLabelLocation(token);
  const labelFull = toClassLabelFullLocation(token);
  const genericType = toClassGenericTypeLocation(token);
  return {
    self: toSourceSpan(token),
    header: toHeaderLocation(token),
    body: isBlock ? toBodyLocation(token) : null,
    fields: {
      declaredName: toDeclaredNameLocation(token, "class"),
      ...(genericType ? { genericType } : {}),
      ...(label ? { label } : {}),
      ...(labelFull ? { labelFull } : {}),
      ...(annotation ? { annotation } : {}),
    },
  };
}

function toDeclaredNameLocation(token: ParseToken, keyword: "class" | "namespace"): SourceSpan {
  const match = new RegExp(`^(\\s*${keyword}\\s+)(${IDENTITY_PATTERN})`).exec(token.raw);
  if (!match) return toHeaderLocation(token);
  const start = match[1].length;
  return toLineFieldLocation(token, start, start + match[2].length);
}

function toClassLabelLocation(token: ParseToken): SourceSpan | null {
  const match = /\["([^"]*)"\]/.exec(token.raw);
  if (!match) return null;
  const start = (match.index ?? 0) + 2;
  return toLineFieldLocation(token, start, start + match[1].length);
}

function toClassLabelFullLocation(token: ParseToken): SourceSpan | null {
  const match = /\["([^"]*)"\]/.exec(token.raw);
  if (!match) return null;
  const start = match.index ?? 0;
  return toLineFieldLocation(token, start, start + match[0].length);
}

function toClassGenericTypeLocation(token: ParseToken): SourceSpan | null {
  const match = new RegExp(`^\\s*class\\s+${IDENTITY_PATTERN}(~[^~]*~)`).exec(token.raw);
  if (!match) return null;
  const start = token.raw.indexOf(match[1]);
  return toLineFieldLocation(token, start, start + match[1].length);
}

function toBodyLocation(token: ParseToken): SourceSpan {
  if (!token.raw.includes("{")) return toSourceSpan(token);
  return {
    start: { line: token.lineNumber + 1, character: 0 },
    end: { line: Math.max(token.lineNumber + 1, token.endLine - 1), character: 0 },
  };
}

function parseClassDirectStyle(token: ParseToken): {
  readonly classId: ClassNode["id"];
  readonly properties: StyleProperties;
  readonly record: ClassDirectStyleRecord;
} | null {
  const match = new RegExp(`^(\\s*style\\s+)(${IDENTITY_PATTERN})(\\s+)(.+)$`).exec(token.raw);
  if (!match) return null;

  const classId = toClassId(readIdentity(match[2]));
  const listStart = match[1].length + match[2].length + match[3].length;
  const propertyList = token.raw.slice(listStart);
  const properties = parseStyleProperties(propertyList);
  return {
    classId,
    properties,
    record: {
      self: toSourceSpan(token),
      fields: {
        target: toLineFieldLocation(token, match[1].length, match[1].length + match[2].length),
        propertyList: toLineFieldLocation(token, listStart, token.raw.length),
        properties: toStylePropertyFields(token, listStart, propertyList),
      },
    },
  };
}

function parseNamespaceStyleAnnotation(token: ParseToken): {
  readonly namespaceId: NamespaceNode["id"];
  readonly properties: StyleProperties;
  readonly record: NamespaceStyleRecord;
} | null {
  const match = new RegExp(`^(\\s*%%\\s+@style:)(${IDENTITY_PATTERN})(\\s+)(.*)$`).exec(token.raw);
  if (!match) return null;

  const namespaceId = toNamespaceId(readIdentity(match[2]));
  const propertyListStart = match[1].length + match[2].length + match[3].length;
  return {
    namespaceId,
    properties: parseStyleAnnotationProperties(match[4]),
    record: {
      self: toSourceSpan(token),
      fields: {
        target: toLineFieldLocation(token, match[1].length, match[1].length + match[2].length),
        propertyList: toLineFieldLocation(token, propertyListStart, token.raw.length),
      },
    },
  };
}

function buildNoteNode(
  token: ParseToken,
  ordinal: number
): { readonly node: NoteNode; readonly record: NoteRecord } | null {
  const parsed = parseNoteStatement(token.raw);
  if (!parsed) return null;

  const id = composeNoteId(ordinal);
  return {
    node: {
      kind: "note",
      id,
      text: parsed.text,
      attachedToClassId: parsed.attachedToClassId,
      spatial: null,
    },
    record: {
      self: toSourceSpan(token),
      fields: {
        text: toLineFieldLocation(token, parsed.textStart, parsed.textEnd),
      },
    },
  };
}

export function parseNoteStatement(raw: string): {
  readonly text: string;
  readonly textStart: number;
  readonly textEnd: number;
  readonly attachedToClassId: ClassNode["id"] | null;
} | null {
  const match = new RegExp(`^\\s*note\\s+(?:for\\s+(${IDENTITY_PATTERN})\\s+)?`).exec(raw);
  if (!match) return null;

  const quoteStart = raw.indexOf('"', match[0].length);
  if (quoteStart === -1) return null;
  const textEnd = findClosingQuote(raw, quoteStart + 1);
  if (textEnd === -1) return null;

  return {
    text: decodeNoteText(raw.slice(quoteStart + 1, textEnd)),
    textStart: quoteStart + 1,
    textEnd,
    attachedToClassId: match[1] ? toClassId(readIdentity(match[1])) : null,
  };
}

function decodeNoteText(text: string): string {
  return text.replace(/\\n/g, "\n");
}

function findClosingQuote(raw: string, start: number): number {
  for (let index = start; index < raw.length; index++) {
    if (raw[index] === '"') return index;
  }
  return -1;
}

function toStyleDefRecord(token: ParseToken): StyleDefRecord {
  const match = /^(\s*classDef\s+)(\w+)(\s+)(.+)$/.exec(token.raw);
  if (!match) {
    return {
      self: toSourceSpan(token),
      fields: {
        declaredName: toHeaderLocation(token),
        propertyList: toHeaderLocation(token),
        properties: {},
      },
    };
  }

  const listStart = match[1].length + match[2].length + match[3].length;
  return {
    self: toSourceSpan(token),
    fields: {
      declaredName: toLineFieldLocation(token, match[1].length, match[1].length + match[2].length),
      propertyList: toLineFieldLocation(token, listStart, token.raw.length),
      properties: toStylePropertyFields(token, listStart, token.raw.slice(listStart)),
    },
  };
}

function toStyleApplicationRecord(token: ParseToken): StyleApplicationRecord {
  const match = new RegExp(`^(\\s*class\\s+)(${IDENTITY_PATTERN})(:::)(\\w+)`).exec(token.raw);
  if (!match) {
    return {
      self: toSourceSpan(token),
      fields: { target: toHeaderLocation(token), styleName: toHeaderLocation(token) },
    };
  }
  const targetStart = match[1].length;
  const styleStart = targetStart + match[2].length + match[3].length;
  return {
    self: toSourceSpan(token),
    fields: {
      target: toLineFieldLocation(token, targetStart, targetStart + match[2].length),
      styleName: toLineFieldLocation(token, styleStart, styleStart + match[4].length),
    },
  };
}

function toRelationshipRecord(token: ParseToken): RelationshipRecord {
  const self = toSourceSpan(token);
  const match = new RegExp(
    `^(\\s*)(${IDENTITY_PATTERN})(?:\\s+"([^"]+)")?\\s*((?:\\(\\)|<\\||\\|>|<|>|\\*|o)?(?:--|\\.\\.)(?:\\(\\)|<\\||\\|>|<|>|\\*|o)?)\\s*(?:"([^"]+)"\\s*)?(${IDENTITY_PATTERN})(?:\\s*:\\s*(.+))?`
  ).exec(token.raw);
  if (!match) {
    return {
      self,
      fields: { sourceEndpoint: self, operator: self, targetEndpoint: self },
    };
  }
  const sourceStart = match[1].length;
  const operatorStart = token.raw.indexOf(match[4], sourceStart + match[2].length);
  const targetStart = token.raw.indexOf(match[6], operatorStart + match[4].length);
  const labelStart = match[7] ? token.raw.indexOf(match[7], targetStart + match[6].length) : -1;
  const sourceMultiplicityStart =
    match[3] === undefined ? -1 : token.raw.indexOf(`"${match[3]}"`, sourceStart + match[2].length);
  const targetMultiplicityStart =
    match[5] === undefined
      ? -1
      : token.raw.indexOf(`"${match[5]}"`, operatorStart + match[4].length);
  return {
    self,
    fields: {
      sourceEndpoint: toLineFieldLocation(token, sourceStart, sourceStart + match[2].length),
      ...(sourceMultiplicityStart >= 0
        ? {
            sourceMultiplicity: toLineFieldLocation(
              token,
              sourceMultiplicityStart + 1,
              sourceMultiplicityStart + (match[3]?.length ?? 0) + 1
            ),
          }
        : {}),
      operator: toLineFieldLocation(token, operatorStart, operatorStart + match[4].length),
      ...(targetMultiplicityStart >= 0
        ? {
            targetMultiplicity: toLineFieldLocation(
              token,
              targetMultiplicityStart + 1,
              targetMultiplicityStart + (match[5]?.length ?? 0) + 1
            ),
          }
        : {}),
      targetEndpoint: toLineFieldLocation(token, targetStart, targetStart + match[6].length),
      ...(labelStart >= 0
        ? { label: toLineFieldLocation(token, labelStart, labelStart + (match[7]?.length ?? 0)) }
        : {}),
    },
  };
}

function toStylePropertyFields(
  token: ParseToken,
  listStart: number,
  propertyList: string
): StylePropertyFields {
  const fields: Partial<Record<StylePropertyName, { entry: SourceSpan; value: SourceSpan }>> = {};
  let offset = 0;
  for (const part of propertyList.split(",")) {
    const entryStart = listStart + offset;
    const entryEnd = entryStart + part.length;
    const colon = part.indexOf(":");
    if (colon !== -1) {
      const sourceName = part.slice(0, colon).trim();
      const property = STYLE_PROPERTIES.find(
        (candidate) => candidate.name === sourceName || candidate.source === sourceName
      );
      if (property) {
        const valueLeading = part.slice(colon + 1).match(/^\s*/)?.[0].length ?? 0;
        const valueTrailing = part.slice(colon + 1).match(/\s*$/)?.[0].length ?? 0;
        const valueStart = entryStart + colon + 1 + valueLeading;
        const valueEnd = entryEnd - valueTrailing;
        fields[property.name] = {
          entry: toLineFieldLocation(token, entryStart, entryEnd),
          value: toLineFieldLocation(token, valueStart, valueEnd),
        };
      }
    }
    offset += part.length + 1;
  }
  return fields;
}

function parseStyleProperties(propertiesStr: string): StyleProperties {
  const properties: Record<keyof StyleProperties, string | null> = {
    fill: null,
    stroke: null,
    strokeWidth: null,
    strokeDasharray: null,
    color: null,
  };

  for (const part of propertiesStr.split(",")) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;

    const key = part.slice(0, colonIdx).trim();
    const value = part.slice(colonIdx + 1).trim();

    const property = STYLE_PROPERTIES.find(
      (styleProperty) => styleProperty.name === key || styleProperty.source === key
    );
    if (property) properties[property.name] = value;
  }

  return properties;
}

function parseStyleAnnotationProperties(propertiesStr: string): StyleProperties {
  const properties: Record<keyof StyleProperties, string | null> = {
    fill: null,
    stroke: null,
    strokeWidth: null,
    strokeDasharray: null,
    color: null,
  };

  for (const part of propertiesStr.split(/\s+/)) {
    const equalsIdx = part.indexOf("=");
    if (equalsIdx === -1) continue;

    const key = part.slice(0, equalsIdx).trim();
    const value = part.slice(equalsIdx + 1).trim();
    const property = STYLE_PROPERTIES.find(
      (styleProperty) => styleProperty.name === key || styleProperty.source === key
    );
    if (property) properties[property.name] = value;
  }

  return properties;
}
