/**
 * @fileoverview Shell-owned mode state contract and default.
 */

export type WebViewMode = "mermaid" | "shiny";
export type SyntaxErrorDetail = {
  readonly line: number;
  readonly fragment: string;
  readonly message: string;
};

export type DocumentStatus =
  | { readonly status: "ready" }
  | { readonly status: "missingAnnotations"; readonly missingClassIds: readonly string[] }
  | { readonly status: "unsupportedDiagramType"; readonly diagramType: string }
  | { readonly status: "invalidSyntax"; readonly errors: readonly SyntaxErrorDetail[] };

export const defaultWebViewMode: WebViewMode = "shiny";
export const defaultDocumentStatus: DocumentStatus = { status: "invalidSyntax", errors: [] };
