import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

type CommitLifecycleOptions = {
  readonly initialValue: string;
  readonly validate?: (draft: string) => readonly string[];
  readonly enterCommits?: boolean;
  readonly onCommit: (draft: string) => void;
  readonly onDraftChange?: (draft: string) => void;
  readonly onDiscard?: (messages: readonly string[]) => void;
  readonly onCancel: () => void;
  readonly onReset?: () => void;
};

type CommitLifecycle = {
  readonly draft: string;
  readonly messages: readonly string[];
  readonly onDraftChange: (draft: string) => void;
  readonly onCommitAttempt: () => void;
  readonly onBlur: () => void;
  readonly onCancel: () => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onPopupDismiss: () => void;
};

export function useCommitLifecycle({
  initialValue,
  validate = noValidation,
  enterCommits = true,
  onCommit,
  onDraftChange,
  onDiscard,
  onCancel,
  onReset,
}: CommitLifecycleOptions): CommitLifecycle {
  const [draft, setDraft] = useState(initialValue);
  const [messages, setMessages] = useState<readonly string[]>([]);

  useEffect(() => {
    setDraft(initialValue);
    setMessages([]);
  }, [initialValue]);

  function handleDraftChange(nextDraft: string): void {
    setDraft(nextDraft);
    setMessages([]);
    onDraftChange?.(nextDraft);
  }

  function handleCommitAttempt(): void {
    const nextMessages = validate(draft);
    if (nextMessages.length > 0) {
      setMessages(nextMessages);
      return;
    }
    setMessages([]);
    onCommit(draft);
  }

  function handleBlur(): void {
    const nextMessages = validate(draft);
    if (nextMessages.length === 0) {
      setMessages([]);
      onCommit(draft);
      return;
    }
    setDraft(initialValue);
    setMessages([]);
    onReset?.();
    onDiscard?.(nextMessages);
  }

  function handleCancel(): void {
    setDraft(initialValue);
    setMessages([]);
    onReset?.();
    onCancel();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === "Enter" && enterCommits) {
      event.preventDefault();
      handleCommitAttempt();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    }
  }

  return {
    draft,
    messages,
    onDraftChange: handleDraftChange,
    onCommitAttempt: handleCommitAttempt,
    onBlur: handleBlur,
    onCancel: handleCancel,
    onKeyDown: handleKeyDown,
    onPopupDismiss: () => setMessages([]),
  };
}

function noValidation(): readonly string[] {
  return [];
}
