/**
 * @fileoverview Coordinates projection of a DiagramGraph into View-owned render contracts.
 */

import type { DiagramGraph } from "../model/diagramGraph";
import type { DiagramView } from "../../View/views";
import { deriveClassBoxViews } from "./workers/deriveClassBoxViews";
import { deriveNamespaceBoxViews } from "./workers/deriveNamespaceBoxViews";
import { deriveRelationshipViews } from "./workers/deriveRelationshipViews";
import { deriveStyleViews } from "./workers/deriveStyleViews";
import { deriveNoteViews } from "./workers/deriveNoteViews";

/**
 * Derives all render-facing views from a Controller diagram graph.
 */
export function deriveDiagramView(model: DiagramGraph): DiagramView {
  return {
    direction: model.diagram.direction,
    classes: deriveClassBoxViews(model),
    namespaces: deriveNamespaceBoxViews(model),
    relationships: deriveRelationshipViews(model),
    notes: deriveNoteViews(model),
    styles: deriveStyleViews(model),
  };
}
