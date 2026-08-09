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

export type WebviewToHostMessage =
  | ApplyEditsMessage
  | HistoryMessage
  | ExportPngMessage
  | ExportPngErrorMessage;
