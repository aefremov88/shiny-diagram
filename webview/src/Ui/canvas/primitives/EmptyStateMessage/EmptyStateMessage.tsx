/**
 * Empty-state message overlay that does not intercept interaction.
 *
 * Renders `message` in a padded overlay at the supplied `stacking` plane.
 *
 * Used by: a diagram with no classes, notes, namespaces, or relationships.
 */

import type { CSSProperties, ReactElement } from "react";
import styles from "./EmptyStateMessage.module.css";

type EmptyStateMessageProps = {
  readonly message: string;
  readonly stacking: number;
};

export default function EmptyStateMessage({
  message,
  stacking,
}: EmptyStateMessageProps): ReactElement {
  const style = { zIndex: stacking } satisfies CSSProperties;
  return (
    <p className={styles.message} style={style}>
      {message}
    </p>
  );
}
