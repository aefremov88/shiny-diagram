/**
 * @fileoverview Typed structured logging functions for the development-session log.
 */

import { postLogEntry } from "./transport";
import type { FailureLogEntry, LogValue } from "./types";

type LoggedSourceEdit = {
  readonly start: { readonly line: number; readonly character: number };
  readonly end: { readonly line: number; readonly character: number };
  readonly replacementText: string;
};

/** Logs one completed semantic user interaction. */
export function logAction(
  name: string,
  target: string,
  values: Readonly<Record<string, LogValue>> = {}
): void {
  postLogEntry({ kind: "action", name, target, values });
}

/** Logs one editor command transaction at its dispatcher. */
export function logDispatch(transaction: readonly object[]): void {
  postLogEntry({
    kind: "dispatch",
    commands: transaction,
  });
}

/** Logs the summary of one resolved source-edit transaction. */
export function logEdits(edits: readonly LoggedSourceEdit[]): void {
  postLogEntry({
    kind: "edits",
    count: edits.length,
    edits: edits.map((edit) => ({
      kind: toEditKind(edit),
      startLine: edit.start.line + 1,
      endLine: edit.end.line + 1,
    })),
  });
}

/** Logs a parse, problem-view, or caught pipeline failure. */
export function logFailure(stage: FailureLogEntry["stage"], message: string): void {
  postLogEntry({ kind: "failure", stage, message });
}

function toEditKind(edit: LoggedSourceEdit): "insert" | "delete" | "replace" {
  const hasRange = edit.start.line !== edit.end.line || edit.start.character !== edit.end.character;
  if (!hasRange) return "insert";
  return edit.replacementText.length === 0 ? "delete" : "replace";
}

export type {
  ActionLogEntry,
  DispatchLogEntry,
  EditsLogEntry,
  FailureLogEntry,
  LogValue,
  WebviewLogEntry,
} from "./types";
