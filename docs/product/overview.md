# Shiny — product overview

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-19  
> **Scope:** High-level description of product features and mechanics: what Shiny is, the gap it closes, its key journeys, design choices, principles  

## Summary

Shiny is a software diagramming tool for AI-human co-creation around source-controlled diagrams. It is two things:

- **An annotation syntax** — a Mermaid-compatible way of storing persistent visual layout and style as comments alongside a diagram's semantic content.
- **A live editor** — a visual surface, synchronized with that source, where a user and an AI collaborate on the same diagram.

The durable artifact is the `.mmd` source file. The visual editor is a projection and manipulation surface over that file.

## Product context

**Current diagramming tools leave a gap** between visual editing and source-based automation:

- **Human-first visual editors** (Excalidraw, whiteboarding tools) — expressive and tactile, but the resulting artifact is difficult for AI to modify structurally and difficult to review meaningfully in version control.
- **Diagram-as-code tools** (Mermaid) — AI-friendly and version-control-friendly, but do not support visual editing and do not preserve layout.
- **AI-generated images** — not reliably editable; only through prompting with unstable outcomes.

**Shiny closes the gap**:

- defines annotation syntax as comments for persistent visual metadata in Mermaid source, so the file stays valid Mermaid.
- visual editor in VS Code synchronized with Mermaid source, which remains the single source of truth.
- a standard Mermaid renderer ignores Shiny annotations and still renders the diagram correctly — Shiny extends Mermaid as a compatible authoring convention, not a fork.

**Thus Shiny enables a smooth AI-human co-creation loop**:

1. AI generates or edits Mermaid source.
2. Shiny renders it visually inside VS Code.
3. The user moves, resizes, and edits visual objects.
4. Shiny writes visual changes back into Mermaid-compatible comments.
5. AI sees the same source file — including visual annotations — and can continue editing without losing the user's visual intent.

## Source language

Shiny reads and writes one source language: Mermaid class diagrams plus the Shiny annotation dialect — Mermaid comment lines (`%% @spatial:`, `%% @style:`, `%% @note:`) that carry layout and style metadata. The base diagram remains standard Mermaid; Shiny annotations are invisible to any standard Mermaid renderer.

The language is defined in [Source grammar](./source-grammar.md): its terms, its statements and their composition, and its boundary (invalid language and how Shiny handles it).

## Editor interface

The Shiny webview is the visual editing surface inside VS Code: one persistent app shell with two views — Autorender (a read-only standard Mermaid rendering) and Editor (the manipulation surface: canvas with class boxes, edges, notes, and namespaces; a tool pane; an edit pane for the selected element).

Everything a user does visually lands in the source as a precise text edit. For example, a user can:

- drag a class box to a new position, or resize it;
- rename a class inline — every reference in the source is rewritten;
- add, edit, or delete class members;
- retarget a relationship by dragging its endpoint onto another class;
- move a class into or out of a namespace by dragging it across the boundary;
- restyle a class or a namespace — fill, stroke, text color — from the edit pane;
- place free or attached notes and move them around.

The interface is defined in [Editor interface](./editor-interface.md): every element on the surface, the actions it supports, and its address for programmatic access (debugging scenarios).

## Key journeys

### 1. Open a diagram

- user runs `Shiny: Open Diagram` command or clicks the Shiny icon on a `.mmd` editor pane
- Shiny opens the webview beside the source editor
- source is parsed; if fully annotated, Editor view renders immediately
- if any class is missing a `@spatial`, the canvas shows the missing class list and offers Generate

### 2 Edit visually

- user drags or resizes a class box, namespace, free note, or relationship endpoint
- Shiny writes the updated source immediately on drop
- outcomes:
  - visual layout persists after reopening
  - Git diff shows layout changes as text
  - AI can see and preserve user layout
  - webview stays in sync — Shiny-originated edits skip the debounce; after VS Code accepts the edit, the host immediately sends a fresh source snapshot and the webview reruns the complete read pipeline

### 3 Edit source manually

- user edits `.mmd` source directly in VS Code
- Shiny detects the change, holds the current canvas visible, and waits for a short debounce delay
- after the delay, Shiny re-parses source and refreshes the active view
- outcome: source editing is smooth; incomplete typing does not cause unstable visual updates

### 4 AI edits source

- AI modifies the `.mmd` file
- Shiny treats it identically to a manual source edit — debounce, re-parse, re-render
- existing annotated layout is preserved where possible
- if AI adds a new class without `@spatial`, it appears in the missing class list; Generate resolves it
- if AI adds a note without a preceding `@note:` annotation, it is placed by default and Generate writes the annotation; existing notes are unaffected — adjacency binding means no renumbering or rebinding ever occurs
- outcome: AI can modify diagram semantics without destroying manual visual layout

### 5 Review in Git

- semantic changes: modified classes, relationships, labels, fields, methods, notes, namespaces
- style changes: modified `classDef`, `:::StyleName`, or namespace `@style` lines
- layout changes: modified `@spatial` or `@note:` coordinates
- outcome: reviewers can distinguish semantic, styling, and layout-only changes at a glance

### 6 Handle invalid input

- unsupported Mermaid syntax: Shiny preserves source and does not overwrite the file
- Mermaid rendering failure: Autorender view shows the error
- malformed or orphaned annotations: preserved in source, surfaced as diagnostics, not silently deleted
- outcome: Shiny degrades safely; no destructive rewrites

## Other design choices

- **Class identity vs display label:** Class ID is the Mermaid class name used by relationships, notes, styles, and spatial annotations. Editing the primary class-box name or the edit pane's Name field renames the class ID and rewrites relationship endpoints, direct-style targets, spatial annotations, style applications, and colon-style member owners. Attached-note targets are not rewritten. The separate Label field changes only the optional display label.
- **Namespace membership is source-backed and can be changed by containment drag:** Dragging a class fully outside a namespace boundary removes it from that namespace. Dragging a class inside a namespace boundary (even partially) adds it to that namespace.
- **Namespace geometry is derived:** Namespaces never have position annotations. Moving a namespace moves its member classes; then namespace geometry is re-derived from member positions.
- **Manual layout wins in Editor:** In Editor mode, `@spatial` controls layout. Mermaid `direction` remains source semantics for Autorender and a layout hint for Generate, but it does not override existing manual spatial annotations.
- **Preserve-first Mermaid coverage:** Shiny parses and preserves Mermaid class diagram syntax it does not fully visually edit yet, including arbitrary stereotypes, class labels, generic classes, colon member syntax, style variants, `classDef default`, `cssClass`, click actions, config directives, two-way relations, lollipop interfaces, and nested namespaces.

## Product principles

- **Source-first** — the `.mmd` file is the durable artifact
- **Mermaid-compatible** — Shiny files remain valid Mermaid files
- **Layout and style separate from semantics** — Mermaid owns meaning and native styling; Shiny owns persistent layout metadata and namespace style extensions
- **Human and AI symmetry** — humans edit visually; AI edits text; both work on the same artifact
- **Safe degradation** — unsupported syntax and malformed annotations never cause destructive rewrites
- **Version-control readability** — Git diffs reveal whether a change is semantic, stylistic, or spatial
