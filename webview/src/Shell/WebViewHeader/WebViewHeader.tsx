/**
 * @render Compact document identity, status, history actions, and mode control header.
 */

import type { ReactElement } from "react";
import Button from "../../Ui/chrome/primitives/Button/Button";
import SegmentedControl from "../../Ui/chrome/primitives/SegmentedControl/SegmentedControl";
import StatusDot from "../../Ui/chrome/primitives/StatusDot/StatusDot";
import type { DocumentStatus, WebViewMode } from "../state";
import { redoGlyph, undoGlyph } from "./icons";
import styles from "./WebViewHeader.module.css";

type WebViewHeaderProps = {
  mode: WebViewMode;
  documentName: string;
  documentStatus: DocumentStatus;
  onModeChange: (mode: WebViewMode) => void;
  onHistory: (action: "undo" | "redo") => void;
  onGenerate: () => void;
  onExport: () => void;
  isExporting: boolean;
};

/**
 * Renders the product title and top-level Mermaid/Shiny mode control.
 */
export default function WebViewHeader({
  mode,
  documentName,
  documentStatus,
  onModeChange,
  onHistory,
  onGenerate,
  onExport,
  isExporting,
}: WebViewHeaderProps): ReactElement {
  // UI props derivation
  const status = toStatusDotProps(documentStatus);

  return (
    <header className={styles.header}>
      <div className={styles.leftGroup}>
        <h1 className={styles.title}>Shiny Diagram</h1>
        <span className={styles.documentStatus}>
          <StatusDot variant={status.variant} title={status.title} />
          {documentName ? <span className={styles.filename}>{documentName}</span> : null}
        </span>
        {documentStatus.status === "missingAnnotations" ? (
          <Button label="Generate" onClick={onGenerate} />
        ) : null}
        <Button
          label={isExporting ? "Exporting…" : "Export PNG"}
          disabled={mode !== "shiny" || documentStatus.status !== "ready" || isExporting}
          title={
            mode !== "shiny" || documentStatus.status !== "ready"
              ? "Export available when the diagram renders"
              : undefined
          }
          onClick={onExport}
        />
      </div>
      <div className={styles.rightGroup}>
        <div className={styles.historyGroup}>
          <Button
            icon={undoGlyph}
            ariaLabel="Undo"
            presentation="iconOnly"
            variant="ghost"
            onClick={() => onHistory("undo")}
          />
          <Button
            icon={redoGlyph}
            ariaLabel="Redo"
            presentation="iconOnly"
            variant="ghost"
            onClick={() => onHistory("redo")}
          />
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <SegmentedControl
          options={[
            { value: "shiny", label: "Shiny" },
            { value: "mermaid", label: "Mermaid" },
          ]}
          value={mode}
          onChange={onModeChange}
          ariaLabel="Diagram mode"
        />
      </div>
    </header>
  );
}

// Private helpers
type StatusDotProps = {
  readonly variant: "positive" | "attention" | "error";
  readonly title: string;
};

function toStatusDotProps(status: DocumentStatus): StatusDotProps {
  switch (status.status) {
    case "ready":
      return { variant: "positive", title: "Rendered" };
    case "missingAnnotations":
      return {
        variant: "attention",
        title: toMissingAnnotationsTitle(status.missingClassIds),
      };
    case "unsupportedDiagramType":
      return { variant: "attention", title: "Unsupported diagram type" };
    case "invalidSyntax":
      return { variant: "error", title: "Cannot parse document" };
  }
}

function toMissingAnnotationsTitle(missingClassIds: readonly string[]): string {
  const visibleIds = missingClassIds.slice(0, 5);
  const suffix = missingClassIds.length > visibleIds.length ? ", …" : "";
  const affected = visibleIds.length > 0 ? `: ${visibleIds.join(", ")}${suffix}` : "";
  return `Missing spatial annotations${affected}`;
}
