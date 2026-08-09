/**
 * Box interaction overlay combining outline, halo, and resize affordances.
 *
 * Centers outline and resize geometry with `centerOffset`. A supplied `haloTint`
 * paints the halo at `haloStacking`; resize targets use `affordanceStacking`. A
 * resize press reports its handle and viewport point through `onResizeGrab` and
 * does not reach the surface beneath.
 *
 * Lifecycle:
 * - `selected` — on keeps the selection outline visible; off shows it only on
 *   parent hover
 * - `pending` — on adds a pending placement outline
 * - `resizeVisible` — on renders corner, midpoint, and full-edge resize targets
 *
 * Modifiers:
 * - `haloTone` — the halo's wash when `haloTint` is absent:
 *   - `canvas` matches the canvas ground. Used by: selected classes on plain
 *     canvas ground
 *   - `faint` uses a translucent wash. Used by: selected classes with inherited
 *     styling
 *   - `omitted` renders no fallback halo. Used by: notes, namespaces, and
 *     unselected classes
 */

import type { ReactElement } from "react";
import type { Point } from "../../../../shared/geometry";
import BoxOutline from "../../primitives/BoxOutline/BoxOutline";
import HaloRing from "../../primitives/HaloRing/HaloRing";
import ResizeAffordance from "../../primitives/ResizeAffordance/ResizeAffordance";
import type { ResizeHandle } from "../../primitives/ResizeAffordance/ResizeAffordance";

export type { ResizeHandle };

type BoxInteractionOverlayProps = {
  readonly centerOffset?: number;
  readonly haloTint?: string;
  readonly haloStacking: number;
  readonly affordanceStacking: number;
  readonly selected: boolean;
  readonly pending: boolean;
  readonly resizeVisible: boolean;
  readonly haloTone?: "canvas" | "faint";
  readonly onResizeGrab: (handle: ResizeHandle, point: Point) => void;
};

export default function BoxInteractionOverlay({
  selected,
  pending,
  resizeVisible,
  centerOffset,
  haloTint,
  haloTone,
  haloStacking,
  affordanceStacking,
  onResizeGrab,
}: BoxInteractionOverlayProps): ReactElement {
  return (
    <>
      {haloTint || haloTone ? (
        <HaloRing tint={haloTint} tone={haloTone} stacking={haloStacking} />
      ) : null}
      {pending ? <BoxOutline variant="pending" centerOffset={centerOffset} /> : null}
      <BoxOutline variant={selected ? "selected" : "hover"} centerOffset={centerOffset} />
      {resizeVisible ? (
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <ResizeAffordance
            centerOffset={centerOffset}
            stacking={affordanceStacking}
            onGrab={onResizeGrab}
          />
        </div>
      ) : null}
    </>
  );
}
