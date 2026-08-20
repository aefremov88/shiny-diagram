/**
 * Endpoint handle marking a visible relationship reconnect point with positive reconnect emphasis.
 *
 * Centers a noninteractive circular handle at `point`; the surrounding
 * framework-owned reconnect target remains invisible. `targetRole` and
 * `targetName` are transcribed onto the handle.
 *
 * Used by: relationship reconnection.
 *
 * Lifecycle:
 * - `visible` — on renders the handle; off renders nothing
 */

import type { ReactElement } from "react";
import type { Point } from "../../../../shared/geometry";
import styles from "./EdgeEndpointHandle.module.css";

type EdgeEndpointHandleProps = {
  readonly point: Point;
  readonly visible: boolean;
  readonly targetRole?: string;
  readonly targetName?: string;
};

export default function EdgeEndpointHandle({
  point,
  visible,
  targetRole,
  targetName,
}: EdgeEndpointHandleProps): ReactElement | null {
  return visible ? (
    <circle
      className={styles.handle}
      cx={point.x}
      cy={point.y}
      r={2.5}
      data-target-role={targetRole}
      data-target-name={targetName}
    />
  ) : null;
}
