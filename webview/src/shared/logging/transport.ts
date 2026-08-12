/**
 * @fileoverview Holds the Bridge-provided transport for structured webview log entries.
 */

import type { WebviewLogEntry } from "./types";

type LogTransport = (entry: WebviewLogEntry) => void;

let transport: LogTransport = () => {};

/** Installs the transport used by all structured logging functions. */
export function setLogTransport(nextTransport: LogTransport): void {
  transport = nextTransport;
}

/** Sends one structured entry through the installed Bridge transport. */
export function postLogEntry(entry: WebviewLogEntry): void {
  transport(entry);
}
