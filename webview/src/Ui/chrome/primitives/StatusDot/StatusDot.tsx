/**
 * Status indicator with a tooltip.
 *
 * Renders a circular indicator selected by `variant` and exposes `title` as
 * its tooltip and accessible name. `targetRole` and `targetName` are transcribed
 * onto the indicator.
 *
 * Modifiers:
 * - `variant` — the represented status:
 *   - `positive` uses affirmative status emphasis. Used by: rendered document
 *   - `attention` uses attention status emphasis. Used by: missing annotations
 *   - `error` uses error status emphasis. Used by: invalid syntax
 */

import type { ReactElement } from "react";
import styles from "./StatusDot.module.css";

type StatusDotProps = {
  readonly title: string;
  readonly variant: "positive" | "attention" | "error";
  readonly targetRole?: string;
  readonly targetName?: string;
};

export default function StatusDot({
  title,
  variant,
  targetRole,
  targetName,
}: StatusDotProps): ReactElement {
  return (
    <span
      className={`${styles.dot} ${styles[variant]}`}
      role="img"
      aria-label={title}
      title={title}
      data-target-role={targetRole}
      data-target-name={targetName}
    />
  );
}
