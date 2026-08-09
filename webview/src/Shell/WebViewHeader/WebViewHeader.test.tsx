import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DocumentStatus } from "../state";
import WebViewHeader from "./WebViewHeader";

describe("WebViewHeader PNG export availability", () => {
  it.each<DocumentStatus>([
    { status: "invalidSyntax", errors: [] },
    { status: "missingAnnotations", missingClassIds: ["A"] },
    { status: "unsupportedDiagramType", diagramType: "sequenceDiagram" },
  ])("disables export while status is $status", (documentStatus) => {
    const markup = renderHeader(documentStatus);
    expect(markup).toMatch(
      /<button[^>]*disabled=""[^>]*title="Export available when the diagram renders"/
    );
  });

  it("enables export for a ready Shiny diagram", () => {
    const markup = renderHeader({ status: "ready" });
    const exportButton = markup.match(/<button[^>]*>.*?Export PNG.*?<\/button>/)?.[0] ?? "";
    expect(exportButton).not.toContain("disabled");
  });
});

function renderHeader(documentStatus: DocumentStatus): string {
  return renderToStaticMarkup(
    <WebViewHeader
      mode="shiny"
      documentName="thread.mmd"
      documentStatus={documentStatus}
      isExporting={false}
      onModeChange={() => {}}
      onHistory={() => {}}
      onGenerate={() => {}}
      onExport={() => {}}
    />
  );
}
