/**
 * Pane section arranging optional heading and content.
 *
 * Centers `label` as a heading when nonempty and places `children` into equal,
 * shrinkable tracks.
 *
 * Modifiers:
 * - `columns` — the section arrangement:
 *   - `1` stacks content in one centered track. Used by: edit-pane fields and
 *     grouped controls
 *   - `2` uses two equal centered tracks. Used by: relationship placement tools
 * - `spacingAfter` — the following section gap:
 *   - `default` leaves the standard gap. Used by: everywhere else
 *   - `compact` reduces the gap. Used by: the note attachment section
 */

import type { ReactElement, ReactNode } from "react";
import styles from "./PaneSection.module.css";

type PaneSectionProps = {
  readonly label?: string;
  readonly children?: ReactNode;
  readonly columns?: 1 | 2;
  readonly spacingAfter?: "default" | "compact";
};

export default function PaneSection({
  label,
  columns = 1,
  spacingAfter = "default",
  children,
}: PaneSectionProps): ReactElement {
  return (
    <section
      className={`${styles.section} ${spacingAfter === "compact" ? styles.compactAfter : ""}`}
    >
      {label === undefined || label === "" ? null : <h2 className={styles.label}>{label}</h2>}
      <div className={columns === 2 ? styles.twoColumnContent : styles.oneColumnContent}>
        {children}
      </div>
    </section>
  );
}
