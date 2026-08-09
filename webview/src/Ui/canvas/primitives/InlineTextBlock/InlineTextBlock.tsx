/**
 * Non-editable text on a canvas surface.
 *
 * Renders the text (`text`) exactly where its editable counterpart appears,
 * so swapping display for editing does not shift a pixel. When editing is
 * enabled, clicking asks to edit (`onEditRequest`) — the element only requests;
 * opening an editor is the consumer's decision. Otherwise it attaches no
 * pointer handlers and leaves cursor choice to its host.
 *
 * Lifecycle:
 * - `isEditEnabled` — on accepts edit requests and presents the default cursor;
 *   off lets pointer interaction and cursor presentation fall through
 *
 * Modifiers:
 * - `variant` — what is rendered:
 *   - `primary` renders one prominent centered line and ellipsizes overflow.
 *     Used by: class titles
 *   - `secondary` renders one small line and ellipsizes overflow. Used by: class
 *     stereotypes and aliases
 *   - `heading` renders one medium left-aligned line and ellipsizes overflow.
 *     Used by: namespace headings
 *   - `body` renders multiline text at its natural wrapped height. Used by:
 *     note bodies
 *   - `row` renders compact padded text that wraps. Used by: class-member rows
 */

import type { MouseEvent, ReactElement } from "react";
import styles from "./InlineTextBlock.module.css";

type InlineTextBlockProps = {
  readonly text: string;
  readonly isEditEnabled?: boolean;
  readonly variant: "primary" | "secondary" | "heading" | "body" | "row";
  readonly onEditRequest: (event: MouseEvent<HTMLDivElement>) => void;
};

export default function InlineTextBlock({
  text,
  isEditEnabled = true,
  variant,
  onEditRequest,
}: InlineTextBlockProps): ReactElement {
  const title = variant === "primary" || variant === "row" ? text : undefined;

  return (
    <div
      className={`${styles.text} ${styles[variant]} ${isEditEnabled ? styles.editEnabled : ""}`}
      title={title}
      onClick={isEditEnabled ? onEditRequest : undefined}
      onDoubleClick={isEditEnabled ? onEditRequest : undefined}
    >
      {text}
    </div>
  );
}
