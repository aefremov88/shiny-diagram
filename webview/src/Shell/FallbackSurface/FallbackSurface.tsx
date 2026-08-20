/**
 * @render Read-only source and formatted parse-error fallback surfaces.
 */

import { useEffect } from "react";
import type { ReactElement } from "react";
import type { DocumentStatus } from "../state";
import {
  SHINY_SUPPORTED_DIAGRAM_TYPES,
  toUnsupportedDiagramTypeMessage,
} from "../../shared/diagramTypes";
import styles from "./FallbackSurface.module.css";
import { logFailure } from "../../shared/logging";

type FallbackSurfaceProps = {
  readonly documentStatus: Exclude<DocumentStatus, { readonly status: "ready" }>;
};

export default function FallbackSurface({ documentStatus }: FallbackSurfaceProps): ReactElement {
  useEffect(() => {
    const detail =
      documentStatus.status === "invalidSyntax"
        ? (documentStatus.errors[0]?.message ?? "Invalid syntax")
        : documentStatus.status === "unsupportedDiagramType"
          ? documentStatus.diagramType
          : documentStatus.missingClassIds.join(",");
    logFailure("problem-view", `${documentStatus.status} ${detail}`);
  }, [documentStatus]);

  if (documentStatus.status === "unsupportedDiagramType") {
    return (
      <section
        className={styles.surface}
        aria-label="Unsupported diagram type"
        data-target-role="problem-list"
        data-target-name=""
      >
        <div className={styles.unsupportedPanel}>
          <p
            className={styles.unsupportedMessage}
            data-target-role="item"
            data-target-name={toUnsupportedDiagramTypeMessage(documentStatus.diagramType)}
          >
            {toUnsupportedDiagramTypeMessage(documentStatus.diagramType)}
          </p>
          <p className={styles.supportedHeading}>Shiny supports:</p>
          <ul className={styles.supportedList}>
            {SHINY_SUPPORTED_DIAGRAM_TYPES.map(({ declaration, label }) => (
              <li key={declaration}>{label}</li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (documentStatus.status === "missingAnnotations") {
    return (
      <section
        className={`${styles.surface} ${styles.missingSurface}`}
        aria-label="Classes without spatial annotations"
        data-target-role="missing-annotations"
        data-target-name=""
      >
        <div className={styles.missingPanel}>
          <h2 className={styles.missingHeading}>Classes without spatial annotations</h2>
          <ul className={styles.missingList}>
            {documentStatus.missingClassIds.map((classId) => (
              <li key={classId} data-target-role="item" data-target-name={classId}>
                {classId}
              </li>
            ))}
          </ul>
          <p className={styles.missingGuidance}>Generate places them on the canvas</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.surface}
      aria-label="Document parse errors"
      data-target-role="problem-list"
      data-target-name=""
    >
      <div className={styles.errorLog}>
        {documentStatus.errors.map((error, index) => (
          <article
            className={styles.errorEntry}
            key={`${error.line}:${index}`}
            data-target-role="item"
            data-target-name={error.message}
          >
            <div className={styles.errorLocation}>Line {error.line}</div>
            {error.fragment ? <code className={styles.errorFragment}>{error.fragment}</code> : null}
            <div className={styles.errorMessage}>{error.message}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
