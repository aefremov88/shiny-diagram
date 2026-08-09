/**
 * Muted standalone text.
 *
 * Renders `text` inline without owning truncation or wrapping behavior.
 *
 * Used by: the diagram-style inheritance explanation.
 */

import type { ReactElement } from "react";
import styles from "./TextBlock.module.css";

type TextBlockProps = {
  readonly text: string;
};

export default function TextBlock({ text }: TextBlockProps): ReactElement {
  return <span className={styles.text}>{text}</span>;
}
