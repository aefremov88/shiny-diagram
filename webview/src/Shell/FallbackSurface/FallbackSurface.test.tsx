import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FallbackSurface from "./FallbackSurface";

describe("FallbackSurface unsupported diagram type", () => {
  it.each([
    ["sequenceDiagram", "Sequence diagram"],
    ["flowchart", "Flowchart"],
    ["erDiagram", "Entity relationship diagram"],
    ["stateDiagram", "State diagram"],
    ["pie", "Pie chart"],
  ])("renders the human-readable %s message", (diagramType, label) => {
    const markup = renderToStaticMarkup(
      <FallbackSurface documentStatus={{ status: "unsupportedDiagramType", diagramType }} />
    );

    expect(markup).toContain(`${label} is not supported yet.`);
    expect(markup).toContain("<p");
    expect(markup).toContain("Shiny supports:</p><ul");
    expect(markup).toContain("<li>class diagrams</li>");
    expect(markup).toContain('aria-label="Unsupported diagram type"');
  });

  it("falls back to the raw declaration when no label is mapped", () => {
    const markup = renderToStaticMarkup(
      <FallbackSurface
        documentStatus={{ status: "unsupportedDiagramType", diagramType: "future" }}
      />
    );

    expect(markup).toContain("future is not supported yet.");
    expect(markup).toContain("<li>class diagrams</li>");
  });
});
