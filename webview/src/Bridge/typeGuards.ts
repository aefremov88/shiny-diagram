/**
 * @fileoverview Runtime guards for host messages entering the webview.
 */

import type { HostToWebviewMessage } from "./protocol";

/**
 * Narrows unknown postMessage payloads to host-to-webview messages.
 */
export function isHostMessage(data: unknown): data is HostToWebviewMessage {
  if (typeof data !== "object" || data === null || !("type" in data)) return false;
  if ((data as { type: unknown }).type === "exportPngRequest") return true;
  return (
    (data as { type: unknown }).type === "sourceUpdate" &&
    "sourceText" in data &&
    typeof data.sourceText === "string" &&
    "documentName" in data &&
    typeof data.documentName === "string"
  );
}
