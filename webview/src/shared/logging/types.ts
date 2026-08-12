/**
 * @fileoverview Structured development-session log entry contracts shared across webview layers.
 */

export type LogValue = string | number | boolean | null;

export type ActionLogEntry = {
  readonly kind: "action";
  readonly name: string;
  readonly target: string;
  readonly values: Readonly<Record<string, LogValue>>;
};

export type DispatchLogEntry = {
  readonly kind: "dispatch";
  readonly commands: readonly object[];
};

export type EditSummary = {
  readonly kind: "insert" | "delete" | "replace";
  readonly startLine: number;
  readonly endLine: number;
};

export type EditsLogEntry = {
  readonly kind: "edits";
  readonly count: number;
  readonly edits: readonly EditSummary[];
};

export type FailureLogEntry = {
  readonly kind: "failure";
  readonly stage: "parse" | "problem-view" | "pipeline";
  readonly message: string;
};

export type WebviewLogEntry = ActionLogEntry | DispatchLogEntry | EditsLogEntry | FailureLogEntry;
