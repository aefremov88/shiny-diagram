import { describe, expect, it } from "vitest";
import { classId } from "../testFixtures";
import { selectNextElement, type Coupling } from "./placementOrder";

describe("placementOrder", () => {
  it("prefers placed coupling, then total coupling, then id and rescores", () => {
    const a = classId("A");
    const b = classId("B");
    const c = classId("C");
    const fixed = classId("Fixed");
    const coupling: Coupling = new Map([
      [a, new Set([fixed])],
      [b, new Set([a, c])],
      [c, new Set([classId("Disconnected")])],
    ]);
    expect(selectNextElement([c, b, a], new Set([fixed]), coupling)).toBe(a);
    expect(selectNextElement([c, b], new Set([fixed, a]), coupling)).toBe(b);
    expect(selectNextElement([c], new Set([fixed, a, b]), coupling)).toBe(c);
  });
});
