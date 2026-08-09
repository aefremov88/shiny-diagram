import type { LayoutInput, SpatialAssignment } from "./layoutContracts";
import { routeLayout } from "./layoutRouter";

export function generateSpatialAssignments(input: LayoutInput): readonly SpatialAssignment[] {
  return routeLayout(input);
}

export type { LayoutInput, SpatialAssignment } from "./layoutContracts";
