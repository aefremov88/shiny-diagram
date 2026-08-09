/**
 * @render Relationship ghost path and endpoint markers.
 */

import type { ReactElement } from "react";
import type { RelationshipSeed } from "../../../../../../state/editorStates";
import { endpointGlyphs } from "../../RelationshipMarker/icons";
import GhostEdge from "../../../../../../../Ui/canvas/composites/GhostEdge/GhostEdge";

type RelationshipGhostLineProps = {
  readonly seed: RelationshipSeed;
  readonly d: string;
};

export default function RelationshipGhostLine({
  seed,
  d,
}: RelationshipGhostLineProps): ReactElement {
  // UI props derivation
  const sourceMarkerId = `relationship-placement-source-${seed.sourceEndpointKind}`;
  const targetMarkerId = `relationship-placement-target-${seed.targetEndpointKind}`;

  return (
    <GhostEdge
      d={d}
      lineKind={seed.lineKind}
      tone="accent"
      startMarker={
        seed.sourceEndpointKind === "none"
          ? undefined
          : { id: sourceMarkerId, glyph: endpointGlyphs[seed.sourceEndpointKind] }
      }
      endMarker={
        seed.targetEndpointKind === "none"
          ? undefined
          : { id: targetMarkerId, glyph: endpointGlyphs[seed.targetEndpointKind] }
      }
    />
  );
}
