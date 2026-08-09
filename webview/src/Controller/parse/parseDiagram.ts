/**
 * @fileoverview Coordinates tokenization, model construction, and parse status classification.
 */

import type { ParseResult } from "./parseResult";
import type { EditorDiagnostic } from "./parseResult";
import type { DiagramGraph } from "../model/diagramGraph";
import { toNamespaceId, type ClassId } from "../../shared/ids";
import { buildSpatiallyUnawareDiagramGraph } from "./workers/buildDiagramGraph";
import { attachNoteAnnotations } from "./workers/noteAnnotations";
import { attachSpatial, parseSpatialAnnotations } from "./workers/spatialAnnotations";
import { tokenize, type ParseToken } from "./workers/tokenizer";
import { validateTextBlocks } from "./workers/validateTextBlocks";
import { UNSUPPORTED_MERMAID_DIAGRAM_TYPES } from "../../shared/diagramTypes";

/**
 * Parses Mermaid class-diagram source into a Controller model and parse status.
 */
export function parseDiagram(source: string): ParseResult {
  try {
    const diagramType = detectDiagramType(source);
    if (diagramType?.kind === "unsupported") {
      return {
        status: "unsupportedDiagramType",
        diagramType: diagramType.declaration,
      };
    }
    if (diagramType?.kind !== "class") {
      const firstSourceLine = toFirstSourceLine(source);
      return {
        status: "invalidSyntax",
        diagnostics: [
          {
            kind: "syntaxError",
            message: "Expected a classDiagram declaration",
            line: firstSourceLine.line,
            fragment: firstSourceLine.fragment,
          },
        ],
      };
    }

    const tokens = tokenize(source);
    const syntaxDiagnostics = [
      ...collectUnrecognizedDiagnostics(tokens),
      ...collectInvalidClassBodyDiagnostics(tokens),
      ...collectEmptyNamespaceDiagnostics(tokens),
    ];
    if (syntaxDiagnostics.length > 0) {
      return { status: "invalidSyntax", diagnostics: syntaxDiagnostics };
    }

    const spatiallyUnaware = buildSpatiallyUnawareDiagramGraph(tokens);
    const { valid, malformed } = parseSpatialAnnotations(tokens);
    const namespaceSpatialDiagnostics = collectNamespaceSpatialDiagnostics(
      spatiallyUnaware.graph,
      valid
    );
    const spatiallyAware = attachSpatial(
      spatiallyUnaware.graph,
      spatiallyUnaware.provenance,
      valid
    );
    const {
      graph,
      provenance,
      diagnostics: noteDiagnostics,
    } = attachNoteAnnotations(spatiallyAware.graph, spatiallyAware.provenance, tokens);
    const validationDiagnostics = validateTextBlocks(graph, source);
    if (validationDiagnostics.length > 0) {
      return { status: "invalidSyntax", diagnostics: validationDiagnostics };
    }

    const missingIds = [...graph.classes.values()]
      .filter((node) => !node.spatial)
      .map((node) => node.id);

    if (missingIds.length > 0) {
      const malformedAnnotations = new Map(
        malformed.map((entry) => [entry.classId, entry.location])
      );
      return {
        status: "missingAnnotations",
        graph,
        provenance,
        diagnostics: [
          ...spatiallyUnaware.diagnostics,
          ...noteDiagnostics,
          ...namespaceSpatialDiagnostics,
        ],
        missingIds,
        malformedAnnotations,
      };
    }

    return {
      status: "ready",
      graph,
      provenance,
      diagnostics: [
        ...spatiallyUnaware.diagnostics,
        ...noteDiagnostics,
        ...namespaceSpatialDiagnostics,
      ],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown parse error";
    const firstSourceLine = toFirstSourceLine(source);
    return {
      status: "invalidSyntax",
      diagnostics: [
        {
          kind: "syntaxError",
          message,
          line: firstSourceLine.line,
          fragment: firstSourceLine.fragment,
        },
      ],
    };
  }
}

function collectInvalidClassBodyDiagnostics(tokens: readonly ParseToken[]): EditorDiagnostic[] {
  const diagnostics: EditorDiagnostic[] = [];
  collectInvalidClassBodyDiagnosticsInto(tokens, diagnostics);
  return diagnostics;
}

function collectInvalidClassBodyDiagnosticsInto(
  tokens: readonly ParseToken[],
  diagnostics: EditorDiagnostic[]
): void {
  for (const token of tokens) {
    if (token.type === "classDeclaration") {
      for (const bodyToken of token.blockTokens ?? []) {
        if (isInvalidClassBodyStatement(bodyToken)) {
          diagnostics.push({
            kind: "syntaxError",
            message: "Expected a class member declaration",
            line: bodyToken.lineNumber + 1,
            fragment: bodyToken.raw.trim(),
          });
        }
      }
      continue;
    }

    if (token.blockTokens) {
      collectInvalidClassBodyDiagnosticsInto(token.blockTokens, diagnostics);
    }
  }
}

function isInvalidClassBodyStatement(token: ParseToken): boolean {
  switch (token.type) {
    case "diagramHeader":
    case "direction":
    case "classDeclaration":
    case "relationship":
    case "styleDef":
    case "classDirectStyle":
    case "styleApplication":
    case "spatialAnnotation":
    case "noteAnnotation":
    case "namespaceStyleAnnotation":
    case "configDirective":
    case "noteStatement":
    case "namespace":
    case "knownIgnored":
      return true;
    case "classMember":
    case "directive":
    case "blank":
    case "unrecognized":
      return false;
  }
}

function collectEmptyNamespaceDiagnostics(tokens: readonly ParseToken[]): EditorDiagnostic[] {
  const diagnostics: EditorDiagnostic[] = [];
  collectEmptyNamespaceDiagnosticsInto(tokens, diagnostics);
  return diagnostics;
}

function collectEmptyNamespaceDiagnosticsInto(
  tokens: readonly ParseToken[],
  diagnostics: EditorDiagnostic[]
): void {
  for (const token of tokens) {
    if (token.type === "namespace" && (token.blockTokens?.length ?? 0) === 0) {
      diagnostics.push({
        kind: "syntaxError",
        message: "Expected at least one declaration inside the namespace",
        line: token.lineNumber + 1,
        fragment: token.raw.trim(),
      });
    }
    if (token.blockTokens) {
      collectEmptyNamespaceDiagnosticsInto(token.blockTokens, diagnostics);
    }
  }
}

function collectNamespaceSpatialDiagnostics(
  graph: DiagramGraph,
  spatialEntries: readonly {
    readonly classId: ClassId;
    readonly location: { readonly start: { readonly line: number } };
  }[]
): EditorDiagnostic[] {
  return spatialEntries.flatMap((entry) =>
    graph.namespaces.has(toNamespaceId(entry.classId)) && !graph.classes.has(entry.classId)
      ? [
          {
            kind: "orphanedAnnotation" as const,
            elementId: entry.classId,
            message: `Orphaned namespace @spatial annotation at line ${entry.location.start.line + 1}`,
          },
        ]
      : []
  );
}

function collectUnrecognizedDiagnostics(tokens: readonly ParseToken[]): EditorDiagnostic[] {
  const diagnostics: EditorDiagnostic[] = [];
  collectUnrecognizedDiagnosticsInto(tokens, diagnostics);
  return diagnostics;
}

function collectUnrecognizedDiagnosticsInto(
  tokens: readonly ParseToken[],
  diagnostics: EditorDiagnostic[]
): void {
  for (const token of tokens) {
    if (token.type === "unrecognized") {
      diagnostics.push({
        kind: "syntaxError",
        message: "Expected a supported Mermaid class-diagram statement",
        line: token.lineNumber + 1,
        fragment: token.raw.trim(),
      });
    }
    if (token.blockTokens && token.type !== "classDeclaration") {
      collectUnrecognizedDiagnosticsInto(token.blockTokens, diagnostics);
    }
  }
}

type DetectedDiagramType =
  | { readonly kind: "class"; readonly declaration: string }
  | { readonly kind: "unsupported"; readonly declaration: string };

function detectDiagramType(source: string): DetectedDiagramType | null {
  const unsupportedTypes = new Set<string>(UNSUPPORTED_MERMAID_DIAGRAM_TYPES);
  let inFrontmatter = false;

  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (inFrontmatter) {
      if (trimmed === "---") inFrontmatter = false;
      continue;
    }
    if (trimmed === "---") {
      inFrontmatter = true;
      continue;
    }
    if (trimmed.startsWith("%%")) continue;

    const declaration = trimmed.split(/\s/, 1)[0] ?? "";
    if (declaration === "classDiagram" || declaration === "classDiagram-v2") {
      return { kind: "class", declaration };
    }
    if (unsupportedTypes.has(declaration)) {
      return { kind: "unsupported", declaration };
    }
    return null;
  }
  return null;
}

function toFirstSourceLine(source: string): { readonly line: number; readonly fragment: string } {
  const lines = source.split("\n");
  const index = lines.findIndex((line) => line.trim().length > 0);
  const sourceIndex = index === -1 ? 0 : index;
  return { line: sourceIndex + 1, fragment: lines[sourceIndex]?.trim() ?? "" };
}
