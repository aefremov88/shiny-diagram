/**
 * Multiline commit field swapping wrapped display text for a full-area editor.
 *
 * Displays `displayText`; when display editing is enabled, clicking it reports
 * `onEditRequest`, otherwise pointer behavior falls through. Editing begins from
 * `initialValue`; leaving the editor or using the action labeled by `saveLabel`
 * reports `onCommit`, while backing out restores the initial value and reports
 * `onCancel`. Line breaks are typed as ordinary input; committing is only by the
 * save action or by leaving the editor. The optional `validation` remains
 * anchored beside the text region in either state. `elementRef` exposes the
 * content host for consumer-owned measurement.
 *
 * Used by: note-body display and editing.
 *
 * Lifecycle:
 * - `isEditing` — off renders wrapped display text; on renders the editor and
 *   save action
 * - `isEditEnabled` — on makes display text request editing; off leaves it inert
 */

import type { MouseEvent, ReactElement, ReactNode, Ref } from "react";
import { useCommitLifecycle } from "../../../core/commitLifecycle";
import InlineTextArea from "../../primitives/InlineTextArea/InlineTextArea";
import InlineTextBlock from "../../primitives/InlineTextBlock/InlineTextBlock";
import InlineTextButton from "../../primitives/InlineTextButton/InlineTextButton";
import styles from "./InlineCommitTextArea.module.css";

type InlineCommitTextAreaProps = {
  readonly initialValue: string;
  readonly displayText: string;
  readonly saveLabel: string;
  readonly validation?: ReactNode;
  readonly isEditing: boolean;
  readonly isEditEnabled?: boolean;
  readonly onEditRequest: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onCommit: (value: string) => void;
  readonly onCancel: () => void;
  readonly elementRef?: Ref<HTMLDivElement>;
};

export default function InlineCommitTextArea({
  initialValue,
  displayText,
  isEditing,
  isEditEnabled = true,
  saveLabel,
  validation,
  onEditRequest,
  onCommit,
  onCancel,
  elementRef,
}: InlineCommitTextAreaProps): ReactElement {
  const lifecycle = useCommitLifecycle({
    initialValue,
    enterCommits: false,
    onCommit,
    onCancel,
  });

  if (!isEditing) {
    return (
      <div ref={elementRef} className={styles.host}>
        {validation}
        <InlineTextBlock
          text={displayText}
          isEditEnabled={isEditEnabled}
          variant="body"
          onEditRequest={onEditRequest}
        />
      </div>
    );
  }

  return (
    <div ref={elementRef} className={`${styles.host} ${styles.editingHost}`}>
      {validation}
      <div
        className={styles.editor}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.fieldHost}>
          <InlineTextArea
            value={lifecycle.draft}
            treatment="body"
            onChange={lifecycle.onDraftChange}
            onBlur={lifecycle.onBlur}
            onKeyDown={lifecycle.onKeyDown}
          />
          <span className={styles.saveAction}>
            <InlineTextButton label={saveLabel} onClick={lifecycle.onCommitAttempt} />
          </span>
        </div>
      </div>
    </div>
  );
}
