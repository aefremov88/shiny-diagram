import * as documentIndex from "./document-index.mjs";
import * as uiCatalog from "./ui-catalog.mjs";
import * as writebackCatalog from "./writeback-catalog.mjs";

export const planes = [uiCatalog, writebackCatalog, documentIndex];

export const planesByName = new Map(planes.map((plane) => [plane.name, plane]));
