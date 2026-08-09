/**
 * @behavior Product mode and document-status state ownership.
 * @render Header and active document rendering branch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { SourceEdit } from "../Controller/model/sourceEdit";
import ShinyController from "../Controller/ShinyController";
import MermaidRenderer from "../mermaidRenderer/MermaidRenderer";
import FallbackSurface from "./FallbackSurface/FallbackSurface";
import WebViewHeader from "./WebViewHeader/WebViewHeader";
import {
  defaultDocumentStatus,
  defaultWebViewMode,
  type DocumentStatus,
  type WebViewMode,
} from "./state";
import styles from "./WebViewShell.module.css";
import type { ExportPngResult } from "../shared/exportPng";

type WebViewShellProps = {
  sourceText: string;
  documentName: string;
  onApplyEdits: (edits: SourceEdit[]) => void;
  onHistory: (action: "undo" | "redo") => void;
  onExportPng: (requestId: number, base64: string) => void;
  onExportPngError: (requestId: number, stage: string, message: string) => void;
  exportCommandRequest: number;
};

/**
 * Owns product-level mode selection and mounts the selected webview branch.
 */
export default function WebViewShell({
  sourceText,
  documentName,
  onApplyEdits,
  onHistory,
  onExportPng,
  onExportPngError,
  exportCommandRequest,
}: WebViewShellProps): ReactElement {
  // State creation: local product mode and document status
  const [mode, setMode] = useState<WebViewMode>(defaultWebViewMode);
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>(defaultDocumentStatus);
  const [generateRequest, setGenerateRequest] = useState(0);
  const [exportRequest, setExportRequest] = useState(0);
  const [isExporting, setExporting] = useState(false);
  const handledExportCommandRequest = useRef(exportCommandRequest);

  // Event handler props derivation
  const onStatusChange = useCallback((status: DocumentStatus) => {
    setDocumentStatus(status);
  }, []);
  const onGenerate = useCallback(() => {
    setGenerateRequest((request) => request + 1);
  }, []);
  const onExport = useCallback(() => {
    if (mode !== "shiny" || documentStatus.status !== "ready" || isExporting) return;
    setExporting(true);
    setExportRequest((request) => request + 1);
  }, [documentStatus.status, isExporting, mode]);
  const onExportComplete = useCallback(
    (result: ExportPngResult) => {
      setExporting(false);
      if (result.status === "success") {
        onExportPng(result.requestId, result.base64);
      } else {
        onExportPngError(result.requestId, result.stage, result.message);
      }
    },
    [onExportPng, onExportPngError]
  );

  useEffect(() => {
    if (exportCommandRequest <= handledExportCommandRequest.current) return;
    handledExportCommandRequest.current = exportCommandRequest;
    onExport();
  }, [exportCommandRequest, onExport]);

  // Child component routing
  const documentSurface =
    mode === "mermaid" && documentStatus.status !== "invalidSyntax" ? (
      <MermaidRenderer sourceText={sourceText} />
    ) : documentStatus.status !== "ready" ? (
      <FallbackSurface documentStatus={documentStatus} />
    ) : null;

  return (
    <main className={styles.shell}>
      <WebViewHeader
        mode={mode}
        documentName={documentName}
        documentStatus={documentStatus}
        onModeChange={setMode}
        onHistory={onHistory}
        onGenerate={onGenerate}
        onExport={onExport}
        isExporting={isExporting}
      />
      {documentSurface}
      <ShinyController
        sourceText={sourceText}
        onApplyEdits={onApplyEdits}
        onStatusChange={onStatusChange}
        generateRequest={generateRequest}
        exportRequest={exportRequest}
        onExportComplete={onExportComplete}
        visible={mode === "shiny" || documentStatus.status !== "ready"}
      />
    </main>
  );
}
