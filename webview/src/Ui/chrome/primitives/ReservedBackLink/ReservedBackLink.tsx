/**
 * Back-navigation button that keeps its place when unavailable.
 *
 * Renders `label` as the button content; clicking it reports `onClick`.
 * `targetRole` and `targetName` are transcribed while the link is `visible`.
 *
 * Gesture targets:
 * - `backLink()` — `role=button`
 *
 * Used by: return from a diagram style reached through a class.
 *
 * Lifecycle:
 * - `visible` — off hides the control while its layout space is kept; it leaves
 *   the focus order and accessibility tree
 */

import type { ReactElement } from "react";
import styles from "./ReservedBackLink.module.css";

type ReservedBackLinkProps = {
  readonly label: string;
  readonly visible?: boolean;
  readonly targetRole?: string;
  readonly targetName?: string;
  readonly onClick?: () => void;
};

export default function ReservedBackLink({
  label,
  visible = true,
  targetRole,
  targetName,
  onClick,
}: ReservedBackLinkProps): ReactElement {
  return (
    <button
      type="button"
      className={visible ? styles.link : styles.reservedBlank}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      data-target-role={visible ? targetRole : undefined}
      data-target-name={visible ? targetName : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
