/**
 * @fileoverview Projects unpositioned classes into the Generate-only View lane.
 */

import type { DiagramGraph } from "../../model/diagramGraph";
import type { UnpositionedClassView } from "../../../View/views";

export function deriveUnpositionedClassViews(model: DiagramGraph): UnpositionedClassView[] {
  return [...model.classes.values()]
    .filter((node) => node.spatial === null)
    .map((node) => ({
      classId: node.id,
      parentNamespaceId: node.parentNamespaceId,
      header: {
        name: `${node.name}${node.genericType ? `<${node.genericType}>` : ""}`,
        label: node.label,
        stereotype: node.annotation ?? undefined,
      },
      members: [
        ...node.attributes.map((attribute) => ({
          memberId: attribute.id,
          text: attribute.text,
          classifier: attribute.classifier,
          kind: "field" as const,
        })),
        ...node.methods.map((method) => ({
          memberId: method.id,
          text: method.text,
          classifier: method.classifier,
          kind: "method" as const,
        })),
      ],
    }));
}
