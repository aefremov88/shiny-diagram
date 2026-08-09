/**
 * Inline text button for a compact momentary action.
 *
 * Renders `label` as its content; clicking it reports `onClick`.
 *
 * Used by: saving a note-body edit.
 */

import type { ReactElement } from "react";
import styles from "./InlineTextButton.module.css";

type InlineTextButtonProps = {
  readonly label: string;
  readonly onClick: () => void;
};

export default function InlineTextButton({ label, onClick }: InlineTextButtonProps): ReactElement {
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      {label}
    </button>
  );
}
