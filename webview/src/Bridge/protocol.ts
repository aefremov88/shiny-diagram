/**
 * @fileoverview Message contracts exchanged between the Extension Bridge and host.
 */

export type SourceUpdateMessage = {
  readonly type: "sourceUpdate";
  readonly sourceText: string;
  readonly documentName: string;
};

export type ExportPngRequestMessage = {
  readonly type: "exportPngRequest";
};

export type HostToWebviewMessage = SourceUpdateMessage | ExportPngRequestMessage;

export type SourcePosition = {
  readonly line: number;
  readonly character: number;
};

export type SourceEdit = {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
  readonly replacementText: string;
};

export type ApplyEditsMessage = {
  readonly type: "applyEdits";
  readonly edits: readonly SourceEdit[];
};

export type HistoryMessage = {
  readonly type: "history.undo" | "history.redo";
};

export type ExportPngMessage = {
  readonly type: "exportPng";
  readonly requestId: number;
  readonly base64: string;
};

export type ExportPngErrorMessage = {
  readonly type: "exportPngError";
  readonly requestId: number;
  readonly stage: string;
  readonly message: string;
};

export type LogValue = string | number | boolean | null;

export type WebviewLogEntry =
  | {
      readonly kind: "action";
      readonly name: string;
      readonly target: string;
      readonly values: Readonly<Record<string, LogValue>>;
    }
  | {
      readonly kind: "dispatch";
      readonly commands: readonly object[];
    }
  | {
      readonly kind: "edits";
      readonly count: number;
      readonly edits: readonly {
        readonly kind: "insert" | "delete" | "replace";
        readonly startLine: number;
        readonly endLine: number;
      }[];
    }
  | {
      readonly kind: "failure";
      readonly stage: "parse" | "problem-view" | "pipeline";
      readonly message: string;
    };

export type LogMessage = {
  readonly type: "log";
  readonly entry: WebviewLogEntry;
};

export type WebviewToHostMessage =
  | ApplyEditsMessage
  | HistoryMessage
  | ExportPngMessage
  | ExportPngErrorMessage
  | LogMessage;
