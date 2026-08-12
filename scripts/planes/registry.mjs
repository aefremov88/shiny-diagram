import * as gestureTargets from "./gesture-targets.mjs";
import * as uiCatalog from "./ui-catalog.mjs";
import * as writebackCatalog from "./writeback-catalog.mjs";

export const planes = [uiCatalog, writebackCatalog, gestureTargets];

export const planesByName = new Map(planes.map((plane) => [plane.name, plane]));
