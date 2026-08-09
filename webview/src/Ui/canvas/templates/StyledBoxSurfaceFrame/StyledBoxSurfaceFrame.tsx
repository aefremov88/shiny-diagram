/**
 * Styled box surface framing vertically arranged content with user values.
 *
 * Fills its host with `children`, uses `title` as the tooltip, applies `fill`,
 * `stroke`, `strokeWidth`, `lineStyle`, and `color` with base fallbacks, and
 * reports `onClick` when clicked. `placementCursor` selects the placement cursor;
 * `elementRef` exposes the surface host for consumer-owned measurement.
 *
 * Used by: class surfaces.
 *
 * Lifecycle:
 * - `dragging` — on shows active dragging while retaining the surface appearance
 * - `placementCursor` — on shows that relationship placement is available
 */

import type { CSSProperties, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import styles from "./StyledBoxSurfaceFrame.module.css";

type StyledBoxSurfaceFrameProps = {
  readonly title: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: string;
  readonly lineStyle: "solid" | "dashed" | "dotted";
  readonly color?: string;
  readonly children: ReactNode;
  readonly dragging: boolean;
  readonly placementCursor: boolean;
  readonly onClick: (event: MouseEvent<HTMLDivElement>) => void;
  readonly elementRef?: Ref<HTMLDivElement>;
};

export default function StyledBoxSurfaceFrame({
  title,
  fill,
  stroke,
  strokeWidth,
  lineStyle,
  color,
  dragging,
  placementCursor,
  children,
  onClick,
  elementRef,
}: StyledBoxSurfaceFrameProps): ReactElement {
  const style = {
    "--styled-box-fill": fill,
    "--styled-box-stroke": stroke,
    "--styled-box-stroke-width": strokeWidth,
    "--styled-box-line-style": lineStyle,
    "--styled-box-color": color,
  } as CSSProperties;
  const className = [
    styles.frame,
    dragging ? styles.dragging : "",
    placementCursor ? styles.placementCursor : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={elementRef} className={className} style={style} title={title} onClick={onClick}>
      {children}
    </div>
  );
}
