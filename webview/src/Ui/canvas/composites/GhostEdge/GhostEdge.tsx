/**
 * Ghost edge assembling optional marker definitions around a preview line.
 *
 * Draws `d` with the preview's `lineKind`, defining and linking `startMarker`
 * and `endMarker` when supplied.
 *
 * Modifiers:
 * - `tone` — the preview identity:
 *   - `accent` previews accent treatment. Used by: relationship creation
 *   - `attachment` previews attachment treatment. Used by: note attachment
 */

import type { ReactElement } from "react";
import type { MarkerGlyphDescriptor } from "../../../../shared/glyph";
import EdgeEndpointMarker from "../../primitives/EdgeEndpointMarker/EdgeEndpointMarker";
import EdgeGhostLine from "../../primitives/EdgeGhostLine/EdgeGhostLine";

type GhostEdgeProps = {
  readonly d: string;
  readonly lineKind: "solid" | "dashed";
  readonly startMarker?: { readonly id: string; readonly glyph: MarkerGlyphDescriptor };
  readonly endMarker?: { readonly id: string; readonly glyph: MarkerGlyphDescriptor };
  readonly tone: "accent" | "attachment";
};

export default function GhostEdge({
  d,
  lineKind,
  tone,
  startMarker,
  endMarker,
}: GhostEdgeProps): ReactElement {
  return (
    <g>
      <defs>
        {startMarker ? (
          <EdgeEndpointMarker
            id={startMarker.id}
            glyph={startMarker.glyph}
            side="source"
            selected={false}
          />
        ) : null}
        {endMarker ? (
          <EdgeEndpointMarker
            id={endMarker.id}
            glyph={endMarker.glyph}
            side="target"
            selected={false}
          />
        ) : null}
      </defs>
      <EdgeGhostLine
        d={d}
        lineKind={lineKind}
        tone={tone}
        startMarkerId={startMarker?.id}
        endMarkerId={endMarker?.id}
      />
    </g>
  );
}
