/**
 * Drop indicator marking a text-list insertion point.
 *
 * Renders a fixed-height accent line without interactive or accessible content.
 *
 * Used by: member-row reordering.
 */

import type { ReactElement } from "react";
import styles from "./DropIndicator.module.css";

export default function DropIndicator(): ReactElement {
  return <span className={styles.indicator} aria-hidden="true" />;
}
