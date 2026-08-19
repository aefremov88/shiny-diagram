# Editor interface

> **Kind:** Defining  
> **Document state:** Work-in-progress  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-19  
> **Scope:** The authoritative description of the editor interface: the component tree, each component's behavior, what its actions write to the source, and its address for programmatic access  

## Purpose

This document defines the editor interface. The implementation follows this document.

The interface is a tree of components. A parent relates to its children in one of two ways:

- **Composition** — the parent contains the child. A composition child may be optional or repeated.
- **Option** — the parent shows exactly one of the children; a condition chooses which.

Each interactive part carries an **address** — the way debugging scenarios refer to it. The grammar: root targets name top-level components (`classBox(name)`, `edge(from, to)`, `editPane()`); nested parts are methods on their root, shown as relative addresses (`.header()` means `classBox(name).header()`); names are what the source and screen show — class identifiers, rendered member text, visible control labels. `—` means the part is not addressable.

## Webview composition - top level

The root component: one persistent shell inside the VS Code panel.

Composition:

| Part           | Presence | Address   |
| -------------- | -------- | --------- |
| Webview header | always   | `shell()` |
| View slot      | always   | —         |

Options of the view slot:

| Component       | Condition                           |
| --------------- | ----------------------------------- |
| Problem list    | the source state prevents rendering |
| Autorender view | view toggle set to Autorender       |
| Editor view     | view toggle set to Editor           |

### Webview header

Composition:

| Part            | Presence                                 | Address               | Actions                                                      |
| --------------- | ---------------------------------------- | --------------------- | ------------------------------------------------------------ |
| Title           | always                                   | —                     | none — identifies the panel as Shiny                         |
| View toggle     | always                                   | `.viewToggle(view)`   | **click:** switches between Autorender and Editor            |
| Status message  | optional — shown when action is needed   | `.status()`           | none — reports invalid Mermaid syntax and missing, malformed, orphaned, or duplicated annotations |
| Generate button | optional — shown with the status message | `.button("Generate")` | **click:** computes missing spatial metadata and replaces malformed Shiny annotations where safe + writes the annotation statements |

### View slot/Problem list

Replaces the active view with the list of blocking problems.

Root address: `problemList()`.

Composition:

| Part         | Presence                 | Address                          | Actions                   |
| ------------ | ------------------------ | -------------------------------- | ------------------------- |
| Problem item | one per blocking problem | `.item(text)` — text as rendered | none — states one problem |

### View slot/Autorender view

Displays the diagram with the standard Mermaid renderer. Informational only: zoom and pan, never modifies source. Shiny annotations are invisible to it. No addressable parts.

### View slot/Editor view

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
| Missing-annotation list | optional — shown while any class lacks `@spatial`, until Generate resolves them; read-only | `missingAnnotations()`; items: `.item(className)` |

#### Class box

```text
┌───────────────────────────────┐
│        <<Stereotype>>         │   ← optional
│         Display label         │   ← header
├───────────────────────────────┤
│ [+] fieldName: Type           │
│ [+] methodName(arg): Return   │   ← prefix dropdown + member text
└───────────────────────────────┘
```

Root address: `classBox(name)` — name is the class identifier.

Composition:

| Part                   | Presence                                    | Address                                                      | Actions                                                      |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Box                    | always                                      | `classBox(name)`                                             | **click:** selects the box + opens the class variant of the edit pane<br>**drag:** moves the box + writes `x`/`y` to the class's `@spatial`; a drop fully outside a namespace hull removes the class from that namespace, a drop inside (even partially) adds it — both rewrite the class declaration's containment |
| Resize handle          | 8 (one per side and corner)                 | `.resizeHandle(side)` — side: `"n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"` | **drag:** resizes the box + writes `w`/`h` to `@spatial`     |
| Stereotype             | optional — when the class has an annotation | `.stereotype()`                                              | none — renders the class annotation (`<<interface>>`)        |
| Header                 | always                                      | `.header()`                                                  | **double-click:** enters inline editing<br>**commit:** renames the class identifier + rewrites every reference to it in the source (relationships, styles, spatial annotations, notes) |
| Member row             | one per member                              | `.member(text)` — text as rendered                           | **double-click:** enters inline editing<br>**commit:** rewrites the member text |
| Member prefix dropdown | one per member row                          | `.member(text).prefix()`                                     | **select:** writes the row's leading visibility marker: none, `+`, `-`, `#`, `~` |
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
| Endpoint | 2 (source, target)                           | `.sourceEndpoint()` / `.targetEndpoint()` | **drag:** reconnects the edge to the class it is dropped on + rewrites the relationship's source or target identifier |
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
| Node tools                 | always   | `.tool(name)` — the tool's visible name | **select, then click the canvas:** creates the element at that point + writes the declaration statement and its annotations; tools: Class, Interface, Abstract class, Enumeration, Note, Namespace |
| Relationship kind selector | always   | `.tool(name)`                           | **select, then click source class, then target class:** creates the relationship + writes the relationship statement; kinds: association, inheritance, composition, aggregation, dependency, realization, solid link, dashed link |

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

#### Class variant

Sections: "Class properties", "Configure style", "Actions".

Composition:

| Part                 | Presence                     | Address                                     | Actions                                                      |
| -------------------- | ---------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Display label field  | always                       | `.field("Label")`                           | **commit:** edits the class label clause; the class identifier is unchanged |
| Stereotype field     | always                       | `.field("Stereotype")`                      | **commit:** edits the class annotation (`<<interface>>`)     |
| Named style selector | always                       | `.field("Style")`                           | **select:** assigns a `classDef` style + writes the style application |
| Color selects        | 3 (Fill, Stroke, Text color) | `.colorSelect(label)`, then `.option(name)` | **click:** opens a palette of presets and document colors<br>**click an option:** writes the direct style property |
| Action buttons       | always                       | `.button(label)`                            | **click:** runs the class action as labeled; Delete removes the declaration and every reference |

#### Relationship variant

Composition:

| Part                | Presence           | Address                                                      | Actions                                                      |
| ------------------- | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Kind selector       | always             | `.field("Kind")`                                             | **select:** rewrites the relationship operator               |
| Multiplicity fields | 2 (source, target) | `.field("Source multiplicity")` / `.field("Target multiplicity")` | **commit:** rewrites the multiplicity clause at that endpoint |
| Label field         | always             | `.field("Label")`                                            | **commit:** rewrites the relationship label                  |
| Delete button       | always             | `.button("Delete")`                                          | **click:** removes the relationship statement                |

#### Note variant

Composition:

| Part           | Presence | Address                 | Actions                                                      |
| -------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| Text field     | always   | `.field("Text")`        | **commit:** rewrites the note text                           |
| Attach control | always   | `.field("Attached to")` | **select:** switches between free and attached + rewrites the statement form |
| Delete button  | always   | `.button("Delete")`     | **click:** removes the note and its annotation as a pair     |

#### Namespace variant

Composition:

| Part           | Presence                     | Address                                | Actions                                                      |
| -------------- | ---------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| Style controls | 3 (Fill, Stroke, Text color) | `.colorSelect(label)`, `.option(name)` | **click:** opens the palette<br>**click an option:** writes the `@style` annotation |
| Delete button  | always                       | `.button("Delete")`                    | **click:** removes the namespace block; member classes remain, moved to the parent scope |

#### Diagram variant

Composition:

| Part         | Presence           | Address             | Actions                                                      |
| ------------ | ------------------ | ------------------- | ------------------------------------------------------------ |
| Saved styles | one per `classDef` | `.savedStyle(name)` | **rename:** rewrites the style definition name + every application<br>**edit properties:** rewrites the style property list |
