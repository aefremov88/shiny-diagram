/**
 * @fileoverview Result and diagnostic contracts returned by the parse component.
 */

import type { DiagramGraph } from "../model/diagramGraph";
import type { ProvenanceIndex } from "../model/provenanceIndex";
import type { SourceSpan } from "../model/sourceEdit";
import type { ClassId } from "../../shared/ids";

export type EditorDiagnostic = {
  readonly kind:
    | "orphanedAnnotation"
    | "duplicateAnnotation"
    | "missingAnnotation"
    | "malformedAnnotation"
    | "duplicateClassDeclaration"
    | "syntaxError";
  readonly message: string;
  readonly elementId?: string;
  readonly line?: number;
  readonly fragment?: string;
};

/**
 * Missing-annotation results carry generation metadata so commands can add or
 * replace spatial annotations without reparsing source.
 */
export type ParseResult =
  | {
      readonly status: "unsupportedDiagramType";
      readonly diagramType: string;
    }
  | {
      readonly status: "ready";
      readonly graph: DiagramGraph;
      readonly provenance: ProvenanceIndex;
      readonly diagnostics: readonly EditorDiagnostic[];
    }
  | {
      readonly status: "missingAnnotations";
      readonly graph: DiagramGraph;
      readonly provenance: ProvenanceIndex;
      readonly diagnostics: readonly EditorDiagnostic[];
      readonly missingIds: readonly ClassId[];
      readonly malformedAnnotations: ReadonlyMap<ClassId, SourceSpan>;
    }
  | { readonly status: "invalidSyntax"; readonly diagnostics: readonly EditorDiagnostic[] };
