# UI library standards

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Implemented  
> **Last reviewed:** 2026-08-19  
> **Scope:** Rules for the ownership, structure, and style values of the UI library layer under `webview/src/Ui/**`  

Domain components consuming the library are governed by [react-standards](./react-standards.md); components are self-documenting — contracts live in code and file annotations, not in this document. `styles.css` governs itself through its header annotation.

Layer consumers, declared per layer: 
- the View domain tree consumes both wings
- Shell consumes the `chrome/` wing
- Controller, Bridge, and mermaidRenderer consume nothing from this layer — including tokens. 
- mermaidRenderer styles rendered diagram content outside the brand system: it owns its stylesheet, consumes `--vscode-*` directly, and never reads `--shiny-*`
Token consumption by cascade is part of the declared dependency: a `var(--shiny-*)` read in a non-consumer layer is a violation. How domain components consume the library is governed by [react-standards](./react-standards.md).

# Vocabulary

**Library** — a centralized repository of encapsulated UI elements, used by View components to reduce entropy in visual/behavioral representation by hard limitation of pattern variety

**Library component** — a component implemented in the UI library

**Wing** — one of the library's two identity areas, `chrome/` and `canvas/`

**Core** — the library's shared behavioral floor (`core/`): interaction machinery whose sameness across wings is semantic, not visual

**Tier** — the library composition level of an element — primitive, composite, or template — fixing what it may import from the library; determined by its folder path

**Primitives** — lowest-level reusable UI parts with fixed visuals and behavior, e.g. button with icon. Leaves of the library: they import nothing from it. Owns a design decision: it fixes which tokens/visual choices apply, removing that choice from consumers.

**Composites** — reusable UI elements assembled from primitives, other composites and native DOM elements, owning both their visuals and their interaction behavior — e.g. an editable field with fixed styling, commit/discard logic, and a validation error pop-up

**Templates** — structural UI containers that arrange, group, or frame other library elements without owning behavior

**Glyph descriptor** — pure geometry data (paths on the 16-grid, filled and dashed flags, anchor — required for marker glyphs), typed in `shared/`. Domain components author domain-meaningful descriptors as content; a library element may own UI-pattern descriptors as private constants. The receiving element renders the descriptor and owns all treatment; it never supplies descriptor content of its own

# Library scope

### What is a library element

- Semantics, throughout this document, means the editor's subject matter: UML/Mermaid vocabulary (class, member, annotation, multiplicity, namespace) and what any rendered thing or reported event means to the diagram. Structural picture vocabulary — chrome, canvas, diagram, node, edge, grid — is not semantics: it names where and what the library draws, and is part of library knowledge
- An element is expressible in pure UI/behavior terms and semantic-blind; semantic decisions arrive only through props and variants
- Admitted only when its UI/behavior cannot be expressed by composing or configuring existing elements
- An element whose appearance is entirely determined by passed-in runtime values owns no decision and is not an element. Geometry-driven canvas elements (an edge taking path points, a box taking a rect) pass this test when they own the treatment around the received geometry — stroke identity, selection expression, hit policy

### Ownership

An element owns:

- Its visuals and their composition from tokens, per situation
- Its interaction behavior and local drafts — local view state held until an explicit outcome
- Its internal structure: owned children, private helpers, its stylesheet

An element never owns:

- Mermaid/UML semantic meaning of what it renders or reports — dispatch, transactions, and interpretation stay in domain components
- Editor knowledge: the state ledger, `editorCommands`, contexts, `editorUiConfig`, anything under `EditorRoot/**`
- Framework knowledge: framework libraries and their vocabularies

### Modifier design

Modifiers come in three kinds. **Lifecycle** modifiers name states the element passes through or interaction modes it is in (`visible`, `disabled`, `pressed`, `isEditing`); they typically interact with the event contract. **Property** modifiers are independent visual axes — any value composes with any value of every other axis. **Role** modifiers move several properties under one value because the value names a designed situation; a role is legitimate on either ground: coherence (free axes would permit combinations nobody designed) or meaning (the value names something in the interaction vocabulary — `danger`, `attachment` — and the visual bundle is the element's private expression of it; a meaning role may govern a single property today and grow without contract change).

**Factorization rule.** For an element's `Modifiers:` surface, let P be the product of its value counts and U the set of combinations its consumers exercise. Axes are earned only while **P ≤ 2·|U|**. Above that, the surface collapses to one role modifier with one value per designed situation — collapse now, re-split later if a new situation re-earns the axes; role-to-axes is a value-set rename with a grep-complete consumer sweep, so deferring the split is always cheap. The rule is checker-enforced from actual consumer usage. Lifecycle modifiers are outside the rule: a lifecycle surface is a coherent state machine and may be complete beyond current consumption.

Corollaries: an element never exposes a role and the axes that role governs — one owner per concern. A role vocabulary shared across elements (`surfaceTone`) recurs identically: an element adopting it adopts the whole value set, and divergence is a contract change. Naming gravity: roles are named `variant`, `treatment`, or `tone`; property axes by their axis noun; lifecycle modifiers `is*`/`has*` or a bare state adjective.

### Selector convention

Selectors — elements offering a closed choice from a popup (Dropdown, ColorSelect, StrokeSelect, CommitComboBox) — share one interaction grammar without sharing a shell: a trigger showing the current value with a SelectorChevron; a listbox popup with option children and roving focus; aria-haspopup/aria-expanded on the trigger; open/close toggled from the trigger; while open, Escape anywhere dismisses and restores trigger focus, an outside press dismisses without moving focus, and choosing an entry closes and reports. Dismissal and positioning machinery comes from core/ — never hand-rolled. A new selector adopts this grammar whole; divergence is a contract change.

# Library structure

- **`chrome/`** — elements of panes and header
- **`canvas/`** — elements of diagram surfaces and overlays, assembled by consumers into diagram surfaces; user style values and glyph descriptors arrive as data props. Edge text placement along the path, compartment content semantics, and framework adapters are never library
- **`core/`** — behavioral machinery consumed by both wings: commit lifecycle, popup positioning and dismiss, keyboard patterns, gesture cursor override. Modules, not components: nothing rendered, no `.module.css`, no tokens. Admission test: if the wings' versions diverged, would that be a bug (core) or a design choice (wing)?
- Wings never import each other; visual coincidence between them is never a dependence. Core imports nothing from the wings
- Raw native interactive elements exist only inside the library — lint-enforced; wing and tier rules are boundary-checker-enforced by path

```
webview/src/Ui/
├── core/
├── chrome/
│   ├── tokens.css        the chrome brandbook
│   ├── tokens.ts         the chrome brandbook: attribute/TS-consumed identity values
│   ├── primitives/
│   ├── composites/
│   └── templates/
└── canvas/
    ├── tokens.css        the canvas brandbook
    ├── tokens.ts         the canvas brandbook: attribute/TS-consumed identity values
    ├── primitives/
    ├── composites/
    └── templates/
```

# Library boundary

Inbound — how a consumer speaks to an element:

- UI props in, `on<Event>` handlers out; injected pure functions (e.g. `validate`) are permitted
- Situations are selected by variant; values are never passed for styling — no `className`, `style`, or visual-value props
- Glyph descriptors are content data, in the same category as text labels — legal at any icon or marker slot. The descriptor states geometry and the filled and dashed flags only; the receiving element owns all treatment: wrapper, stroke language, caps, color from tokens

Imports — what an element's files may reach:

| Tier | May import from the library |
|---|---|
| Primitives | `core/` only |
| Templates | `core/` only — children arrive as props |
| Composites | own wing's primitives and composites (acyclic), and `core/` |

- Additionally: React and browser APIs, own children, own `.module.css`, imports from `shared/`, and the own wing's brandbook files — the tier matrix governs elements, not the brandbook
- Nothing editor-side or framework-side, per Ownership
- No root, wing, or tier barrels; direct imports from defining component files

Outbound — what an element exposes:

- The component and its boundary types; owned children, internal files, and `.module.css` are off-limits to consumers
- Consumers: the EditorRoot tree (both wings), Shell (`chrome/` wing only), and same-wing library composites — never Controller, Bridge, mermaidRenderer; `core/` is never imported outside the library

Stability:

- Contracts are stable by default: a mount-point need is met by the existing contract, proposed as a new variant or element through review, or escalated — contract changes are dedicated chunks, and the `ui/**` diff is a separate review artifact of every chunk touching it

# Component organization

### Structure

```
Dropdown/
├── Dropdown.tsx
├── Dropdown.module.css
└── OptionList/       owned child
```

- A component's wing and tier are its folder path
- Component folder closed set: `<Component>.tsx`, `<Component>.module.css`, owned children — imported only by the parent, never exported; they inherit the parent's wing and tier

### `<Component>.tsx`

#### File composition

- The component, its props type, and private helpers; the props type is the element's boundary type
- Exports: the component and its boundary types, nothing else
- Props types declare members in fixed order: data props (content, then geometry, then injected functions), lifecycle modifiers, remaining modifiers, `on<Event>` handlers last

#### Naming

- Elements are named after their UI/behavior: `ResizeAffordance`, not `ClassResizeAffordance`; an element that cannot be named without a domain word does not belong in the library
- Standard UX pattern names are used bare when the element behaves exactly as the pattern implies: `Dropdown`
- A modifier prefix names an augmentation beyond the pattern's definition and carries its obligations: `Commit` (draft lifecycle), `Reserved` (space kept regardless of content state; the prefix names an element whose whole identity is space-keeping — an option may provide space-keeping behavior without carrying the prefix), `Affordance` (signals and reports an interaction on another element, never owns it), `Inline` (in-place canvas treatment: transparent ground, canvas type scale, treatment calibrated to sit inside diagram surfaces)
- Variant and option names are situational UI vocabulary ("inline", "compact", "secondary"), never domain words

#### Annotation

The component's TSDoc block is its entire public documentation: a consumer reads the block and the props type, and never opens the component body or its `.module.css`. Canonical exemplars: `canvas/primitives/InlineTextBlock`, `chrome/composites/CommitComboBox`.

Structure is fixed:

- **Summary line** — one line naming the element's UI/behavior, standalone-readable in a catalog, no member references. It opens with the bare UX pattern name where one applies and spends its words on what exceeds the pattern
- Blank line, then the **contract paragraph** — prose narrating behavior, with every data prop woven in backticked at its point of participation; a parenthetical only where meaning exceeds the name
- **`Gesture targets:`** — an optional list of local rendered targets on which user gestures can act. When present, it appears before `Lifecycle:` and `Modifiers:` and uses this exact entry form:

  ```text
  Gesture targets:
  - `<address>` — `<query>`
  ```

  **Address** names a gesture target local to this UI component. It must not include View composition. **Query** states how the rendered target can be found. A Query is declarative, not Playwright code. Conditions separated by `;` apply to the same rendered element; `>` means a descendant lookup.

  Example:

  ```text
  Gesture targets:
  - `dropdown()` — `role=button; aria-haspopup=listbox`
  - `dropdown().option(name)` — `role=option; accessible-name=name`
  ```
- **`Lifecycle:`** — one bullet per lifecycle modifier: a prop naming a state the element passes through or an interaction mode it is in (`visible`, `disabled`, `pressed`, `collapsed`, `isEditing`, `dragging`). Lifecycle modifiers typically interact with the event contract — which handlers are live, what a click means. Lifecycle entries carry no `Used by:` anchors — a lifecycle surface is a coherent state machine, complete regardless of current consumption.
- **`Modifiers:`** — one bullet per modifier; its values always enumerate as nested bullets, one per value, regardless of count. Each value bullet states the observable result — what is rendered or permitted — never role labels or CSS property names, and closes with `Used by:` naming the product situations that exercise that value. For a boolean modifier the two values are on and off; when off is the resting default, its anchor may honestly read `Used by: everywhere else`.
- **Application anchors** live per value under `Modifiers:`, in product vocabulary (class title, namespace heading, member row, note body, relationship label) — never component names or file paths, always derived from actual consumers. A component with no `Modifiers:` section instead carries one `Used by:` line as its own paragraph, separated by a blank line after the contract paragraph. A modifier value with no product situation, traced transitively through library consumers, is a dead option — record the finding and remove it through the normal contract-change process. Optional `— e.g.` calibrations may still appear in prose where they aid binding.

Member classification is mechanical: a **modifier** is a prop typed as an element-defined closed set — a union of literals, or an `is*`/`has*` boolean; everything else — runtime content, geometry, injected functions, `on<Event>` handlers — is a **data prop**. Two refinements override type shape: a prop whose values are user or document content — initial values of editable state, user style values — is a data prop regardless of how closed its type is; and classification applies to the component's own props only — fields nested inside data-entry shapes are documented where their data prop weaves, never as Modifiers.

Content law:

- A fact spans props once: stated in the narrative where the props meet, never repeated in a parenthetical
- Obligations are stated as behavior the element owns. A relationship that is itself contract may name its counterpart; the block never delegates — no "X lives in Y", no tiers, no files, no trigger keys, no CSS mechanisms, no token values, no restated types. Library-wide conventions live once in the catalog preamble, not per block
- The deletion test governs every sentence: if a consumer would not mis-build without it, it goes
- A defect discovered while writing goes to the findings list, never into the prose as a caveat
- A prop the prose cannot weave gracefully, or option values whose difference resists plain statement, is written best-effort and flagged as a findings-list entry — the friction is evidence about the contract, not a documentation failure

An exported boundary type that carries capabilities (option entries, row shapes) receives its own TSDoc block under the same content law, scoped to what the shape's fields mean to a consumer; the catalog renders it under the owning component. Boundary types that are plain aliases or self-evident shapes need no block.

#### Ownership

- The element's visual composition: which parts express which situation, spacing of its internals
- Identity-bearing values (per Property ownership) are never stated locally — only `var(--shiny-…)` reads; internal geometry remains the element's literals
- Reads only `--shiny-*` tokens and variables the component defines itself; consumer-bound custom properties carry data, never styling

#### Style naming

- Class names state the component's own states, parts, or variants — the axis that distinguishes them from each other — never the component's name (redundant with the file) or its domain role
- Name the contract, not the mechanism: what the class guarantees (`reservedBlank`), not how it is done (`hiddenAffordance`)

#### Annotation

- `@render` header, same rule as `<Component>.tsx`: non-derivable facts or omit

# Brandbook organization — wing brandbooks

The brandbook is per-wing: each wing owns its identity as `<wing>/tokens.css`, plus `<wing>/tokens.ts` for identity values consumed as attributes or TypeScript values (minted only when the wing has such values). Choosing values there is the brand work, and no separate brandbook document exists. Each wing aliases `--vscode-*` for its own tokens — which theme variable feeds which role is an identity decision; `--vscode-*` appears nowhere outside brandbook files. Values coinciding across wings are coincidence, never dependence: no cross-wing token exists, and a wing's values are free to diverge. `tokens.ts` is not `editorUiConfig.ts`: config tunes behavior, the brandbook asserts identity. Each brandbook file is governed by its own header annotation.

### Ownership

Which home a style value gets is decided by two questions:

- **Independence test** — can this value change alone, with nothing elsewhere becoming wrong? Yes → literal in the owning component's `.module.css`. No → one home by agreeing parties: internal to one component → its `.module.css`; siblings in one arrangement → the layout template; unrelated components → token; TypeScript is a party → `editorUiConfig.ts`, bound into CSS as a component-owned custom property; the user's diagram is a party → `stylePresets.ts`. Overlaps resolve in that reverse order. Mount count never enters the test.
- **Asserted vs emergent** — a dimension asserted regardless of content is identity and gets a home; a dimension emerging from content is not authored at all (only paddings and constraints are). A dependent value is computed from its one free variable (`calc()`, shared constant), never a second number kept equal by hand.

The wing brandbooks own the property groups the Property ownership table routes to `tokens.css`: color, type scale, line and border shape, shadows, cursor, identity opacity, control heights and compact widths. Table references to `tokens.css` mean the owning wing's brandbook.

### Style naming

- A token is named after what it is FOR, never after its value; area prefixes scope generic roles (`--shiny-chrome-font-size-label`, `--shiny-canvas-font-size-primary`); single-area concepts (field, button, edge) need no prefix. Custom properties are global at runtime: the two wing brandbooks share one namespace, and a role existing in both wings carries its area prefix in each
- Consumers use tokens as-is: no local color-mix, alpha, or dimming — a use that needs a different value gets its own token

### Annotation

- The binding brand rules — naming law, value sourcing, theme variance, annotation discipline — are written in the file's own header annotation; this chapter describes the structure, the header is the law

# Property ownership

Each CSS property appears in exactly one row. Rows group properties sharing one value-definition policy; a conditional policy is a policy. Policies are written as `<source>: <case>`, case omitted when unconditional. All conditions live in the Value definition column.

| Property group | Exact CSS properties | Value definition |
|---|---|---|
| Color | `color`, `background`, `background-color`, `border-color`, `outline-color`, `caret-color`, `accent-color`, `fill`, `stroke` | `tokens.css`: authored values<br>component-owned data binding: values derived from user content |
| Type scale | `font-family`, `font-size`, `font-weight`, `line-height` | `tokens.css` |
| Line and border shape | `border-style`, `outline-style`, `text-decoration-style`, `stroke-dasharray`, `border-width`, `outline-width`, `stroke-width`, `border-radius` | `tokens.css` |
| Shadows | `box-shadow`, `text-shadow`, `filter` (shadow functions) | `tokens.css` |
| Cursor | `cursor` | `tokens.css` |
| Opacity | `opacity` | `tokens.css`: when expressing an identity state (disabled, scrim, emphasis levels)<br>owning component's `.module.css`: as a pure show/hide mechanism |
| Stacking | `z-index` | `editorUiConfig.ts` — out of library scope; routed by domain components as a data prop, applied by the receiving element or framework adapter |
| Heights | `height`, `min-height`, `max-height` | `tokens.css`: on interactive controls and interaction affordances<br>owning component's `.module.css`: otherwise |
| Widths | `width`, `min-width`, `max-width` | `tokens.css`: on compact interactive controls and interaction affordances<br>arranging template's `.module.css`: on fluid interactive controls<br>owning component's `.module.css`: otherwise |
| Box geometry | `padding`, `margin`, `inset`, `top`, `right`, `bottom`, `left`, `transform` | owning component's `.module.css` |
| Layout | `display`, `flex-*`, `grid-*`, `gap`, `align-*`, `justify-*`, `overflow` | owning component's `.module.css` |
| Interaction toggles | `visibility`, `pointer-events` | owning component's `.module.css` |
| Text emphasis | `font-style`, `text-decoration-line` | owning component's `.module.css`: binary state expression selected by variant — no authored value exists |

Corollaries:

- Only library components own a `.module.css`; the four legacy canvas surfaces (ClassBox, NoteBox, NamespaceBox, RelationshipEdge) are checker-allowlisted until their assembly migrations and follow this table in their own CSS
- For values owned by `tokens.css`, component CSS contains no raw values — only `var(--shiny-…)` reads
- A component may define custom properties only in its own namespace and only to carry data, never to author styling
- Deferral keywords (`transparent`, `none`, `currentColor`, `font: inherit`) are legal in component CSS — they author nothing
- Spacing literals stay unpromoted until a rhythm scale enters `tokens.css`
- A value with no home in this table is a table amendment, decided centrally — never a local exception
