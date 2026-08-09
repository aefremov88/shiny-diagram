import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SwatchToggle from "../src/Ui/chrome/composites/SwatchToggle/SwatchToggle";
import StyledBoxSwatch, {
  toSwatchStrokeWidth,
} from "../src/Ui/chrome/primitives/StyledBoxSwatch/StyledBoxSwatch";

describe("style swatch rendering", () => {
  it("renders distinctive stroke color, scaled width, and exact dash pattern", () => {
    const markup = renderToStaticMarkup(
      <StyledBoxSwatch
        label="Pine"
        styleValues={{
          fill: "#779c8c",
          stroke: "#275340",
          color: "#ffffff",
          strokeWidth: "4px",
          strokeDasharray: "8 3 2 3",
        }}
      />
    );

    expect(markup).toContain('stroke="#275340"');
    expect(markup).toContain('stroke-width="2px"');
    expect(markup).toContain('stroke-dasharray="8 3 2 3"');
    expect(markup).toContain("--styled-box-fill:#779c8c");
    expect(markup).toContain("--styled-box-color:#ffffff");
  });

  it("distinguishes styles that differ only by stroke", () => {
    const first = renderToStaticMarkup(
      <StyledBoxSwatch
        label="First"
        styleValues={{ fill: "#fff", color: "#111", stroke: "#123456" }}
      />
    );
    const second = renderToStaticMarkup(
      <StyledBoxSwatch
        label="Second"
        styleValues={{ fill: "#fff", color: "#111", stroke: "#abcdef" }}
      />
    );

    expect(first).toContain('stroke="#123456"');
    expect(second).toContain('stroke="#abcdef"');
  });

  it("retains the style stroke when selected", () => {
    const markup = renderToStaticMarkup(
      <SwatchToggle
        label="Selected"
        pressed
        styleValues={{
          fill: "#779c8c",
          stroke: "#275340",
          color: "#ffffff",
          strokeWidth: "4px",
          strokeDasharray: "7 3",
        }}
      />
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('stroke="#275340"');
    expect(markup).toContain('stroke-width="2px"');
    expect(markup).toContain('stroke-dasharray="7 3"');
  });

  it("uses one proportional clamped miniature-width rule", () => {
    expect(toSwatchStrokeWidth("1px")).toBe("1px");
    expect(toSwatchStrokeWidth("4px")).toBe("2px");
    expect(toSwatchStrokeWidth("10px")).toBe("3px");
  });
});
