/**
 * @fileoverview Coordinates Shiny parsing, derivation, writeback, and View composition.
 */

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import type { ReactElement } from "react";
import { parseDiagram } from "./parse";
import { deriveDiagramView, deriveUnpositionedClassViews } from "./deriveViews";
import { resolveIntents } from "./resolve";
import { translateCommands, validateTransaction } from "./translate";
import type { DiagramGraph } from "./model/diagramGraph";
import type { ProvenanceIndex } from "./model/provenanceIndex";
import type { SourceEdit } from "./model/sourceEdit";
import type { EditorDiagnostic } from "./parse";
import { EditorView } from "../View/EditorRoot";
import type { EditorDispatch } from "../View/commands";
import type { DiagramView, EditorViewModel } from "../View/views";
import type { ExportPngResult } from "../shared/exportPng";

type ShinyControllerProps = {
  sourceText: string;
  onApplyEdits: (edits: SourceEdit[]) => void;
  onStatusChange: (status: ShinyDocumentStatus) => void;
  generateRequest: number;
  exportRequest: number;
  onExportComplete: (result: ExportPngResult) => void;
  visible: boolean;
};

export type ShinyDocumentStatus =
  | { readonly status: "ready" }
  | { readonly status: "missingAnnotations"; readonly missingClassIds: readonly string[] }
  | { readonly status: "unsupportedDiagramType"; readonly diagramType: string }
  | {
      readonly status: "invalidSyntax";
      readonly errors: readonly {
        readonly line: number;
        readonly fragment: string;
        readonly message: string;
      }[];
    };

type CommandExecutionInputs = {
  readonly context: NewCommandContext | null;
  readonly onApplyEdits: (edits: SourceEdit[]) => void;
};

type NewCommandContext = {
  readonly sourceText: string;
  readonly graph: DiagramGraph;
  readonly provenance: ProvenanceIndex;
};

/**
 * Provides parsed editor state and command dispatch to the Shiny editor.
 */
export default function ShinyController({
  sourceText,
  onApplyEdits,
  onStatusChange,
  generateRequest,
  exportRequest,
  onExportComplete,
  visible,
}: ShinyControllerProps): ReactElement {
  const parseResult = useMemo(() => parseDiagram(sourceText), [sourceText]);

  useLayoutEffect(() => {
    onStatusChange(toDocumentStatus(parseResult));
  }, [onStatusChange, parseResult]);

  const graph =
    parseResult.status === "ready" || parseResult.status === "missingAnnotations"
      ? parseResult.graph
      : null;
  const provenance =
    parseResult.status === "ready" || parseResult.status === "missingAnnotations"
      ? parseResult.provenance
      : null;

  const diagramView: DiagramView | null = useMemo(() => {
    if (!graph) return null;
    return deriveDiagramView(graph);
  }, [graph]);

  const editorViewModel: EditorViewModel = useMemo(() => {
    if (parseResult.status === "unsupportedDiagramType") {
      return {
        status: "unsupportedDiagramType",
        diagramType: parseResult.diagramType,
      };
    }
    if (parseResult.status === "invalidSyntax") {
      return {
        status: "invalidSyntax",
        errors:
          parseResult.diagnostics.length > 0
            ? parseResult.diagnostics.map((diagnostic) => diagnostic.message)
            : ["Invalid syntax"],
      };
    }

    const diagram = diagramView ?? {
      direction: null,
      classes: [],
      namespaces: [],
      relationships: [],
      notes: [],
      styles: [],
    };
    if (parseResult.status === "missingAnnotations") {
      return {
        status: "missingAnnotations",
        missingClasses: deriveUnpositionedClassViews(parseResult.graph),
        diagram,
      };
    }
    return { status: "ready", diagram };
  }, [parseResult, diagramView]);

  const commandExecutionInputs: CommandExecutionInputs = {
    context:
      graph && provenance
        ? {
            sourceText,
            graph,
            provenance,
          }
        : null,
    onApplyEdits,
  };
  const commandExecutionInputsRef = useRef<CommandExecutionInputs>(commandExecutionInputs);

  useLayoutEffect(() => {
    commandExecutionInputsRef.current = commandExecutionInputs;
  });

  const dispatch: EditorDispatch = useCallback((transaction) => {
    const { context, onApplyEdits: applyEdits } = commandExecutionInputsRef.current;
    if (!context)
      return { status: "rejected", errors: [{ message: "Invalid syntax", commandIndex: 0 }] };

    const errors = validateTransaction(transaction, context.graph);
    if (errors.length > 0) return { status: "rejected", errors };

    let translated: ReturnType<typeof translateCommands>;
    let edits: SourceEdit[];
    try {
      translated = translateCommands(
        transaction,
        context.graph,
        context.provenance,
        context.sourceText
      );
      edits = resolveIntents(translated.intents, context.provenance, context.sourceText);
    } catch (error) {
      return {
        status: "rejected",
        errors: [
          {
            message: error instanceof Error ? error.message : "Unable to translate transaction",
            commandIndex: 0,
          },
        ],
      };
    }
    if (edits.length > 0) {
      applyEdits(edits);
    }
    return { status: "committed", outcome: translated.outcome };
  }, []);

  commandExecutionInputsRef.current = commandExecutionInputs;

  return visible ? (
    <EditorView
      view={editorViewModel}
      onTransactionDispatch={dispatch}
      generateRequest={generateRequest}
      exportRequest={exportRequest}
      onExportComplete={onExportComplete}
    />
  ) : (
    <></>
  );
}

function toDocumentStatus(parseResult: ReturnType<typeof parseDiagram>): ShinyDocumentStatus {
  switch (parseResult.status) {
    case "unsupportedDiagramType":
      return {
        status: "unsupportedDiagramType",
        diagramType: parseResult.diagramType,
      };
    case "ready":
      return { status: "ready" };
    case "missingAnnotations":
      return {
        status: "missingAnnotations",
        missingClassIds: parseResult.missingIds,
      };
    case "invalidSyntax":
      return {
        status: "invalidSyntax",
        errors: parseResult.diagnostics.map(toSyntaxErrorDetail),
      };
  }
}

function toSyntaxErrorDetail(diagnostic: EditorDiagnostic): {
  readonly line: number;
  readonly fragment: string;
  readonly message: string;
} {
  return {
    line: diagnostic.line ?? 1,
    fragment: diagnostic.fragment ?? diagnostic.elementId ?? "",
    message: diagnostic.message,
  };
}
