/**
 * Resize affordance with corner, midpoint, and full-edge grab targets.
 *
 * Centers visible handles and wider edge targets around the host boundary using
 * `centerOffset`, placing edge targets at `stacking` and handles one plane above.
 * A press neither selects nor reaches the surface beneath; it reports the
 * grabbed handle and viewport point through `onGrab`.
 *
 * Used by: selected classes, notes, and namespaces.
 */

import type { CSSProperties, PointerEvent, ReactElement } from "react";
import type { Point } from "../../../../shared/geometry";
import styles from "./ResizeAffordance.module.css";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type ResizeAffordanceProps = {
  readonly centerOffset?: number;
  readonly stacking: number;
  readonly onGrab: (handle: ResizeHandle, point: Point) => void;
};

const HANDLES: readonly ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const EDGE_HANDLES: readonly Extract<ResizeHandle, "n" | "e" | "s" | "w">[] = ["n", "e", "s", "w"];

export default function ResizeAffordance({
  centerOffset = 3,
  stacking,
  onGrab,
}: ResizeAffordanceProps): ReactElement {
  // Event handler props derivation
  const onPointerDown =
    (handle: ResizeHandle) =>
    (event: PointerEvent<HTMLButtonElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      onGrab(handle, { x: event.clientX, y: event.clientY });
    };

  const affordanceStyle = {
    "--resize-affordance-center-offset": `${centerOffset}px`,
    "--resize-affordance-stacking": stacking,
  } as CSSProperties;

  return (
    <>
      {EDGE_HANDLES.map((handle) => (
        <button
          key={`edge-${handle}`}
          className={`${styles.edge} ${styles[`edge${handle.toUpperCase()}`]}`}
          style={affordanceStyle}
          type="button"
          aria-label={`Resize from ${toAccessiblePosition(handle)} edge`}
          onPointerDown={onPointerDown(handle)}
        />
      ))}
      {HANDLES.map((handle) => (
        <button
          key={handle}
          className={`${styles.handle} ${styles[handle]}`}
          style={affordanceStyle}
          type="button"
          aria-label={`Resize from ${toAccessiblePosition(handle)}`}
          onPointerDown={onPointerDown(handle)}
        />
      ))}
    </>
  );
}

function toAccessiblePosition(handle: ResizeHandle): string {
  switch (handle) {
    case "nw":
      return "top left";
    case "n":
      return "top";
    case "ne":
      return "top right";
    case "e":
      return "right";
    case "sw":
      return "bottom left";
    case "se":
      return "bottom right";
    case "s":
      return "bottom";
    case "w":
      return "left";
  }
}
