import { describe, expect, it } from "vitest";
import { minGap } from "./spacing";

describe("minGap", () => {
  it("caps a large/small vertical gap at the smaller height", () => {
    expect(minGap({ w: 200, h: 400 }, { w: 180, h: 60 }, "y")).toBe(60);
  });

  it("uses one quarter of the larger size for similar boxes", () => {
    expect(minGap({ w: 200, h: 120 }, { w: 180, h: 100 }, "y")).toBe(30);
  });
});
