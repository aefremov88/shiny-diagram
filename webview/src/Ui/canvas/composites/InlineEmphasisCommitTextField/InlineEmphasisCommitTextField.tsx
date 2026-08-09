/**
 * Inline commit field with mutually exclusive underline and italic controls.
 *
 * Converts `initialValue` and subsequent edits to one line, initializes its
 * formatting from `initialEmphasis`, and resets both when incoming values change.
 * `validate` gates completion: confirming a valid draft, or leaving the field
 * with one, reports text and emphasis through `onCommit`; leaving with an invalid
 * draft restores both and reports `onDiscard` with messages; backing out or
 * cancelling restores both and reports `onCancel`. Controls use `actionStacking`,
 * validation uses `validationStacking`, and `surface` supplies an explicit action
 * ground over the base fallback.
 *
 * Used by: class-member editing with underline and italic controls.
 */

import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { GlyphDescriptor } from "../../../../shared/glyph";
import { useCommitLifecycle } from "../../../core/commitLifecycle";
import InlineActionButton from "../../primitives/InlineActionButton/InlineActionButton";
import InlineTextArea from "../../primitives/InlineTextArea/InlineTextArea";
import InlineToggleButton from "../../primitives/InlineToggleButton/InlineToggleButton";
import InlineValidationPopup from "../../primitives/InlineValidationPopup/InlineValidationPopup";
import styles from "./InlineEmphasisCommitTextField.module.css";

export type TextEmphasis = "underline" | "italic";

const UNDERLINE_GLYPH: GlyphDescriptor = {
  paths: ["M4 3v4a4 4 0 0 0 8 0V3M3 13h10"],
  filled: false,
  dashed: false,
};

const ITALIC_GLYPH: GlyphDescriptor = {
  paths: ["M7 3h5M4 13h5M10 3 6 13"],
  filled: false,
  dashed: false,
};

const CANCEL_GLYPH: GlyphDescriptor = {
  paths: ["M5 5 11 11M11 5 5 11"],
  filled: false,
  dashed: false,
};

type InlineEmphasisCommitTextFieldProps = {
  readonly initialValue: string;
  readonly initialEmphasis: TextEmphasis | null;
  readonly surface?: string;
  readonly actionStacking: number;
  readonly validationStacking: number;
  readonly validate: (draft: string) => readonly string[];
  readonly onCommit: (value: string, emphasis: TextEmphasis | null) => void;
  readonly onDiscard: (messages: readonly string[]) => void;
  readonly onCancel: () => void;
};

export default function InlineEmphasisCommitTextField({
  initialValue,
  initialEmphasis,
  validate,
  actionStacking,
  validationStacking,
  surface,
  onCommit,
  onDiscard,
  onCancel,
}: InlineEmphasisCommitTextFieldProps): ReactElement {
  const [emphasis, setEmphasis] = useState<TextEmphasis | null>(initialEmphasis);
  const lifecycle = useCommitLifecycle({
    initialValue: toSingleLine(initialValue),
    validate,
    onCommit: (draft) => onCommit(draft, emphasis),
    onDiscard,
    onCancel,
    onReset: () => setEmphasis(initialEmphasis),
  });
  const actionStyle = { zIndex: actionStacking } satisfies CSSProperties;

  useEffect(() => {
    setEmphasis(initialEmphasis);
  }, [initialEmphasis, initialValue]);

  return (
    <div
      className={`${styles.editor} ${emphasis === "underline" ? styles.underlined : ""} ${emphasis === "italic" ? styles.italic : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div
        className={styles.toolbar}
        style={actionStyle}
        onMouseDown={(event) => event.preventDefault()}
      >
        <InlineToggleButton
          glyph={UNDERLINE_GLYPH}
          label="Underline"
          pressed={emphasis === "underline"}
          surface={surface}
          onClick={() => setEmphasis((value) => (value === "underline" ? null : "underline"))}
        />
        <InlineToggleButton
          glyph={ITALIC_GLYPH}
          label="Italic"
          pressed={emphasis === "italic"}
          surface={surface}
          onClick={() => setEmphasis((value) => (value === "italic" ? null : "italic"))}
        />
      </div>
      <InlineTextArea
        value={lifecycle.draft}
        rows={toLineCount(lifecycle.draft)}
        treatment="row"
        invalid={lifecycle.messages.length > 0}
        hasEndAction
        onChange={(value) => lifecycle.onDraftChange(toSingleLine(value))}
        onBlur={lifecycle.onBlur}
        onKeyDown={lifecycle.onKeyDown}
      />
      <span className={styles.cancelAction} style={actionStyle}>
        <InlineActionButton
          glyph={CANCEL_GLYPH}
          label="Cancel editing"
          treatment="cancel"
          surface={surface}
          surfaceTone="base"
          onClick={lifecycle.onCancel}
        />
      </span>
      {lifecycle.messages.length > 0 ? (
        <InlineValidationPopup
          messages={lifecycle.messages}
          stacking={validationStacking}
          onDismiss={lifecycle.onPopupDismiss}
        />
      ) : null}
    </div>
  );
}

function toLineCount(value: string): number {
  return Math.max(1, value.split("\n").length);
}

function toSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}
