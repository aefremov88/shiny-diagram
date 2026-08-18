# Architectural Standards

> **Implementation state:** Aspirational
> **Document state:** Maintained
> **Last reviewed:** 2026-06-26
> **Scope:** Structural rules for production code in the Extension Host and Webview

## Index

1. [Context and scope](#1-context-and-scope)
2. [Architectural pattern catalogue](#2-architectural-pattern-catalogue)
3. [Extension runtime boundary](#3-extension-runtime-boundary)
4. [Webview layered architecture](#4-webview-layered-architecture)
5. [Controller component architecture](#5-controller-component-architecture)
6. [View component architecture](#6-view-component-architecture)
7. [Enforcement](#7-enforcement)
8. [Reference: terminology](#8-reference-terminology)

## 1. Context and scope

The Extension Host and Webview execute in isolated runtimes and communicate through an explicit message protocol. The Webview is a React application. The Extension Host mediates between the Webview and the authoritative `.mmd` document.

This document defines **how production code must be structured**. Target subsystem responsibilities and communication flows are defined in [System Architecture](./system-architecture.md).

Normative terms:

- **must / must not** — mandatory
- **should / should not** — expected unless a documented exception is justified
- **may** — optional

## 2. Architectural pattern catalogue

| Scope | Pattern | Project interpretation |
| --- | --- | --- |
| Extension | **Message-Based Integration across Isolated Runtimes** | Extension Host and Webview communicate only through an explicit, validated protocol. |
| Webview | **Strict Layered Architecture** | All dependencies, including type imports and re-exports, follow `Bridge → Shell`, then either `mermaidRenderer` or `Controller → View`; `ui` is a separate UI library layer consumed only through declared wings; `shared` is a dependency-free foundation. |
| Controller | **Application Controller with a Functional Core** | `ShinyController` orchestrates independent functional components; Controller Commands translate editor command transactions into `SourceEdit[]` and own source identities and source-edit semantics. |
| View | **Component-Based UI with Ownership-Based Composition** | React structure follows ownership; View owns editor interaction and layout decisions, emits editor command transactions, exposes semantic View facades, and composes visible surfaces from the UI library. |

## 3. Extension runtime boundary

### 3.1 Runtime isolation

- The Extension Host and Webview must have separate runtime dependency graphs.
- Runtime communication must cross the boundary only through the message protocol.
- Neither runtime may import executable code from the other.
- Neither runtime may rely on mutable state owned by the other.
- Messages must contain JSON-compatible data.

### 3.2 Protocol boundary

The protocol is the complete wire vocabulary exchanged between the isolated runtimes. It is declared independently at both sides of the boundary:

```text
webview/src/Bridge/protocol.ts
extension-host/protocol.ts
```

- Each protocol module must define its complete message contracts locally.
- A protocol module must not import, re-export, alias, or extend project-owned, package, platform, or runtime-specific contracts. It defines; it does not reuse declarations from elsewhere.
- Protocol modules may contain only self-contained JSON-compatible data declarations, message unions, and explanatory comments.
- The two protocol modules intentionally duplicate the wire declarations and must remain structurally synchronized: message discriminants, payload fields, optionality, and field semantics must match.
- Synchronization must not be achieved by importing a protocol declaration across runtimes or by moving the wire contract into a shared application module.
- Protocol parsing and runtime validation must remain at the runtime boundary.
- Runtime-specific message representations must not enter application logic.

The source-edit payload is one canonical range replacement:

- `start` and `end` are zero-based source positions; the end position is exclusive.
- An empty range inserts `newText`.
- A non-empty range with empty `newText` deletes the range.
- A non-empty range with non-empty `newText` replaces the range.

### 3.3 Boundary adapters

- Boundary adapters own transport, serialization, runtime validation, and conversion between application contracts, protocol-owned wire contracts, and runtime-native contracts.
- The Webview Extension Bridge constructs protocol messages from Controller outputs; Controller must not import protocol modules.
- The Extension Host converts validated protocol payloads into VS Code-native operations; application semantics must not be inferred in the host.
- When an application contract and its wire representation currently have the same fields, their separate declarations still retain separate ownership.
- Translation across the boundary must preserve the semantics of supported operations.
- Transport failures and application outcomes must remain distinguishable.

## 4. Webview layered architecture

### 4.1 Dependency order

```text
Bridge
  ↓
Shell ─────────────────────────→ ui/chrome
  ├── mermaidRenderer
  └── Controller
        ↓
      View ────────────────────→ ui/chrome, ui/canvas

ui/{core,chrome,canvas} → shared
shared ← dependency-free foundation used by Webview layers
```

- Every module dependency must point within the same layer or downward to an explicitly declared dependency.
- The rule applies equally to runtime imports, type imports, dynamic imports, and re-exports.
- A lower layer must remain unaware of every higher layer.
- Reverse-import exceptions are prohibited.
- `ui/` is a separate UI library layer. Shell may consume only `ui/chrome`; the View domain tree may consume `ui/chrome` and `ui/canvas`; Controller, Bridge, and mermaidRenderer must not consume `ui`.
- `ui/core` is internal library machinery and must not be imported outside `ui`.
- `shared/` may be imported by any Webview layer and must not import from a layer.

Layering constrains **static knowledge**, not the direction of every runtime call. Runtime control may return upward through a callback supplied by a higher layer without creating a reverse dependency.

### 4.2 Layer boundary contracts and control inversion

- A lower layer owns the public boundary through which a higher layer uses it.
- That boundary defines accepted arguments, returned values, and callbacks the higher layer must provide.
- A higher layer may construct accepted arguments and implement required callbacks; doing so does not transfer ownership of the boundary contract.
- A lower layer may invoke an injected callback without importing the higher layer that implements it.
- Types used in a boundary signature belong to the layer whose semantics they express, or to `shared/` when their semantics are genuinely cross-layer.

Examples:

- Shell owns the product-level Mermaid/Shiny mode, mounts either standard Mermaid rendering or the Shiny product branch, and does not parse Shiny source or coordinate Shiny command transactions.
- Controller defines its `SourceEdit[]` output and the edit-application callback it requires; Extension Bridge implements that callback and constructs the corresponding protocol-owned edit payload.
- The Webview and Extension Host protocol modules independently define the same wire messages; neither imports the other or an application-owned contract.
- The View command facade defines `EditorCommand`, `EditorCommandTransaction`, and `EditorDispatch`. `EditorCommand` is the canonical registry of primitive editor-domain command shapes. `EditorCommandTransaction` is the unit emitted to Controller.
- Controller constructs one `EditorViewModel` and supplies one semantic dispatch implementation through `EditorView`.
- Raw `sourceText` must not enter the View layer.
- View owns source-agnostic layout choices available from interaction and render context, such as positions and sizes. Controller owns source parsing, source-edit construction, and generation of new source identities and names.
- Each independent transient state domain lives at the narrowest View ancestor shared by its consumers. `EditorView` is not a privileged global store; it is currently the common owner of selected class IDs and class placement mode.

### 4.3 Particular layer access rules

The table governs imports between Webview-owned modules. Platform APIs and third-party libraries are governed separately by layer responsibility.

| Consumer | Permitted dependencies |
| --- | --- |
| `Bridge/protocol.ts` | None; the protocol module defines its complete wire contract locally |
| Other `Bridge` modules | Own modules; `Shell`; type-only Controller edit contracts; `shared/` |
| `Shell` modules | Own modules; `mermaidRenderer`; `Controller/ShinyController`; type-only Controller edit contracts; `ui/chrome`; `shared/` |
| `mermaidRenderer` modules | Own modules; `shared/` |
| `Controller/ShinyController` | Controller components and model; `View/EditorRoot`; `View/commands`; `View/views`; `shared/` |
| Controller components | Own component internals; `Controller/model`; relevant View contract facade; `shared/` |
| `View` | View modules; `ui/chrome`; `ui/canvas`; `shared/` |
| `ui` | Other UI modules allowed by wing and tier rules; type-only `shared/`; no View, Controller, Shell, Bridge, or mermaidRenderer imports |
| `Controller/model` | Sibling files within `Controller/model/`; `shared/` |
| `shared` | Other dependency-free shared modules only |

Additional constraints:

- `Bridge/protocol.ts` must contain no imports or re-exports of any kind.
- The Webview and Extension Host protocol declarations must remain structurally synchronized.
- Controller must not deep-import the View component tree.
- Controller workers must not import React, React Flow, DOM, VS Code, protocol modules, or `ui` modules.
- Shell must not import Extension Bridge or View modules.
- Shell may import `ui/chrome` elements only; it must not import `ui/canvas`, `ui/core`, or `ui/tokens.css` directly.
- View may import `ui/chrome` and `ui/canvas` elements only; it must not import `ui/core` or `ui/tokens.css` directly.
- Extension Bridge must not import Controller model files, workers, ShinyController, View modules, or `ui` modules.

### 4.4 Shared vocabulary areas

- `shared/` contains stable vocabulary whose semantics cross Webview layers, such as canonical identities and generic geometry.
- `Controller/model/` contains source-derived vocabulary shared by Controller components.
- A shared area might be divided into submodules for namespace convenience.
- A narrower shared area may depend only on itself (e.g. own submodules) or more foundational shared areas.
- A shared area must not depend on any layer or component that consumes it.
- `shared/` and `Controller/model/` must not have root barrels.

## 5. Controller component architecture

### 5.1 Orchestrator and functional components

```text
┌──────── parse
ShinyController ───┼──────── deriveViews
└──────── commands
```

- The orchestrator owns application sequencing and coordinates component outputs.
- Each functional component owns one transformation or decision boundary.
- Sibling components must not import or invoke one another.
- Data moves between sibling components through orchestrator-owned snapshots and contracts at their proper architectural owner.
- A component must not consume another component's private representation.
- Controller Commands receive `EditorCommandTransaction` values and produce `SourceEdit[]` batches.
- Controller owns source identities and source-edit semantics. View may reference existing source-derived IDs received in the View model, but Controller assigns IDs for newly created source entities.
- Controller persists layout facts chosen by View; it must not choose diagram layout from missing annotations or UI interaction context.

### 5.2 Component anatomy

```text
component/
├── index.ts      public facade
├── frontman.ts   public runtime entry point
├── contracts.ts  cohesive component-owned contracts, when needed
└── workers/      private implementation
```

The names are roles, not mandatory filenames.

- The component root must expose its boundary, frontman, and meaningful contracts.
- Private workers belong one level below the root.
- Deeper folders require a cohesive internal cluster.
- Components need not be structurally identical.
- Files must not be split for visual symmetry or one-export-per-file organization.

### 5.3 Component facade

- `index.ts` is the component's only external import target.
- `index.ts` may contain annotations, export-group comments, and re-export declarations only.
- `index.ts` must not contain declarations, initialization, implementation, or side effects.
- The public surface must be minimal and consumer-driven.
- A component must not re-export contracts owned elsewhere for convenience.
- External code must not deep-import workers or component contract files.

### 5.4 Frontman and workers

- The frontman is the component's public runtime operation.
- The frontman coordinates workers and owns component-level sequencing.
- Workers implement focused internal responsibilities.
- Workers may import directly within their component.
- Workers must not import through their own public facade.
- Helpers shared by several workers remain private to the component.

### 5.5 Shared Controller model

- Source-derived contracts consumed by multiple Controller components belong to `Controller/model/`.
- The model is shared Controller vocabulary, not a component, and has no facade.
- Consumers import model declarations from their defining files.
- The model must not depend on Parse, Derive Views, Commands, View, or Extension Bridge.

## 6. View component architecture

### Section index

- [6.1 View root and public facades](#61-view-root-and-public-facades)
- [6.2 Ownership-based component structure](#62-ownership-based-component-structure)
- [6.3 View boundary](#63-view-boundary)

### 6.1 View root and public facades

#### 6.1.1 View and UI library organization

```text
webview/src/
├── View/
│   ├── EditorRoot/
│   │   └── index.ts
│   ├── commands/
│   │   ├── index.ts
│   │   └── editorCommands.ts
│   ├── state/
│   │   └── editorStates.ts
│   └── views/
│       └── index.ts
└── ui/
    ├── tokens.css
    ├── core/
    ├── chrome/
    │   ├── primitives/
    │   ├── composites/
    │   └── templates/
    └── canvas/
        ├── primitives/
        ├── composites/
        └── templates/
```

- `EditorRoot/` owns the React Shiny editor tree. Its `index.ts` exports only the `EditorView` runtime entry point.
- `commands/` exposes the canonical View-to-Controller command registry and dispatch contract.
- `state/` exposes shared editor state shapes owned by the View tree.
- `views/` exposes the centralized View render schema to Controller.
- `ui/` is a separate UI library layer, not a View-root area. It owns tiered, editor-blind shared UI elements and `tokens.css` ([UI Library Standards](./UI-library-standards.md)). It must not define editor state, commands, render contracts, or application semantics.
- The View root must not contain `index.ts`.
- The UI library root, wings, and tier folders must not contain barrel `index.ts` files.
- Controller must not import the nested React component tree directly.

#### 6.1.2 Semantic facade areas

- `View/commands/editorCommands.ts` defines the complete canonical registry of `EditorCommand` variants, `EditorCommandTransaction`, and command helper types.
- `View/commands/index.ts` re-exports the command registry contracts and `EditorDispatch`; it does not define commands.
- Component-local `transactions.ts` files may define command-derivation helpers, but must not define or export View-to-Controller command shapes.
- `View/views/index.ts` re-exports the centralized render schema declarations from `View/views/schema.ts`.
- Facade `index.ts` files contain re-exports only.
- A facade area may contain dedicated layer-wide contract modules, but no rendering, state coordination, or interaction implementation.
- Controller must consume View APIs through `View/EditorRoot`, `View/commands`, and `View/views`.
- Controller command handlers may narrow `EditorCommand` through helper types exported by `View/commands`; they must not import component-local command helpers.
- View internals use direct imports from the defining modules and must not import their own public facades.
- `ui/` is not a semantic facade. Consumers import allowed library elements directly from their defining component files, according to `UI-library-standards.md`.

#### 6.1.3 Permitted deviations

- A new View-root area requires a View-wide semantic responsibility not owned by `EditorRoot/`.
- A new root area must expose a purpose-specific API and must not become a miscellaneous shared folder.
- Convenience and anticipated growth are not sufficient reasons to add a root area.

### 6.2 Ownership-based component structure

A component folder may use the following roles:

| File or folder | Responsibility |
| --- | --- |
| `Component.tsx` | Renders the component and wires handlers to the DOM or framework surface it owns. |
| `Component.module.css` | Defines styles owned by the component. |
| `childProps.ts` | Defines pure builders for child view slices, state slices, and UI props derived by the owning component. |
| `state.ts` | Defines component-local transient state contracts and defaults when the state is not part of the shared editor state ledger. |
| `useInteractions.ts` | Constructs the component's event handlers, state updates, and transaction dispatches. |
| `transactions.ts` | Derives `EditorCommandTransaction` values from component-owned interactions using command shapes from the canonical command registry. It must not define command shapes. |
| `frameworkAdapters.ts` | Translates framework-shaped values at a framework boundary into View-owned vocabulary, or View-owned values into framework props. |
| `icons.tsx` | Defines component-owned SVG glyph components passed into library icon slots. |
| `OwnedChild/` | Contains a child component used exclusively by this component. |

- Files are optional; their responsibilities are fixed.
- Folder nesting represents ownership, not incidental DOM depth.
- Exclusive children are nested; independent features remain siblings.

#### 6.2.1 Command origination

- View-to-Controller command shapes are defined only in `View/commands/editorCommands.ts`.
- Command derivation ownership follows the event handler and the View context required to construct a fully specified editor intent, not the entity targeted by the command.
- A parent-owned framework handler may emit a command transaction concerning an owned child representation.
- `EditorCommandTransaction` groups primitive editor commands that belong to one user/editor action. Repeating the same primitive operation is represented by several commands in the transaction, not by a nested collection inside one command.
- Command names use editor-domain vocabulary and name independently meaningful editor facts or operations. They must not name DOM/framework events, source syntax, annotations, `SourceEdit` operations, or generic property bags unless the property bag is intentionally open-ended.
- View owns layout choices. For existing entities, placement changes are emitted as layout facts such as position and size commands. For create/duplicate flows where new source IDs do not yet exist, View supplies desired layout facts in the creation/duplication command and Controller assigns identities and source names.

Examples:

- `ClassDiagram` owns class position and size commands produced from React Flow node interactions.
- `EditPane` owns class style commands produced from style controls.
- A missing-annotation flow emits concrete class position and size commands; it does not ask Controller to generate layout.

#### 6.2.2 Render-contract ownership

- `View/views/schema.ts` defines the authoritative read-only render tree for View model data and is the only declaration point for View shape contracts.
- Component render boundaries consume slices of the centralized view schema rather than defining component-local view contracts.
- A parent may derive child view slices in `childProps.ts` when it owns the composition decision.
- View internals must not import through `View/views`; that facade is reserved for external consumers.

#### 6.2.3 State ownership

- `View/state/editorStates.ts` defines shared editor state shapes and documents their owning components.
- `state.ts` defines only component-local transient state that is not shared through the editor state ledger.
- State shared by descendants is lifted to their nearest common owner.
- Context distributes state and handles; it does not determine semantic ownership.
- Persisted source-derived data must not be duplicated as independent View state.

#### 6.2.4 Interaction ownership

##### Registration ownership

- An interaction handler belongs to the component that owns the DOM or framework surface where the handler is registered.
- `useInteractions.ts` constructs the handlers owned by that component, including handlers registered for owned children when the parent owns the event surface.
- Event handlers that dispatch View-to-Controller transactions must be defined in `useInteractions.ts` and dispatch transactions built by `transactions.ts`.
- Pure framework-value conversion used by interaction handlers belongs in `frameworkAdapters.ts`.

##### Architectural interaction loops

An interaction hook is required when an event enters either of these data loops:

- **events with effect on source:** emit a View-to-Controller command transaction;
- **events with effect on other components:** update shared View state through its public update handle.

Handlers whose effects remain local to one component may remain in `Component.tsx`.
A local interaction may be extracted into a hook when it coordinates multiple handlers, state, effects, or refs. Pure event-data transformations belong in ordinary functions.

##### Event arbitration

- The deepest handler assigning semantic meaning to an event owns that gesture.
- If no nested handler claims the gesture, it may propagate to the owning ancestor or framework handler.
- A nested handler must stop propagation when an ancestor must not interpret the same gesture.
- Any required ancestor effect must then be invoked explicitly by the nested handler.

#### 6.2.6 Permitted deviations

- A component owning a third-party framework boundary may define `Adapters.ts`, such as `reactFlowAdapters.ts`. A framework adapter must remain private to its component subtree and must not expose framework types through View contracts.
- Additional file roles require an existing cohesive responsibility that the standard roles do not cover.

### 6.3 View boundary

- View modules may import only View modules, allowed UI library wing modules, and `shared/`.
- View modules may consume `ui/chrome` and `ui/canvas`; they must not import `ui/core` or `ui/tokens.css` directly.
- View contracts must not expose React, DOM, React Flow, Controller-model, UI-library-private, or source-edit types.
- View may update transient state and emit normalized editor command transactions.
- View owns editor layout choices based on interaction and render context, and emits concrete layout facts rather than layout-generation requests.
- View may reference existing IDs received in the View model, but must not invent source identities for new source entities.
- View must not parse Mermaid or construct source edits.

## 7. Enforcement

`scripts/check-webview-boundaries.mjs` validates project-owned Webview dependencies and the protocol invariants at the Extension runtime boundary.

### 7.1 Analysis scope

The checker analyzes:

- `.ts` and `.tsx` files under `webview/src/`, excluding `.d.ts` files
- runtime imports
- `import type` declarations
- side-effect imports
- `export ... from` and `export type ... from` declarations
- relative imports and configured aliases that resolve inside `webview/src/`
- all dependency syntax in `webview/src/Bridge/protocol.ts` and `extension-host/protocol.ts`, including package and platform imports
- exported protocol declarations in both protocol modules

All analyzed imports and re-exports are dependencies. Package and platform imports are outside the normal Webview dependency matrix, but they are prohibited in protocol modules.

### 7.2 Permitted project dependencies

| Importer | Permitted targets |
| --- | --- |
| `main.tsx` | Extension Bridge runtime entry |
| `Bridge/protocol.ts` | None |
| Other `Bridge/**` modules | Own modules; `Shell`; type-only exports from `Controller/commands`; `shared/**` |
| `Shell/**` | Own modules; `mermaidRenderer/**`; `Controller/ShinyController`; type-only exports from `Controller/commands`; `ui/chrome/**`; `shared/**` |
| `mermaidRenderer/**` | Own modules; `shared/**` |
| `Controller/ShinyController.tsx` | Controller component facades; `Controller/model/**`; `View/EditorRoot`; `View/commands`; `View/views`; `shared/**` |
| `Controller/parse/**` | Own component modules; `Controller/model/**`; `shared/**` |
| `Controller/deriveViews/**` | Own component modules; `Controller/model/**`; `View/views`; `shared/**` |
| `Controller/commands/**` | Own component modules; `Controller/model/**`; `View/commands`; `shared/**` |
| `Controller/model/**` | Other `Controller/model/**` modules; `shared/**` |
| `View/**` | Other View modules; `ui/chrome/**`; `ui/canvas/**`; `shared/**` |
| `ui/**` | Other UI modules allowed by wing and tier rules; type-only `shared/**`; no Webview application layers |
| `shared/**` | Other `shared/**` modules |

Controller components may not import one another. Data shared between them passes through `ShinyController`, `Controller/model/`, or `shared/` according to semantic ownership.

Protocol enforcement:

- `webview/src/Bridge/protocol.ts` and `extension-host/protocol.ts` must contain no imports, re-exports, dynamic imports, `require` calls, or import-type expressions.
- Their exported protocol declarations must remain structurally synchronized. Comments and formatting need not match; the wire contract must.

UI library enforcement:

- Shell may import `ui/chrome/**` only.
- View may import `ui/chrome/**` and `ui/canvas/**` only.
- `ui/core/**` may be imported only by `ui/**`.
- `ui/tokens.css` may be loaded only through the library's declared style entry path; consumers must not import it directly.

### 7.3 Facade configuration

The boundary checker recognizes these facade files:

```text
Shell/index.ts
Controller/parse/index.ts
Controller/deriveViews/index.ts
Controller/commands/index.ts
View/EditorRoot/index.ts
View/commands/index.ts
View/views/index.ts
```

Facade rules:

- Imports from outside a Controller component must target that component's root facade.
- View implementation modules use direct local imports and must not import through View facades.
- Facade files may contain only comments and re-export declarations.
- `Shell/index.ts` may expose only the `WebViewShell` runtime entry.
- `View/EditorRoot/index.ts` may expose only the `EditorView` runtime entry.
- `Controller/ShinyController.tsx` may not directly call React `useState` or `useReducer`; the checker recognizes named, aliased, namespace, and default React imports for those calls.
- UI library folders are not facades. Root, wing, and tier barrels such as `ui/index.ts`, `ui/chrome/index.ts`, `ui/canvas/index.ts`, `ui/core/index.ts`, and `ui/**/{primitives,composites,templates}/index.ts` are prohibited.
- These root barrels are prohibited:
  - `Shell/WebViewShell/index.ts`
  - `View/index.ts`
  - `Controller/model/index.ts`
  - `shared/index.ts`

### 7.4 Execution

```text
npm run check:boundaries
```

The command exits with a non-zero status and reports each violating file, module specifier, and rule. It is included in `npm run check`.

The checker verifies module structure, protocol self-containment, synchronization of the duplicated protocol declarations, direct React `useState` / `useReducer` ownership in `ShinyController`, and the declared UI-library consumer boundaries. The state-hook check is intentionally narrow and covers direct React hook calls only; semantic state ownership hidden behind arbitrary custom hooks, component cohesion, interaction arbitration, whether the protocol expresses the correct product semantics, and component admission to the UI library remain review concerns.

## 8. Reference: terminology

### 8.1 Structural terms

| Term | Meaning |
| --- | --- |
| **Editor command transaction** | The View-to-Controller exchange unit: one user/editor action represented by one or more primitive `EditorCommand` values. |
| **Module** | One source file with its own import and export scope. |
| **Layer** | An ordered group of modules governed by one dependency direction. |
| **Component** | A cohesive group of modules with one public boundary and private implementation. |
| **React component subtree** | A React component and the child components, state, contracts, styles, and interactions it semantically owns. |
| **Shared contract area** | A non-layer component that defines vocabulary used by several consumers, such as `shared/` or `Controller/model/`. |
| **Boundary** | The public interaction point through which one runtime, layer, or component uses another. |
| **Contract** | The types and callable signatures that define a boundary. |
| **Protocol contract** | A self-contained JSON-compatible wire declaration defined independently and kept synchronized at both isolated runtimes. |
| **Facade** | A stable import surface that exposes selected definitions while hiding their physical location. |
| **Frontman** | The public runtime operation that coordinates a Controller component’s workers. |
| **Worker** | A private module implementing one part of a Controller component. |

### 8.2 Ownership

**Owns** means “is the authoritative semantic home.” The owner determines meaning, invariants, and evolution. The owner may be a module, component, layer, or shared contract area.

| Subject | Ownership means |
| --- | --- |
| **Type or contract** | Authority over its semantics, valid shape, and evolution. |
| **State** | Authority over its meaning, lifecycle, and valid transitions. Physical storage may be lifted elsewhere. |
| **Interaction** | Authority over the DOM or framework event surface where the handler is registered and interpreted. |
| **Command** | Authority over the canonical command shape belongs to the View command registry; authority over command derivation belongs to the View interaction boundary with enough context to emit the editor intent. |
| **Behavior** | Authority over the rule or decision being implemented, independent of where it is invoked. |

Ownership is not established by importing, constructing, storing, implementing, or re-exporting an artifact.

### 8.3 Definition and runtime verbs

| Verb | Meaning |
| --- | --- |
| **Defines** | Contains the source declaration or implementation. A facade that re-exports a declaration does not define it. |
| **Declares** | States a required contract, such as accepted arguments or an injected callback signature. |
| **Constructs / creates** | Produces a runtime value conforming to a contract. Construction does not imply ownership. |
| **Stores** | Retains a runtime value. Storage does not imply semantic ownership. |
| **Hosts state** | Stores state on behalf of its semantic owner, usually at a composition boundary. |
| **Manages state** | Applies the state’s lifecycle and transition rules. |
| **Implements** | Supplies executable behavior conforming to a declared contract. Implementation does not transfer contract ownership. |
| **Provides / injects** | Passes a value or callback implementation to another module. |
| **Registers** | Attaches a callback to a DOM, framework, or protocol event source. |
| **Handles** | Interprets an event and chooses the resulting state update or command transaction. |
| **Invokes** | Calls a function or injected callback. |
| **Emits** | Sends a normalized value through a callback, dispatch function, or event boundary. |
| **Returns** | Produces the direct result of a function call. |
| **Consumes** | Accepts and uses a public contract or value. |
| **Exposes** | Makes a definition available through a public boundary. |
| **Re-exports** | Exposes a definition from another module without acquiring ownership. |
| **Coordinates / orchestrates** | Sequences components and transfers data between them without absorbing their responsibilities. |
| **Translates / adapts** | Converts between representations at a boundary while preserving the represented semantics. |
| **Persists** | Writes a value to the authoritative durable store. |

Avoid **controls** in architectural descriptions unless its exact meaning is stated. Prefer **owns**, **stores**, **hosts**, **manages**, **provides**, **invokes**, or **coordinates**.

### 8.4 Applied examples

| Artifact | Defined by | Owned by | Constructed or hosted by | Consumed by |
| --- | --- | --- | --- | --- |
| `EditorCommand` | `View/commands/editorCommands.ts` | View command registry | View command-derivation helpers and interaction handlers | Controller Commands |
| `EditorCommandTransaction` | `View/commands/editorCommands.ts` | View-to-Controller command boundary | View command-derivation helpers and interaction handlers | `ShinyController` and Controller Commands |
| `ElementViews` and nested render contracts | `View/views/schema.ts` | View | Controller Derive Views | View components |
| Selected class IDs | `EditorRoot/useSelectedClassIds.ts` | `EditorView` | `EditorView` state, reconciled against each View model | `ClassDiagram`, `ClassBox`, `EditPane` |
| Class placement mode | `EditorRoot/placementMode.ts` | `EditorView` | `EditorView` state | `ToolPane`, `ClassDiagram`, `PlacementOverlay` |
| UI library elements | `ui/{chrome,canvas}/**` | UI library | UI library components and their private children | Shell and View, through declared wings |
| `SourceEdit` | Controller Commands | Controller Commands | Command handlers | Extension Bridge |
| Protocol message contracts | Independently in `webview/src/Bridge/protocol.ts` and `extension-host/protocol.ts` | Extension runtime boundary | Boundary adapters construct and validate protocol values | Opposite runtime boundary adapter |
