/**
 * Downward chevron marking a control that opens a choice list.
 *
 * Draws the list disclosure mark with element-owned SVG treatment.
 *
 * Used by: color, line, annotation, named-style, and relationship choices.
 */

import type { ReactElement } from "react";
import styles from "./SelectorChevron.module.css";

export default function SelectorChevron(): ReactElement {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 8 5"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0h8L4 5Z" />
    </svg>
  );
}
