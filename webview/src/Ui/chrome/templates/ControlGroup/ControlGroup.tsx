/**
 * Control group arranging related children in a uniform grid.
 *
 * Places `children` into equal, shrinkable tracks spanning the available width.
 *
 * Modifiers:
 * - `columns` — the group arrangement:
 *   - `1` stacks children. Used by: style selection and relationship reversal
 *   - `2` arranges two equal columns. Used by: duplicate/delete and style actions
 * - `spacing` — the distance between children:
 *   - `default` keeps compact gaps. Used by: edit-pane action groups
 *   - `wide` doubles the gap. Used by: saved-style selection
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./ControlGroup.module.css";

type ControlGroupProps = {
  readonly children: ReactNode;
  readonly columns?: 1 | 2;
  readonly spacing?: "default" | "wide";
};

export default function ControlGroup({
  columns = 1,
  spacing = "default",
  children,
}: ControlGroupProps): ReactElement {
  const columnClass = columns === 2 ? styles.twoColumnGroup : styles.oneColumnGroup;
  const className = spacing === "wide" ? `${columnClass} ${styles.wideSpacing}` : columnClass;

  return <div className={className}>{children}</div>;
}
