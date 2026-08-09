/**
 * Back-navigation button that keeps its place when unavailable.
 *
 * Renders `label` as the button content; clicking it reports `onClick`.
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
  readonly onClick?: () => void;
};

export default function ReservedBackLink({
  label,
  visible = true,
  onClick,
}: ReservedBackLinkProps): ReactElement {
  return (
    <button
      type="button"
      className={visible ? styles.link : styles.reservedBlank}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
