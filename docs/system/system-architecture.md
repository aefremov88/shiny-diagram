# System Architecture

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Implemented  
> **Last reviewed:** 2026-08-19  
> **Scope:** Concrete system topology, ownership, invariants, and read/write dataflows  

This document records **what the Shiny system is**: its runtimes, layers, major components, ownership boundaries, and data loops. It deliberately does **not** prescribe how architectural units should generally be structured or enforced — those rules live in [Architectural Standards](https://chatgpt.com/g/g-p-6a8241d01c088191b7ab2fe56fc2ce8b/c/architectural-standards.md).

## 1. System invariants

- The `.mmd` document is the durable source of truth.
- The Extension Host is the sole document writer.
- The rendered diagram is a projection of source, not a second persisted model.
- Manual, AI-authored, and visual changes all flow through the same source-interpretation path.
- Visual edits are atomic, canonical range-replacement `SourceEdit[]` transactions.
- Every accepted source change produces a fresh authoritative snapshot and reruns the complete read pipeline; nothing incremental persists across snapshots.
- Write intents are translated and resolved against one frozen snapshot — they never observe each other's output. A whole-statement rewrite is delete + insert, resolved atomically.
- Transient View state is not persisted unless it becomes explicit product data.

## 2. System topology

### 2.1 Runtime boundary

Shiny runs across two isolated runtimes:

```text
VS Code
  │
  ▼
Extension Host
  │
  │ validated message protocol
  ▼
Webview
```

#### Extension Host

The **Extension Host** (`extension-host/`) owns the `.mmd` document, applies source edits, and emits authoritative source snapshots.

For a visual edit, it converts a validated protocol payload into one `vscode.WorkspaceEdit` and applies the transaction atomically to the current document.

##### Boundary

The Extension Host receives and emits only protocol-owned wire data across the Webview boundary.

It does not interpret Shiny editor commands or derive application semantics from source-edit payloads.

The protocol contract is declared locally in:

```text
extension-host/protocol.ts
```

#### Webview

The **Webview** (`webview/src/`) owns rendering, editor interaction, source interpretation, and construction of source edits.

##### Boundary

The Webview receives authoritative source snapshots from the Extension Host and sends source-edit transactions back through the protocol.

The Webview protocol contract is declared independently in:

```text
webview/src/Bridge/protocol.ts
```

The two protocol modules intentionally duplicate the same JSON-compatible wire vocabulary. Each runtime validates and adapts protocol data at its own boundary; application contracts are not shared across runtimes.

### 2.2 Webview layers

The Webview has the following dependency topology:

```text
Bridge
  ↓
Shell ─────────────────────────→ ui/chrome
  ├── mermaidRenderer
  └── Controller
        ↓
      View ────────────────────→ ui/chrome, ui/canvas

ui/{core,chrome,canvas} → shared
shared = dependency-free Webview foundation
```

- **Bridge** (`webview/src/Bridge/`) owns communication with the Extension Host and adaptation between protocol and Webview contracts.
- **Shell** (`webview/src/Shell/`) owns product-level mode selection and mounts either standard Mermaid rendering or the Shiny editor branch.
- **mermaidRenderer** (`webview/src/mermaidRenderer/`) owns standard Mermaid rendering.
- **Controller** (`webview/src/Controller/`) interprets source, derives the View model, and translates editor commands into source edits.
- **View** (`webview/src/View/`) owns the React editor UI, transient interaction state, and source-agnostic interaction and layout decisions.
- **ui** (`webview/src/ui/`) is the editor-blind UI library. Shell consumes `ui/chrome`; View consumes `ui/chrome` and `ui/canvas`; `ui/core` is internal library machinery.
- **shared** (`webview/src/shared/`) contains foundational vocabulary whose semantics cross Webview layers.

Dependency direction expresses **static knowledge**, not runtime call direction. Runtime control may return upward through callbacks without creating a reverse dependency.

#### 2.2.1 Controller

`ShinyController` is the Controller composition root:

```text
                 ┌── parse
ShinyController ─┼── deriveViews
                 └── commands
```

- **parse** interprets a source snapshot into the source-derived model and provenance.
- **deriveViews** projects that model into the read-only schema consumed by View.
- **commands** translates View command transactions into `SourceEdit[]`.
- **Controller/model** contains source-derived vocabulary shared across Controller components.

`ShinyController` owns sequencing between these components. The components do not call one another directly; their outputs meet through the composition root and shared model contracts.

The command path has two internal stages:

```text
EditorCommandTransaction
  → translate
  → WriteIntent[]
  → resolve
  → SourceEdit[]
```

##### Boundary

Controller receives authoritative `sourceText` snapshots and semantic `EditorCommandTransaction` values.

Controller exposes:

- the read-only View model consumed by View;
- `SourceEdit[]` transactions consumed by Bridge.

Controller owns:

- Mermaid parsing and source-derived semantics;
- source provenance;
- generation of new source identities and source names;
- translation of editor intent into source edits.

Raw source does not cross from Controller into View.

Controller does not own editor interaction state or source-agnostic layout choices made by the View.

#### 2.2.2 View

The View layer exposes four system-level areas:

```text
View/
├── EditorRoot/
├── commands/
├── state/
└── views/
```

- **EditorRoot** owns the Shiny React editor tree and exposes `EditorView`, the View runtime entry point.
- **commands** defines the View-to-Controller command vocabulary: `EditorCommand`, `EditorCommandTransaction`, and `EditorDispatch`.
- **state** contains shared transient editor-state shapes used within the View tree.
- **views** defines the centralized read-only render schema through which Controller supplies data to View.

The two semantic flows across the View boundary run in opposite runtime directions:

```text
Controller ── EditorViewModel ──→ View
Controller ←─ EditorCommandTransaction ── View
```

##### Boundary

View receives a read-only `EditorViewModel`.

View emits semantic `EditorCommandTransaction` values.

View owns:

- rendering and editor interaction;
- transient View state;
- layout choices available from interaction and render context.

View may reference existing source-derived identities supplied by Controller, but it does not invent identities for newly created source entities.

View does not:

- receive raw source text;
- parse Mermaid;
- construct `WriteIntent`s or `SourceEdit`s.

## 3. Read dataflow — source to pixels

Every authoritative source snapshot runs through the complete read path:

```text
sourceText
  → parseDiagram
  → { DiagramGraph, ProvenanceIndex }
  → deriveViews
  → EditorViewModel
  → View / React Flow
  → rendered diagram
```

### 3.1 Parse

`Controller/parse/` interprets the source snapshot and produces two structures from one parse:

- **`DiagramGraph`** — semantic representation of what exists and how entities relate.
- **`ProvenanceIndex`** — syntactic representation of where written source statements live, expressed as `SourceSpan`s.

A statement absent from provenance is implicit and therefore cannot be edited in place.

### 3.2 Derive Views

`Controller/deriveViews/` projects the parsed model into the spatially aware, read-only render schema defined by `View/views`.

The resulting `EditorViewModel` is supplied to View.

Raw `sourceText` does not cross this boundary.

## 4. Write dataflow — interaction to source

A source-affecting View interaction runs through the following loop:

```text
View interaction
  → EditorCommandTransaction
  → Controller commands
      → translate
      → WriteIntent[]
      → resolve
      → SourceEdit[]
  → Extension Bridge
  → protocol edit payload
  → Extension Host
  → WorkspaceEdit
  → .mmd document
  → new source snapshot
  → read dataflow
```

### 4.1 Editor commands

View describes **editor intent**, not Mermaid syntax or source ranges.

One user/editor action is represented by one `EditorCommandTransaction`, which may contain several primitive `EditorCommand` values.

View supplies facts it owns, such as positions and sizes chosen through interaction.

Controller supplies source-specific facts, including source syntax and identities for newly created source entities.

### 4.2 Translate

Translation turns semantic editor commands into logical `WriteIntent[]`.

A `WriteIntent` describes an intended source operation using references into parsed provenance rather than concrete source positions.

Translation owns Mermaid **content**:

- normalized payload text;
- relative indentation;
- no concrete source position;
- no document EOL.

All intents in a transaction are derived from the same frozen source snapshot.

### 4.3 Resolve

Resolution turns `WriteIntent[]` into concrete `SourceEdit[]`.

It owns source **placement and presentation**:

- resolving provenance references to concrete source positions;
- deriving indentation, EOL, and separators;
- coalescing co-located insertions;
- asserting that final edit ranges do not overlap.

All intents in one transaction are resolved against the same frozen source snapshot and therefore never observe one another's output.

### 4.4 Extension Bridge

Extension Bridge converts Controller-owned `SourceEdit[]` values into the independently declared protocol representation.

It adapts between application and wire contracts without adding editor semantics.

### 4.5 Extension Host application

The Extension Host validates the incoming wire payload, converts it into one `vscode.WorkspaceEdit`, and applies the transaction atomically to the current `.mmd` document.

The resulting document becomes authoritative.

VS Code then produces a new source snapshot, which re-enters the complete read dataflow.

The detailed intent vocabulary, resolution rules, anchor providers, and individual write-back operations are documented in [Write-Back Pipeline](https://chatgpt.com/g/g-p-6a8241d01c088191b7ab2fe56fc2ce8b/c/layers/write-back-pipeline.md).

------

*For anything below this altitude — exact types, command variants, component internals, worker behavior, or import allowlists — read the relevant subsystem document or the code. Architectural Standards defines how architectural boundaries are structured; this document records which boundaries Shiny actually has.*
