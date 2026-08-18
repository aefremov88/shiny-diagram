# Shiny — specification

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-18  
> **Scope:** A vision of a product high-level mechanics and features  

## 1. Summary

Shiny is a software diagramming tool for AI-human co-creation around source-controlled diagrams. It is two things:

- **An annotation syntax** — a Mermaid-compatible way of storing persistent visual layout and style as comments alongside a diagram's semantic content.
- **A live editor** — a visual surface, synchronized with that source, where a user and an AI collaborate on the same diagram.

The durable artifact is the `.mmd` source file. The visual editor is a projection and manipulation surface over that file.

---

## 2. Product context

**Current diagramming tools leave a gap** between visual editing and source-based automation:

- **Human-first visual editors** (Excalidraw, whiteboarding tools) — expressive and tactile, but the resulting artifact is difficult for AI to modify structurally and difficult to review meaningfully in version control.
- **Diagram-as-code tools** (Mermaid) — AI-friendly and version-control-friendly, but do not support visual editing and do not preserve layout.
- **AI-generated images** — not reliably editable; only through prompting with unstable outcomes.

**Shiny closes the gap**:

- defines annotation syntax as comments for persistent visual metadata in Mermaid source, so file stays valid Mermaid.
- visual editor in VS Code synchronized with Mermaid source, which remains the single source of truth.
- a standard Mermaid renderer ignores Shiny annotations and still renders the diagram correctly — Shiny extends Mermaid as a compatible authoring convention, not a fork.

**Thus Shiny enables smooth AI-human co-creation loop**:

1. AI generates or edits Mermaid source.
2. Shiny renders it visually inside VS Code.
3. The user moves, resizes, and edits visual objects.
4. Shiny writes visual changes back into Mermaid-compatible comments.
5. AI sees the same source file — including visual annotations — and can continue editing without losing the user's visual intent.

---

## 3. Annotation syntax

Shiny uses Mermaid comment lines (`%% ...`) to store visual metadata. The base diagram remains standard Mermaid. Shiny annotations are invisible to any standard Mermaid renderer.

### 3.1 Example

```
classDiagram
direction TB

    namespace Messaging {
        class ConversationThread {
            +UUID id
            +List~TextMessage~ messages
            +addMessage(TextMessage message) void
        }

        class TextMessage {
            +UUID id
            +String content
            +DateTime timestamp
            +attachFile(FileAttachment attachment) void
        }
    }

    ConversationThread --> "*" TextMessage : contains
    note for ConversationThread "Persists all messages"

    %% @note: x=420 y=180 w=220 h=96
    note "External system boundary"

    %% Native style definitions
    classDef Rose stroke-width:1px,stroke-dasharray:none,stroke:#FF5978,fill:#FFDFE5,color:#8E2236
    classDef Pine stroke-width:1px,stroke-dasharray:none,stroke:#254336,fill:#27654A,color:#FFFFFF

    %% Native style applications
    class ConversationThread:::Rose
    class TextMessage:::Pine

    %% --- SHINY ANNOTATIONS ---
    %% @spatial:ConversationThread x=100 y=150 w=320 h=210
    %% @spatial:TextMessage x=500 y=150 w=300 h=250
    %% @style:Messaging fill=#E8F0FF stroke=#6699CC color=#003366 strokeWidth=1px strokeDasharray=none
```

### 3.2 Element identity

Shiny uses existing Mermaid IDs whenever Mermaid exposes a stable ID.

- **Class ID** — the Mermaid class name, e.g. `ConversationThread`.
- **Generic class ID** — the Mermaid base class name, e.g. `Repository` for `Repository~Entity~`.
- **Namespace ID** — the Mermaid namespace name; nested namespaces use the fully qualified name, e.g. `Backend.Services`.
- **Display label** — user-facing text, not an ID.
- **Elements without Mermaid IDs** — Shiny never assigns persisten IDs (written in source file). Anonymous elements are addressed by a **statement-bound** annotation placed on the line immediately above the Mermaid statement it describes.

An annotation is therefore either **identity-bound** (`@spatial:<identity>`, `@style:<identity>`) or **statement-bound** (`@note:`):

- a statement-bound annotation binds to the statement on the immediately following line; no blank lines or other statements may intervene
- at most one statement-bound annotation per statement
- a statement-bound annotation not followed by a statement of the matching kind is orphaned (diagnostic)
- statement-bound binding is reserved for anonymous statement kinds; anything nameable stays identity-bound

Example:

```
%% @note: x=420 y=180 w=220 h=96
note for ConversationThread "Persists all messages"
```

Binding by adjacency does not change Mermaid semantics; no identity is ever persisted in the file for anonymous elements.

### 3.3 Class box annotations

#### Format

```
%% @spatial:<ClassId> x=<n> y=<n> w=<n> h=<n>
```

#### Rules

- `@spatial` + class ID + key=value pairs on a single comment line
- required keys: `x`, `y`, `w`, `h` — all numeric, in canvas units
- styling of class boxes belongs to Mermaid-native `classDef`/`:::StyleName` — not to `@spatial`
- unknown keys are ignored (forward compatibility)
- annotations anywhere are valid but canonical placement is: grouped under `%% --- SHINY ANNOTATIONS ---` near the bottom of the file, close to native style declarations. Exception: statement-bound annotations (`@note:`) always sit on the line immediately above their statement and are never grouped

### 3.4 Namespace annotations

Unlike for class boxes, Mermaid does not support per-namespace styling natively — `@style` is a Shiny extension stored as a comment.

#### Format

```
%% @style:<NamespaceId> fill=<value> stroke=<value> color=<value> strokeWidth=<value> strokeDasharray=<value>
```

#### Rules

- `@style` + namespace ID + key=value pairs on a single comment line
- namespace ID is the Mermaid namespace name
- supported properties mirror Mermaid's `classDef` properties: `fill`, `stroke`, `color`, `strokeWidth`, `strokeDasharray`
- **no position annotation for namespaces** — the namespace box is always derived automatically as the bounding box of its member classes' spatial rectangles plus a fixed margin

### 3.5 Note annotations

Shiny supports Mermaid-native notes:

```
note "Free note"
note for ConversationThread "Attached note"
```

#### Positioned notes

Notes do not expose stable Mermaid IDs, so their placement uses the statement-bound `@note:` annotation (see 3.2) on the line immediately above the note statement.

```
%% @note: x=420 y=180 w=220 h=96
note "External system boundary"
```

Rules:

- `@note:` + key=value pairs on a single comment line, immediately above the note statement it positions
- required keys: `x`, `y`, `w`, `h` — all numeric, in canvas units (matching `@spatial`)
- the same payload applies to free and attached notes — attachment is semantic (`note for <ClassId>`) and never changes position; attach/detach rewrites the statement only
- Shiny writes, moves, and deletes the annotation and its note statement as a pair
- a note statement without an annotation (e.g. hand- or agent-added) enters the missing-annotation flow; existing notes are unaffected
- runtime note identity is session-scoped and derived from position at parse time; no note identity is ever persisted in the file

### 3.6 Annotation robustness

The parser handles all annotation states without destructive rewrites:

- **Missing class annotations** — if one or more classes lack a valid `@spatial`, the editor shows the affected class IDs and offers Generate to compute and write positions for them. The canvas does not render until all classes are positioned.
- **Missing note annotations** — a note without a preceding `@note:` is placed by default until Generate writes the annotation or the user moves it.
- **Malformed annotation** — the affected element is treated as missing; its source line is preserved and offered for replacement by Generate.
- **Unknown keys** — silently ignored.
- **Reordered or whitespace-varied annotations** — accepted without normalisation until Shiny writes them back.
- **Orphaned annotation** — an identity-bound annotation referencing a missing class or namespace, or a statement-bound annotation not immediately followed by a statement of the matching kind; preserved in source and surfaced as a diagnostic.
- **Duplicate annotations** for the same target — last annotation wins; a warning is surfaced. For statement-bound annotations, more than one annotation above the same statement is malformed; the nearest one wins and a warning is surfaced.

---

## 4. Live editor

The Shiny webview is the product's visual editing surface. It feels like a diagram editor embedded inside VS Code.

It has one persistent app shell and two mutually exclusive views.

### 4.1 App shell

```
┌─────────────────────────────────────────────────────────────┐
│  Shiny Diagram                                              │
│  [ Autorender | Editor ]  <status message>   [ Generate ]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         <active view>                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Title** — identifies the panel as Shiny
- **View toggle** — switches between Autorender and Editor
- **Status message** — shown when action is needed: invalid Mermaid syntax, missing annotations, malformed annotations, orphaned annotations, duplicated annotations
- **Generate** — computes missing spatial metadata and replaces malformed Shiny annotations where safe
- if state prevents rendering, the active view is replaced by the list of blocking problems

### 4.2 Autorender view

Displays standard Mermaid diagram using Mermaid renderer. An informational view — not a visual editing surface.

- Shiny annotations are ignored by the renderer because they are comments
- contains: Mermaid-rendered canvas, zoom/pan controls
- never modifies source

### 4.3 Editor view

The core product experience. Gives humans direct manipulation while preserving Mermaid source as the durable artifact.

```
┌──────────┬──────────────────────────────┬──────────┐
│          │                     (Legend) │          │
│   Tool   │           Canvas             │  Style   │
│   pane   │         (Diagram)            │  pane    │
│          │                              │          │
└──────────┴──────────────────────────────┴──────────┘
```

#### 4.3.1 Canvas

- renders one box per class and one edge per relationship, positioned from each class's `@spatial` annotation
- renders free and attached notes from their statement-bound `@note:` annotation; attached notes additionally render a dashed link to their class
- renders lollipop interfaces as relationship-like elements
- namespaces render as derived bounding boxes around their member classes, styled from `@style` annotation if present
- nested namespaces render recursively from member and descendant-member class positions
- user can pan, zoom, drag boxes, resize boxes, and click to select
- if any class is missing a `@spatial`, the canvas shows the list of affected classes until Generate resolves them
- legend is generated automatically from the types of classes present in diagram and styles defined for classes and namespaces

#### 4.3.1.a Class box

```
┌───────────────────────────────┐
│        <<Stereotype>>         │   ← optional
│         Display label         │   ← header
├───────────────────────────────┤
│ [+] fieldName: Type           │
│ [+] methodName(arg): Return   │   ← prefix dropdown + member text
│ [-] privateField: Type        │
└───────────────────────────────┘
```

Actions:

- **Move** — drag the box; on drop, Shiny writes the new `x`/`y` to its `@spatial` annotation
- **Resize** — drag a handle on the border to change `w`/`h`; writes back to `@spatial`
- **Select** — click to select; drives the edit pane; click empty canvas to deselect
- **Edit header** — edits the display label, not the Mermaid class ID
- **Edit member row** — edits the Mermaid member text
- **Change member prefix** — prefix dropdown writes the row's leading Mermaid marker: none, `+`, `-`, `#`, `~`, `$`, or `*`
- **Fit to content** — resizes the box to fit current content; writes back to `@spatial`

Rules:

- Shiny parses both block member syntax and colon member syntax
- invalid edited member rows stay in edit mode until corrected
- invalid or unusual member rows loaded from source are preserved and shown as raw text with a warning
- arbitrary stereotypes inside `<< >>` are preserved; common presets may be offered in UI

#### 4.3.1.b Namespace box

Rendered as a labeled border around its member classes.

Actions:

- **Move** — drag the namespace box; all member and descendant-member classes move by the same delta; each moved class's `@spatial` is updated
- **Select** — click border or label; drives the edit pane
- **Style** — fill, stroke, text color, stroke width, and dash pattern editable via edit pane; writes back to `@style` annotation

#### 4.3.1.c Note

Actions:

- **Create note** — writes a Mermaid `note` statement and its `@note:` annotation as a pair
- **Attach / detach** — rewrites the statement between `note "..."` and `note for <ClassId> "..."`; the `@note:` annotation and position are unchanged
- **Move note** — updates `x`/`y` in `@note:`
- **Resize note** — updates `w`/`h` in `@note:`
- **Edit text** — updates native Mermaid note text
- **Delete note** — removes the note statement and its `@note:` annotation as a pair

#### 4.3.1.d Relationship

Actions:

- **Create** — choose source class, target class, relationship type, optional source multiplicity, optional target multiplicity, and optional label
- **Select** — click connector or label; drives the edit pane
- **Reconnect** — drag endpoint to another class; updates relationship source or target
- **Change type** — updates Mermaid relationship syntax
- **Change multiplicity** — updates quoted multiplicity at the relevant endpoint
- **Edit label** — updates text after `:`
- **Delete** — removes relationship line from source

Rules:

- relationship type, source multiplicity, target multiplicity, and label are separate properties
- multiplicity is not part of the label
- lollipop interfaces use native Mermaid lollipop syntax and behave like relationships with one class endpoint and one interface-symbol endpoint
- manual edge routing is not persisted until Mermaid source syntax exists for it

#### 4.3.2 Tool pane

Palette of diagram elements for adding new content:

```
┌──────┬────────────────────────┐
│ [C]  │ Class                  │
│<<I>> │ Interface              │
│<<A>> │ Abstract class         │
│<<E>> │ Enumeration            │
├──────┼────────────────────────┤
│ [R]  │ Relationship           │ type selector
│ ()-- │ Lollipop interface     │
│ [N]  │ Note                   │ free or attached
├──────┼────────────────────────┤
│ [NS] │ Namespace              │
├──────┼────────────────────────┤
│ [L]  │ Add legend             │
└──────┴────────────────────────┘
```

Relationship type selector options:

- association
- inheritance
- composition
- aggregation
- dependency
- realization
- solid link
- dashed link

#### 4.3.3 Edit pane

Shows controls for the currently selected element. Empty when nothing is selected.

For a **class**:

- display label
- stereotype
- fill, stroke, text color, stroke width, stroke dash
- fit to content
- delete element

For a **namespace**:

- namespace label
- fill, stroke, text color, stroke width, stroke dash
- delete namespace block

For a **relationship**:

- relationship type
- source multiplicity
- target multiplicity
- label
- delete relationship

For a **note**:

- note text
- fit to content
- delete note

**Rules:**

- class style changes write to Mermaid-native `classDef`/`:::StyleName`
- namespace style changes write to `@style`
- spatial changes write to `@spatial`
- if a visual style edit targets a class sharing a `classDef` with other classes, Shiny creates or assigns a unique style instead of unexpectedly changing multiple classes

---

## 5. Key journeys

### 5.1 Open a diagram

- user runs `Shiny: Open Diagram` command or clicks the Shiny icon on a `.mmd` editor pane
- Shiny opens the webview beside the source editor
- source is parsed; if fully annotated, Editor view renders immediately
- if any class is missing a `@spatial`, the canvas shows the missing class list and offers Generate

### 5.2 Edit visually

- user drags or resizes a class box, namespace, free note, or relationship endpoint
- Shiny writes the updated source immediately on drop
- outcomes:
  - visual layout persists after reopening
  - Git diff shows layout changes as text
  - AI can see and preserve user layout
  - webview stays in sync — no re-render needed for Shiny-originated edits

### 5.3 Edit source manually

- user edits `.mmd` source directly in VS Code
- Shiny detects the change, holds the current canvas visible, and waits for a short debounce delay
- after the delay, Shiny re-parses source and refreshes the active view
- outcome: source editing is smooth; incomplete typing does not cause unstable visual updates

### 5.4 AI edits source

- AI modifies the `.mmd` file
- Shiny treats it identically to a manual source edit — debounce, re-parse, re-render
- existing annotated layout is preserved where possible
- if AI adds a new class without `@spatial`, it appears in the missing class list; Generate resolves it
- if AI adds a note without a preceding `@note:` annotation, it is placed by default and Generate writes the annotation; existing notes are unaffected — adjacency binding means no renumbering or rebinding ever occurs
- outcome: AI can modify diagram semantics without destroying manual visual layout

### 5.5 Review in Git

- semantic changes: modified classes, relationships, labels, fields, methods, notes, namespaces
- style changes: modified `classDef`, `:::StyleName`, or namespace `@style` lines
- layout changes: modified `@spatial` or `@note:` coordinates
- outcome: reviewers can distinguish semantic, styling, and layout-only changes at a glance

### 5.6 Handle invalid input

- unsupported Mermaid syntax: Shiny preserves source and does not overwrite the file
- Mermaid rendering failure: Autorender view shows the error
- malformed or orphaned annotations: preserved in source, surfaced as diagnostics, not silently deleted
- outcome: Shiny degrades safely; no destructive rewrites

---

## 6. Other design choices

- **Class identity vs display label:** Class ID is the Mermaid class name used by relationships, notes, styles, and spatial annotations. Header editing changes the display label. Renaming class IDs is out of scope for the default editor surface.
- **Namespace membership is source-backed and can be changed by containment drag**: Dragging a class fully outside a namespace boundary removes it from that namespace. Dragging a class inside a namespace boundary (even partially) adds it to that namespace.
- **Namespace geometry is derived:** Namespaces never have position annotations. Moving a namespace moves its member classes; then namespace geometry is re-derived from member positions.
- **Manual layout wins in Editor:** In Editor mode, `@spatial` controls layout. Mermaid `direction` remains source semantics for Autorender and a layout hint for Generate, but it does not override existing manual spatial annotations.
- **Preserve-first Mermaid coverage:** Shiny parses and preserves Mermaid class diagram syntax it does not fully visually edit yet, including arbitrary stereotypes, class labels, generic classes, colon member syntax, style variants, `classDef default`, `cssClass`, click actions, config directives, two-way relations, lollipop interfaces, and nested namespaces.
- **Legend is generated UI**: Legend is generated from diagram contents and styles. It is not a source-backed diagram element and has no Shiny annotation. Its position is fixed at a default corner of the canvas and is not user-configurable.

---

## 7. Product principles and boundaries

**Principles:**

- **Source-first** — the `.mmd` file is the durable artifact
- **Mermaid-compatible** — Shiny files remain valid Mermaid files
- **Layout and style separate from semantics** — Mermaid owns meaning and native styling; Shiny owns persistent layout metadata and namespace style extensions
- **Human and AI symmetry** — humans edit visually; AI edits text; both work on the same artifact
- **Safe degradation** — unsupported syntax and malformed annotations never cause destructive rewrites
- **Version-control readability** — Git diffs reveal whether a change is semantic, stylistic, or spatial

**Boundaries:**

- Shiny is not a Mermaid replacement
- Shiny is not a free-form drawing tool
- Shiny is not an image-generation tool
- Shiny is not a collaborative cloud whiteboard
