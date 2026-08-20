/**
 * Collapse tab mounted against a pane edge.
 *
 * Clicking the tab reports `onToggle`, supplies the matching expand or collapse
 * accessible instruction, and paints at the supplied `stacking` plane.
 * `targetRole` identifies the button by its current accessible instruction.
 *
 * Gesture targets:
 * - `paneCollapseTab()` — `role=button`
 *
 * Used by: the editor's property pane.
 *
 * Lifecycle:
 * - `collapsed` — off points outward and offers collapse; on points inward and
 *   offers expansion
 */

import type { CSSProperties, ReactElement } from "react";
import { GLYPH_VIEW_BOX } from "../../../../shared/glyph";
import styles from "./PaneCollapseTab.module.css";

type PaneCollapseTabProps = {
  readonly stacking: number;
  readonly collapsed: boolean;
  readonly targetRole?: string;
  readonly onToggle: () => void;
};

export default function PaneCollapseTab({
  collapsed,
  stacking,
  targetRole,
  onToggle,
}: PaneCollapseTabProps): ReactElement {
  const style = { zIndex: stacking } satisfies CSSProperties;
  return (
    <button
      type="button"
      className={styles.tab}
      style={style}
      aria-label={collapsed ? "Expand pane" : "Collapse pane"}
      title={collapsed ? "Expand pane" : "Collapse pane"}
      data-target-role={targetRole}
      data-target-name={collapsed ? "Expand pane" : "Collapse pane"}
      onClick={onToggle}
    >
      <svg
        className={collapsed ? styles.inward : styles.outward}
        viewBox={GLYPH_VIEW_BOX}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="m6 4 4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
