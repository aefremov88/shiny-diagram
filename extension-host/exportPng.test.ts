import { describe, expect, it } from "vitest";
import { toPngPath } from "./exportPath";

describe("toPngPath", () => {
  it.each([
    ["/work/thread.mmd", "/work/thread.png"],
    ["/work/my thread.mmd", "/work/my thread.png"],
    ["/work/domain.model.v2.mmd", "/work/domain.model.v2.png"],
  ])("derives %s as %s", (sourcePath, expectedPath) => {
    expect(toPngPath(sourcePath)).toBe(expectedPath);
  });
});
