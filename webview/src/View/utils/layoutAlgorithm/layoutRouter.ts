import type { LayoutInput, SpatialAssignment } from "./layoutContracts";
import { fullLayout } from "./fullLayout/fullLayout";
import { incrementalLayout } from "./incrementalLayout/incrementalLayout";

export function routeLayout(input: LayoutInput): readonly SpatialAssignment[] {
  const positionedClasses = input.classes.length - input.missingClassIds.length;
  const positionedNotes = input.notes.filter((note) => note.bounds !== null).length;
  const positionedCount = positionedClasses + positionedNotes;
  const branch = positionedCount <= 1 ? "fullLayout" : "incrementalLayout";
  // eslint-disable-next-line no-console -- Permanent debug trace for Generate branch diagnostics.
  console.debug("[layoutRouter]", {
    positionedCount,
    positionedClasses,
    positionedNotes,
    branch,
  });
  return branch === "fullLayout" ? fullLayout(input) : incrementalLayout(input);
}
