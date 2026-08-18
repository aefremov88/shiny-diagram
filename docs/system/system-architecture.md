# System Architecture

> **Implementation state:** Current
> **Document state:** Current
> **Last reviewed:** 2026-07-04
> **Scope:** Runtime invariants, subsystem topology, and the read/write dataflows — at a glance, with links to code.

This document records the **invariants and shape** of the system: the constraints that are spread across many files and can't be recovered by reading any one of them. It deliberately does **not** transcribe types, signatures, or per-handler behavior — those live in the code and its `@fileoverview` headers. Structural rules are in [Architectural Standards](./architectural-standards.md); the write path is detailed in [Write-Back Pipeline](./write-back-pipeline.md).

## 1. Invariants

- The `.mmd` document is the durable source of truth.
- The Extension Host is the sole document writer.
- The rendered diagram is a projection of source, not a second persisted model.
- Manual, AI-authored, and visual changes all flow through the same source-interpretation path.
- Visual edits are atomic, canonical range-replacement `SourceEdit[]` transactions.
- Every accepted source change produces a fresh authoritative snapshot and reruns the complete read pipeline; nothing incremental persists across snapshots.
- Write intents are translated and resolved against one frozen snapshot — they never observe each other's output. A whole-statement rewrite is delete + insert, resolved atomically.
- Transient View state is not persisted unless it becomes explicit product data.

## 2. Topology

Two isolated runtimes, communicating only through a validated message protocol:

```text
VS Code ── Extension Host ──(protocol)── Webview
             (sole writer,              (React app)
              owns .mmd)
```

Webview layers (dependencies point downward only):

```text
Bridge → Shell → { mermaidRenderer | Controller → View }
shared = dependency-free foundation
```

- **Extension Host** (`extension-host/`) — owns the `.mmd` document, applies edits, emits source snapshots. It builds one `vscode.WorkspaceEdit` per transaction and applies it atomically against the current document.
- **Bridge / Shell** (`webview/src/Bridge`, `Shell`) — transport, protocol adapters, and product-level Mermaid/Shiny mode selection.
- **Controller** (`webview/src/Controller`) — the functional core: interprets source, derives the view model, and turns editor commands into edits.
- **View** (`webview/src/View`) — React editor UI; emits semantic editor-command transactions, never touches source.

Layer ownership and the full import matrix are normative in [Architectural Standards §4](./architectural-standards.md#4-webview-layered-architecture).

## 3. Read dataflow (source → pixels)

```text
sourceText
  → parseDiagram            → { DiagramGraph, ProvenanceIndex }
  → deriveViews             → view model (spatial-aware element views)
  → View / React Flow       → rendered diagram
```

- **`parseDiagram`** (`Controller/parse/`) produces two structures from one parse: **`DiagramGraph`** (semantic — what exists and how it relates) and **`ProvenanceIndex`** (syntactic — where each written statement is, as `SourceSpan`s). A statement absent from provenance is implicit and not editable in place.
- **`deriveViews`** (`Controller/deriveViews/`) projects the graph into the read-only render schema the View consumes. Raw `sourceText` does not cross into View.

## 4. Write dataflow (command → edit)

```text
EditorCommand transaction
  → translate  (graph, provenance[, sourceText])  → WriteIntent[]
  → resolve    (provenance, sourceText)            → SourceEdit[]
  → Bridge → Extension Host → WorkspaceEdit → new snapshot → (read dataflow)
```

- **translate** (`Controller/translate/`) turns semantic commands into logical `WriteIntent`s — operations plus references into parsed provenance areas. It owns Mermaid *content* (payloads are normalized, relative-indented, no EOL).
- **resolve** (`Controller/resolve/`) turns intents into concrete `SourceEdit`s — resolving references to positions, deriving indentation/EOL/separators, coalescing co-located insertions, and asserting non-overlap. It owns *presentation*.
- The intent vocabulary, anchor providers, and per-kind workers are documented in [Write-Back Pipeline](./write-back-pipeline.md).

## 5. Coordinate primitives

All positions are zero-based; spans are half-open (end exclusive). `SourcePosition`, `SourceSpan`, and `SourceEdit` are defined in `Controller/model/sourceEdit.ts`; the wire edit payload is defined independently at each protocol boundary and kept structurally synchronized ([Architectural Standards §3.2](./architectural-standards.md#32-protocol-boundary)).

---

*For anything below this altitude — exact types, command shapes, handler/worker behavior — read the code or the linked pipeline doc. If a fact here can be recovered by opening the file it describes, it does not belong in this document.*
