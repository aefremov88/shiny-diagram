# Editor interface

> **Kind:** Defining  
> **Document state:** Work-in-progress  
> **Implementation state:** Implemented  
> **Last reviewed:** 2026-08-19  
> **Scope:** The authoritative description of the editor interface: the component tree, each component's behavior, what its actions write to the source, and its address for programmatic access  

## Purpose

This document defines the editor interface. The implementation follows this document.

The interface is a tree of components. A parent relates to its children in one of two ways:

- **Composition** — the parent contains the child. A composition child may be optional or repeated.
- **Option** — the parent shows exactly one of the children; a condition chooses which.

Each interactive part carries an **address** — the way debugging scenarios refer to it. The grammar: root targets name top-level components (`classBox(name)`, `edge(from, to)`, `editPane()`); nested parts are methods on their root, shown as relative addresses (`.header()` means `classBox(name).header()`); names are what the source and screen show — class identifiers, rendered member text, visible control labels. `—` means the part is not addressable.

## Webview composition - top level

The root component: one persistent shell inside the VS Code panel. Root address: `shell()`.

Composition:

| Part           | Presence | Address |
| -------------- | -------- | ------- |
| Webview header | always   | —       |
| View slot      | always   | —       |

Options of the view slot:

| Component       | Condition                           |
| --------------- | ----------------------------------- |
| Problem list            | invalid syntax or unsupported diagram type |
| Missing-annotation list | one or more classes lack `@spatial`        |
| Mermaid view            | view toggle set to Mermaid and source can render |
| Shiny view              | view toggle set to Shiny and source can render   |

### Webview header

Composition:

| Part            | Presence                                 | Address               | Actions                                                      |
| --------------- | ---------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Title           | always                                   | —                     | none — identifies the panel as Shiny                         |
| View toggle     | always                                      | `.viewToggle(view)` — view: `"Shiny" | "Mermaid"` | **click:** switches between the Shiny editor and Mermaid rendering |
| Status dot      | always; addressable while action is needed | `.status()`                                    | none — its tooltip reports missing spatial annotations, unsupported diagram type, or invalid Mermaid syntax |
| Generate button | optional — shown for missing annotations   | `.button("Generate")`                         | **click:** computes missing spatial metadata + writes the annotation statements |
| Export button   | always; disabled outside a ready Shiny view | `.button(label)` — `"Export PNG"` or `"Exporting…"` | **click:** exports the rendered diagram as PNG |
| History buttons | always                                      | `.button("Undo")` / `.button("Redo")`       | **click:** requests the corresponding editor history action |

### View slot/Problem list

Replaces the active view with the list of blocking problems.

Root address: `problemList()`.

Composition:

| Part         | Presence                 | Address                          | Actions                   |
| ------------ | ------------------------ | -------------------------------- | ------------------------- |
| Problem item | one per blocking problem | `.item(message)` — the rendered error or unsupported-type message, excluding line and source-fragment context | none — states one problem |

### View slot/Missing-annotation list

Replaces the active view while any class lacks `@spatial`, until Generate resolves the missing annotations. It is read-only.

Root address: `missingAnnotations()`.

Composition:

| Part | Presence | Address | Actions |
| ---- | -------- | ------- | ------- |
| Missing class item | one per class without `@spatial` | `.item(className)` | none — identifies one unpositioned class |

### View slot/Mermaid view

Displays the diagram with the standard Mermaid renderer. Informational only: zoom and pan, never modifies source. Shiny annotations are invisible to it. No addressable parts.

### View slot/Shiny view

The manipulation surface.

```text
┌──────────┬──────────────────────────────┬──────────┐
│          │                     (Legend) │          │
│   Tool   │           Canvas             │   Edit   │
│   pane   │         (Diagram)            │   pane   │
│          │                              │          │
└──────────┴──────────────────────────────┴──────────┘
```

Composition:

| Part      | Presence | Address      |
| --------- | -------- | ------------ |
| Tool pane | always   | `toolPane()` |
| Canvas    | always   | —            |
| Edit pane | always   | `editPane()` |

## Editor composition - deepdive

### Canvas

Renders the diagram from the source: positions come from `@spatial` and `@note:` annotations.

Canvas behavior:

- **Pan and zoom** — never write to source.
- **Select** — click a component; the edit pane follows the selection. Click empty canvas to deselect.
- **Create** — with a tool selected in the tool pane, click the canvas to place the new element at that point; writes the declaration statement and its annotations.
- Coordinate-addressed interaction in scenarios uses `at(x, y)` in webview pixels.

Composition:

| Part                    | Presence                                                     | Address                                           |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------- |
| Class box               | one per class                                                | `classBox(name)`                                  |
| Edge                    | one per relationship                                         | `edge(from, to)`                                  |
| Note                    | one per note                                                 | `note(text)`                                      |
| Namespace hull          | one per namespace                                            | `namespace(path)`                                 |
| Legend                  | optional                                                     | —                                                 |

#### Class box

```text
┌───────────────────────────────┐
│        <<Stereotype>>         │   ← optional
│         Display label         │   ← header
├───────────────────────────────┤
│ fieldName: Type               │
│ methodName(arg): Return       │   ← member text; emphasis controls while editing
└───────────────────────────────┘
```

Root address: `classBox(name)` — name is the class identifier.

Composition:

| Part                   | Presence                                    | Address                                                      | Actions                                                      |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Box                    | always                                      | `classBox(name)`                                             | **click:** selects the box + opens the class variant of the edit pane<br>**drag:** moves the box + writes `x`/`y` to the class's `@spatial`; a drop fully outside a namespace hull removes the class from that namespace, a drop inside (even partially) adds it — both rewrite the class declaration's containment |
| Resize handle          | 8 (one per side and corner)                 | `.resizeHandle(side)` — side: `"n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"` | **drag:** resizes the box + writes `w`/`h` to `@spatial`     |
| Stereotype             | optional — when the class has an annotation | `.stereotype()`                                              | none — renders the class annotation (`<<interface>>`)        |
| Header                 | always                                      | `.header()`                                                  | **double-click:** enters inline editing<br>**commit:** renames the class identifier + rewrites relationship endpoints, direct-style targets, spatial annotations, style applications, and colon-style member owners; attached-note targets are unchanged |
| Member row             | one per member                              | `.member(text)` — text as rendered                           | **double-click:** enters inline editing<br>**commit:** rewrites the member text |
| Member emphasis controls | 2 while a member row is being edited    | `.member(text).emphasis(name)` — name: `"Underline" | "Italic"` | **click:** toggles the corresponding static or abstract classifier on the member |
| Add buttons            | always                                      | `.button(label)` — visible label                             | **click:** appends a new attribute or method row and opens it for editing + writes a member statement |

Rules:

- Both block and colon member syntax are parsed; the box renders them identically.
- An invalid edited member row stays in edit mode until corrected.
- Invalid or unusual member rows loaded from source are preserved and shown as raw text with a warning.
- Arbitrary stereotypes inside `<< >>` are preserved and rendered.

#### Edge

Root address: `edge(from, to)` — the endpoint class identifiers.

Composition:

| Part     | Presence                                     | Address                                   | Actions                                                      |
| -------- | -------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| Line     | always                                       | `edge(from, to)`                          | **click:** selects the edge + opens the relationship variant of the edit pane |
| Endpoint | 2 (source, target); targets are rendered only while the edge is selected | `.sourceEndpoint()` / `.targetEndpoint()` | **drag:** reconnects the edge to the class it is dropped on + rewrites the relationship's source or target identifier |
| Label    | optional — when the relationship has a label | `.label()`                                | **double-click:** enters inline editing<br>**commit:** rewrites the text after `:` |

Rules:

- Relationship kind, source multiplicity, target multiplicity, and label are separate properties; multiplicity is never part of the label.
- Lollipop interfaces render as relationship-like components and are preserved in source.
- Manual edge routing is not persisted; no source syntax exists for it.

#### Note

Free notes stand alone; attached notes belong to a class and render a dashed link to it.

Root address: `note(text)` — the note text.

Composition:

| Part            | Presence                             | Address               | Actions                                                      |
| --------------- | ------------------------------------ | --------------------- | ------------------------------------------------------------ |
| Note box        | always                               | `note(text)`          | **click:** selects the note + opens the note variant of the edit pane<br>**drag:** moves the note + writes `x`/`y` to the note's `@note:` annotation |
| Resize handle   | 8 (one per side and corner)          | `.resizeHandle(side)` | **drag:** resizes the note + writes `w`/`h` to `@note:`      |
| Text            | always                               | `.text()`             | **double-click:** enters inline editing<br>**commit:** rewrites the note text |
| Attachment link | optional — when the note is attached | —                     | none — renders the dashed link to the note's class           |

Rules:

- Creation writes the note statement and its `@note:` annotation as a pair; deletion removes the pair.
- Attaching and detaching rewrites the statement between `note "..."` and `note for <ClassId> "..."`; annotation and position are unchanged.

#### Namespace hull

A derived hull around the namespace's member classes. Namespaces never have position annotations; geometry is re-derived from member positions.

Root address: `namespace(path)` — the dotted path.

Composition:

| Part   | Presence | Address           | Actions                                                      |
| ------ | -------- | ----------------- | ------------------------------------------------------------ |
| Hull   | always   | `namespace(path)` | **click** (on the border): selects the namespace + opens the namespace variant of the edit pane<br>**drag:** moves all member and descendant-member classes by the same delta + updates each moved class's `@spatial` |
| Header | always   | `.header()`       | **double-click:** enters inline editing<br>**commit:** renames the namespace path + rewrites every descendant path and reference |

### Tool pane

The palette of creation tools. Root address: `toolPane()`.

Composition:

| Part                       | Presence | Address                                 | Actions                                                      |
| -------------------------- | -------- | --------------------------------------- | ------------------------------------------------------------ |
| Node tools                 | always   | `.tool(name)` — the tool's visible name | **select, then click the canvas:** creates the element at that point + writes the declaration statement and its annotations; tools: Class, Namespace, Note |
| Relationship tools        | always   | `.tool(name)` — the tool's visible name | **select, then click source class, then target class:** creates the relationship + writes the relationship statement; tools: Association, Directed association, Bidirectional association, Dependency, Inheritance, Realization, Aggregation, Composition |

### Edit pane

One pane; its content follows the selection. Root address: `editPane()`.

Options:

| Component            | Condition               |
| -------------------- | ----------------------- |
| Class variant        | a class is selected     |
| Relationship variant | an edge is selected     |
| Note variant         | a note is selected      |
| Namespace variant    | a namespace is selected |
| Diagram variant      | nothing is selected     |

Shared rules:

- Class style changes write to Mermaid-native `classDef` / `:::StyleName`.
- Namespace style changes write to the `@style` annotation.
- If a style edit targets a class sharing a `classDef` with other classes, Shiny creates or assigns a unique style instead of changing multiple classes.
- Controls share the address forms `.button(label)`, `.field(label)`, `.colorSelect(label)` with `.option(name)` — the option name is a preset name or, for colors already used in the diagram, the raw color value.
- The pane edge control is `.button("Collapse pane")` while expanded and `.button("Expand pane")` while collapsed.

#### Class variant

Sections: "Class properties", "Configure style", "Actions".

Composition:

| Part                 | Presence                     | Address                                     | Actions                                                      |
| -------------------- | ---------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Name field           | always                       | `.field("Name")`                            | **commit:** renames the class identifier with the same reference rewrites and attached-note limitation as inline header editing |
| Display label field  | always                       | `.field("Label")`                           | **commit:** edits the class label clause; the class identifier is unchanged |
| Stereotype field     | always                       | `.field("Stereotype")`                      | **commit:** edits the class annotation (`<<interface>>`)     |
| Named style selector | always                       | `.field("Style")`                           | **select:** assigns a `classDef` style + writes the style application |
| Color selects        | 3 (Fill, Stroke, Text color) | `.colorSelect(label)`, then `.option(name)` | **click:** opens a palette of presets and document colors<br>**click an option:** writes the direct style property |
| Line selectors       | 2 (Width, Dash)              | `.field(label)`                             | **select:** writes the direct style property                 |
| Style action button  | always                       | `.button(label)` — `"Save style"` or `"Edit style"` | **click:** creates or opens the selected named style |
| Action buttons       | always                       | `.button("Duplicate")` / `.button("Delete")` | **click:** duplicates the class or removes its declaration and every reference |

#### Relationship variant

Composition:

| Part                     | Presence           | Address                                                      | Actions                                                      |
| ------------------------ | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Source endpoint selector | always             | `.field("Source endpoint")`                                  | **select:** rewrites the relationship's source endpoint kind |
| Line selector            | always             | `.field("Line")`                                             | **select:** rewrites the relationship's solid or dashed line kind |
| Target endpoint selector | always             | `.field("Target endpoint")`                                  | **select:** rewrites the relationship's target endpoint kind |
| Reverse button           | always             | `.button("Reverse")`                                         | **click:** swaps source and target endpoints and their multiplicities |
| Multiplicity fields      | 2 (source, target) | `.field("Source multiplicity")` / `.field("Target multiplicity")` | **commit:** rewrites the multiplicity clause at that endpoint |
| Label field              | always             | `.field("Label")`                                            | **commit:** rewrites the relationship label                  |
| Action buttons           | always             | `.button("Duplicate")` / `.button("Delete")`               | **click:** duplicates or removes the relationship statement  |

#### Note variant

Composition:

Note text is edited only through `note(text).text()` on the canvas; the edit pane has no text field.

| Part              | Presence                         | Address                      | Actions                                                      |
| ----------------- | -------------------------------- | ---------------------------- | ------------------------------------------------------------ |
| Attach button     | when the note is free            | `.button("Attach to class")` | **click:** starts class selection for attachment             |
| Detach button     | when the note is attached        | `.button("Detach")`         | **click:** rewrites the note as free                         |
| Duplicate button  | always                           | `.button("Duplicate")`      | **click:** duplicates the note and its annotation            |
| Delete button     | always                           | `.button("Delete")`         | **click:** removes the note and its annotation as a pair     |

#### Namespace variant

Composition:

| Part             | Presence                     | Address                                | Actions                                                      |
| ---------------- | ---------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Name field       | always                       | `.field("Name")`                       | **commit:** renames the namespace path                       |
| Color controls   | 3 (Fill, Stroke, Text color) | `.colorSelect(label)`, `.option(name)` | **click:** opens the palette<br>**click an option:** writes the `@style` annotation |
| Line controls    | 2 (Width, Dash)              | `.field(label)`                        | **select:** writes the corresponding `@style` property       |
| Reset button     | always                       | `.button("Reset style")`               | **click:** removes the namespace style annotation            |
| Delete button    | always                       | `.button("Delete")`                    | **click:** removes the namespace block; member classes remain, moved to the parent scope |

#### Diagram variant

Composition:

| Part              | Presence                             | Address                                      | Actions                                                      |
| ----------------- | ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------ |
| Saved style       | one per `classDef`                   | `.savedStyle(name)`                          | **click:** selects the style for editing                     |
| New-style button  | always                               | `.button("+ New style")`                    | **click:** creates and selects a named style                 |
| Back button       | while editing a style opened from a class | `.button("← Back")`                    | **click:** restores the originating class selection         |
| Name field        | while a saved style is selected      | `.field("Name")`                            | **commit:** rewrites the style definition name and every application |
| Color controls    | while a saved style is selected      | `.colorSelect(label)`, `.option(name)`       | **click:** writes the style property                         |
| Line controls     | while a saved style is selected      | `.field(label)` — label: `"Width" | "Dash"` | **select:** writes the style property                        |
| Delete button     | while a saved style is selected      | `.button("Delete style")`                   | **click:** removes the style definition                     |
