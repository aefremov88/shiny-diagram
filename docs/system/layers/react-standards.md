> **Implementation state:** Implemented and checker-enforced
> **Document state:** Maintained  
> **Scope:** `webview/src/View/**`  
> **Audience:** Coding agents  
> **Last reviewed:** 2026-06-29  
> **Goal** Must-follow rules of organization of code, dependencies and implementation patterns of domain components — the React component tree rooted at EditorRoot. The UI library is its own layer at `webview/src/ui`, governed entirely by [UI Library Standards](./UI-library-standards.md); other React components outside the EditorRoot tree may not comply

# 0. About the file

### 0.1 Navigation

- [0. About the file](#0-about-the-file)
	- [0.1 Navigation](#01-navigation)
	- [0.2 Key terms](#02-key-terms)
	- [0.3 Reference discipline](#03-reference-discipline)
- [1. React Component responsibilities and composition](#1-react-component-responsibilities-and-composition)
	- [1.1 React Component responsibilities](#11-react-component-responsibilities)
	- [1.2 Responsibilities composition in React Component](#12-responsibilities-composition-in-react-component)
- [2. Import rules](#2-import-rules)
	- [2.1 Allowed import sources](#21-allowed-import-sources)
	- [2.2 Forbidden import sources](#22-forbidden-import-sources)
- [3. Component receives](#3-component-receives)
	- [3.1 General receive rules](#31-general-receive-rules)
	- [3.2 Prop categories](#32-prop-categories)
	- [3.3 Responsibility prop contracts](#33-responsibility-prop-contracts)
- [4. Behavior activities implementation patterns](#4-behavior-activities-implementation-patterns)
	- [4.1 State creation](#41-state-creation)
	- [4.2 State initialization](#42-state-initialization)
	- [4.3 State reconciliation](#43-state-reconciliation)
	- [4.4 View and State slice props derivation](#44-view-and-state-slice-props-derivation)
	- [4.5 UI props derivation](#45-ui-props-derivation)
	- [4.6 Event handler props derivation](#46-event-handler-props-derivation)
	- [4.7 Registering keystroke listener](#47-registering-keystroke-listener)
	- [4.8 Implementing interaction through state update](#48-implementing-interaction-through-state-update)
	- [4.9 Implementing interaction through command transaction](#49-implementing-interaction-through-command-transaction)
	- [4.10 Child component routing](#410-child-component-routing)
- [5. Framework activities implementation patterns](#5-framework-activities-implementation-patterns)
	- [5.1 Framework prop and event adaptation](#51-framework-prop-and-event-adaptation)
	- [5.2 Framework-domain command adaptation](#52-framework-domain-command-adaptation)
- [6. Rendering activities implementation patterns](#6-rendering-activities-implementation-patterns)
- [7. Component organization](#7-component-organization)
	- [7.1 General rules](#71-general-rules)
	- [7.2 `<Component>.tsx`](#72-componenttsx)
	- [7.3 `state.ts`](#73-statets)
	- [7.4 `childProps.ts`](#74-childpropsts)
	- [7.5 `useInteractions.ts`](#75-useinteractionsts)
	- [7.6 `transactions.ts`](#76-transactionsts)
	- [7.7 `useStateReconciliation.ts`](#77-usestatereconciliationts)
	- [7.8 `frameworkAdapters.ts`](#78-frameworkadaptersts)
	- [7.9 No stylesheets](#79-no-stylesheets)
	- [7.10 `icons.ts`](#710-iconsts)
- [8. Component annotations](#8-component-annotations)
	- [8.1 File annotation](#81-file-annotation)
	- [8.2 Inline annotations](#82-inline-annotations)

### 0.2 Key terms

- **Responsibility** — a broad kind of work a React Component performs in View. Responsibilities describe what piece of work the component owns conceptually.
- **Activity** — a specific kind of work inside a responsibility. Activities are used to organize implementation rules.
- **Implementation pattern** — an allowed way to implement an activity in code. Implementation patterns are numbered and referenced by ID.
- **Domain component** — a component of the EditorRoot tree: the subject of this document. It owns editor semantics and composes its visible surface exclusively from library elements.
- **Library element** — a semantic-blind UI component of the UI library layer (`webview/src/ui`), governed by [UI Library Standards](./UI-library-standards.md). Wings (`chrome/`, `canvas/`), tiers, and element contracts are that document's vocabulary.
- **Situation vocabulary** — the library's option and variant names ("inline", "compact", "secondary"). Domain components translate editor facts into this vocabulary; they never pass visual values.

Hierarchy:

```txt
Responsibility
  → Activity
    → Implementation pattern
```
### 0.3 Reference discipline

1. Referable numbered implementation patterns use `<section-id>-<item-number>`, e.g. `4.6-3`, `5.2-1`.
2. Pattern IDs **may** be used alone as structural links, especially between Chapter 4-6 patterns and Chapter 7 file areas.
3. Chapter 7 areas **should** be referred to by file name and area name, e.g. `PlacementOverlay.tsx interactions area`.
4. Domain vocabulary **must** be written by name, not by ID: Behavior responsibility, Rendering responsibility, Framework adaptation responsibility, `view`, State slice, Event handler, UI prop.
5. In prose, review comments, migration notes, and execution planning, a pattern reference **should** include ID plus name when the name is needed for clarity:
	- `pattern 4.6-3 — derive all event handlers in useInteractions() hook`
	- `pattern 4.9-1 — derive transaction in transactions.ts and dispatch through useInteractions.ts`
6. When item order changes, affected references **must** be updated in the same edit.

# 1. React Component responsibilities and composition

### 1.1 React Component responsibilities

Every React Component in View declares the responsibilities it performs. A component may perform one responsibility or a controlled composition of several responsibilities.
#### Behavior responsibility

A React Component has Behavior responsibility when it owns or derives runtime behavior: state, child inputs, semantic event handling, state changes, command transactions, or child routing. Behavior is about what the component decides and how it reacts.
#### Rendering responsibility

A React Component has Rendering responsibility when it owns the composition of library elements into one visual surface: which elements appear, in which library template arrangement, under which situation variants, fed by which values. Rendering is about how already-decided values become visible interface; how anything looks is the library's — a domain component states no visual values, owns no stylesheet and no DOM, and its only styling channels are variant selection and data props — values the Property ownership table routes outside the library, passed for the element to apply: user style values to canvas elements, config-routed stacking values to overlay-capable elements. Content props — text and glyph descriptors — are not a styling channel: they select what to depict, never how it appears. Simply combining child components is not counted as rendering responsibility.
#### Framework adaptation responsibility

A React Component has Framework adaptation responsibility when it absorbs a foreign component or framework interface into View standard boundaries pattern. Framework adaptation translates framework props, events, state, coordinate spaces, or vocabulary into View contracts and domain terms.

### 1.2 Responsibilities composition in React Component

- A React Component **may** compose multiple responsibilities when the composition remains locally understandable, except for Framework adaptation activity 5.1 Framework prop and event adaptation, which **must not** be composed with any other responsibility
- A React Component **must** declare every responsibility it performs in the file annotation.
- Responsibility composition **must** be guided by readability and maintainability, and **must** avoid both failure modes:
	- **God component** — too many loosely related activities accumulated in one component.
	- **Indirection stack** — too many thin components created for narrow activities that are easier to understand locally.
- Preferred responsibility compositions:
	- **Isolated responsibility** — one clear responsibility large enough to justify its own component.
		- Example: framework prop and event adaptation encapsulated in one component isolates the framework contract and keeps the React tree readable.
	- **Tightly coupled responsibilities** — several responsibilities aimed at one local UI goal and easier to understand together than split apart.
		- Example: rendering a button with unique local behavior.
- When one responsibility becomes substantial enough to obscure another, the component **must** split the substantial responsibility into an owned child React Component or an approved support file.
- Responsibility composition **must** reduce local clarity cost. It **must not** be used to justify large mixed components.

# 2. Import rules

### 2.1 Allowed import sources

1. `webview/src/shared` — dependency-free primitives: branded diagram identities and their constructors, spatial primitives, UML class-diagram notation, visual styling vocabulary, glyph geometry descriptors, and editor-supported node kinds
	- these primitives **must not** be redefined anywhere in code
	- a new primitive **may** be added if it has potential reuse and fits the definition of a shared primitive

2. `webview/src/View/views/schema.ts` — the authoritative view render tree: one nested tree of immutable view types, carrying facts about the diagram itself — its elements and their position, size, and style — never facts about the editing session, such as selection, placement, or current drag position.
	- the **only** declaration of view shapes
	- used for constructing a `view` prop type by a component by slicing corresponding source view type

3. `webview/src/View/state/editorStates.ts` — the state ledger: a flat list of editor state shapes (selection, placement, transient element position), each annotated with its owning component
	- the **only** declaration of editor state shapes
	- used to construct a component's State slice prop type by slicing the corresponding source state type
	- type-**only**: contains state shapes, never runtime state
	- **must not** include local view state — state no other component reads and with no editor consequence; that type is declared in its owner component, not here

4. `webview/src/View/commands/editorCommands.ts` — the canonical command registry defining (a) primitive editor-domain command shapes, each encapsulating an atom of user intent, and (b) the `EditorCommandTransaction` type combining those primitives to communicate a complex user intent to the Controller.
	- **the only** source of command shapes
	- command and transaction types are **never** defined locally
	- a primitive command **may** be added **only** if it cannot be expressed as a combination of existing primitives

5. `webview/src/ui` — the UI library layer: tiered, editor-blind UI elements owning shared visuals and interaction behavior; governed by [UI Library Standards](./UI-library-standards.md)
	- the **only** source of cross-component shared visual components
	- domain components import from the `chrome/` and `canvas/` wings; `core/` is library-internal and never exposed outside `webview/src/ui`
	- a library component and its boundary types are importable; its owned children, internal files, and `.module.css` are not

6. `webview/src/View/config` — static View configuration read by components and support files.
	- `editorUiConfig.ts` defines static scalar UI tuning constants: e.g. fixed offsets, sizes, stacking planes. These scalar constants **must** be defined here and read from here, **never** hard-coded at the use site. Stacking values reach a library element as a data prop, never through domain-authored styling. Component-owned static content catalogs — typed `readonly` domain literals — are **not** UI constants and stay in their component's static catalog area.
	- `reactFlowConfig.ts` defines the application-level React Flow boundary policy: static React Flow prop objects that disable framework-owned editor behavior not delegated to React Flow.

7. `webview/src/View/utils/<utilityName>.ts` — centralized View utilities: pure, framework-independent functions used by multiple components, or algorithms that require separate testing and development cycle, e.g. a layout algorithm.
	- new utilities **must not** be introduced as part of React Component development or refactor; they must be added separately

8. `webview/src/View/contexts` — exposes `useDispatchTransaction`, the consumer hook for the single `EditorDispatch` channel carrying command transactions to the Controller
	- **the only** dispatch hook; **the only** non-prop transport in View

9. **own children** — components it exclusively owns, each nested one level inside its folder as `ChildName/ChildName.tsx`
	- **only** the child component export; **never** its types, support files, or any other folder internals

10. **approved third-party framework libraries** — the framework component and its utilities
	- **must only** be imported by files that implement Framework adaptation responsibility

11. **React and browser APIs** — rendering, lifecycle, focus, measurement, event registration.

12. **own support files** — `state.ts`, `transactions.ts`, `useInteractions.ts`, `childProps.ts`, `useStateReconciliation.ts`, `frameworkAdapters.ts`, `icons.ts` sitting flat beside the component file
	- a component imports **only** its own support files, **never** another component's.

13. `webview/src/shared/logging` — the structured development-session logging module.

### 2.2 Forbidden import sources

1. any layer above the `View` layer — `Controller`, `Shell`, `Bridge` — dependencies between layers point strictly inward
2. another component's internal support files
3. a sibling, parent, or any non-owned component — shared components are reached only through `webview/src/ui`.
4. a third-party framework library, when the file does not implement Framework adaptation responsibility.

# 3. Component receives

### 3.1 General receive rules

1. A React component **must** receive **only** the minimum props its function requires.
2. Every prop except for framework-shaped props **must** belong to one of the prop categories in 3.2. A React component **must not** receive any other prop shape.
3. A React component **must** follow the responsibility prop contract in 3.3 for its declared responsibilities.

### 3.2 Prop categories

1. **`view`** — a slice of the view render tree: the diagram facts this React component renders.
	- **must** be a schema shape — a node, a `Pick` of one, or an array of nodes; **never** a redefined or new shape.
	- Editor state **may** drive *which* elements the slice contains, e.g. only selected classes, but **must not** appear anywhere in the `view` type.
	- The schema node chosen for composing **must** match the prop meaning: a collection takes an array of the node, e.g. `ClassView[]`; a single element takes that node or a `Pick` of it.

2. **State slice** — a slice of editor state the parent owns or holds: the session state this React component reads.
	- **must** be typed as a ledger shape or a `Pick` of one.
	- The owner passes a slice of state it owns; a non-owner passes through the slice it received.
	- Only the owner mutates the state. Descendants receive it read-only.
	- A whole ledger shape is named after the state, e.g. `selectionState`; a slice is named for its meaning, e.g. `selectedClassIds`.

3. **Event handler** — a callback the parent provides for this React component to invoke: the channel by which it requests a change.
	- **must** be a function prop.
	- **may** take normalized data supplied by the React component, e.g. `onCommit(value)`.
	- The React component **must** only invoke the handler; it **must not** decide what the handler does.
	- The parent handler sends a transaction, requests an owned-state change, or propagates the request further up.
	- **must** be named `on<Event>`, e.g. `onSelectionChange`, `onCommit`.

4. **UI prop** — an already-decided render value that is not a schema slice or ledger slice.
	- **must** be ready to render when received.
	- **must** be computed by the parent that owns the decision; the receiving React Component with Rendering responsibility renders it and **must not** compute it itself.
	- **must** be a primitive, shared-vocabulary shape, or glyph descriptor. A glyph descriptor is content data, in the same category as a text label — it selects what to depict, never how it appears.
	- **must** be named for what it controls in the output, not the condition that set it, e.g. `isResizeVisible`, not `isSoleSelection`.
	- **must not** contain editor state, although it **may** be derived from editor state. Anything referencing selection, placement, or session state is a State slice, not a UI prop.

### 3.3 Responsibility prop contracts

1. **Component implementing Behavior responsibility**
	- **may** receive `view`, State slice, and Event handler props.
	- **may** receive UI props only when composed with Rendering responsibility.
	- **must not** receive framework-shaped props.

2. **Component implementing Rendering responsibility**
	- **may** receive `view`, State slice, Event handler, and UI props.
	- **must** treat received UI props as already-decided render values.
	- **must not** compute UI props from editor state unless composed with Behavior responsibility.

3. **Component implementing Framework adaptation responsibility**
	- **may** receive `view`, State slice, Event handler, and UI props on its View-facing boundary.
	- **may** receive framework-shaped props on its framework-facing boundary.
	- **must not** receive framework-shaped props on its View-facing boundary.
	- **must** translate framework-shaped props internally or through `frameworkAdapters.ts`.

4. **Component implementing multiple responsibilities**
	- **may** receive the union of prop categories allowed by the responsibilities it declares.

# 4. Behavior activities implementation patterns

### 4.1 State creation

Creating the runtime state slot owned by the current component.

Owned state is runtime state. A state shape **may** come from the state ledger, or it **may** be local view state owned only by one component. The raw state setter **must** stay inside the owning component and its own support files. Children receive state as sliced props and request changes through semantic event handlers.

**Pattern allowed:**

1. **`useState` in component file**
    - create the state slot in the owning component. **Location:** `<Component>.tsx`
    - raw setter **must not** be passed to children
    - **naming:** 
	    - state binding is named by the state domain + `State` suffix, e.g. `selectionState`, `nodePlacementState`
	    - raw setter keeps the React setter form, e.g. `setSelectionState`
	    
### 4.2 State initialization

Producing the initial value used when owned state is created. State owner **must** produce an initial value of the owned state shape. The state ledger defines semantic state types only and **must not** contain runtime defaults or constructors.

**Patterns allowed:**

1. **inline value in `useState`**
    - pass the initial value directly to `useState`. **Location:** `<Component>.tsx`
    - **when:** the value is small, obvious, and used for local view state or simple ledger-backed state
2. **initializer function in `state.ts`**
    - export a pure `toInitial<StateName>(...)` function. Return type: ledger-backed state returns the ledger shape, local view state returns the locally declared shape. **Location:** `state.ts`
    - import initializer function into the owning component and pass its result to `useState`. **Location:** `<Component>.tsx`
    - **naming:** initializer function is named `toInitial<StateName>(...)`, e.g. `toInitialSelectionState(...)`, `toInitialNodePlacementState(...)`
    - **when:** ledger-backed state initialization needs construction, shared defaults, view-derived setup, or independently-tested vocabulary; local state needs complex initializer function

### 4.3 State reconciliation

Repairing owned state after the incoming `view` prop changes. It keeps owned state valid against the latest canonical view. It **must** run in the state owner. It **must not** issue Controller commands, route children, or derive child props.

**Pattern allowed:**

1. **hook in `useStateReconciliation.ts`**

	- export a single `useStateReconciliation(...)` hook that uses `useEffect` and possibly private helpers to repair owned state after relevant `view` inputs change. **Location:** `useStateReconciliation.ts`
	- call the hook unconditionally after state creation. **Location:** `<Component>.tsx`
	- **naming:** hook is named `useStateReconciliation(...)`

### 4.4 View and State slice props derivation

A child's `view` or state prop is produced by **slicing** what the parent holds. A slice **only** narrows — field access, array selection, or a membership filter that preserves the schema/ledger shape; it adds, renames, or wraps **nothing**.

**Patterns allowed:**

1. **inline slice** 
	- write the slice directly at the prop, e.g. `view={view.diagram}`, `view={view.classes}`. **Location:** `<Component>.tsx`
	- **when:** the slice is a single field access, array field, or pass-through

2. **slice binding derived in component file**
	- assign the slice to a binding named for what it carries. **Location:** `<Component>.tsx`
	- pass the binding to the prop. **Location:** `<Component>.tsx`
	- **naming:** 
		- the binding is named for its contents (e.g. `selectedClasses`)
		- the prop it feeds keeps its role name (`view` and `nameState` for state prop)
	- **when:** the slice value needs an expression — a filter or combined narrowing expression — too large or reused to read inline

3. **slice builder in `childProps.ts` passed inline**
	- export a pure function that returns the slice. Return type is a schema/ledger shape, **not** imported from a child. **Location:** `childProps.ts`
	- pass the function call directly to the prop. **Location:** `<Component>.tsx`
	- **naming:** slice builder is named for the slice it returns with prefix `to`, e.g. `toSelectedClasses(...)`, `toSelectedClassIds(...)`
	- **when:** the slice needs a substantial or independently-tested expression, justifying extraction from the component body

### 4.5 UI props derivation

Deriving an already-decided render value for a React Component with Rendering responsibility.

A UI prop is produced by **computing** a rendered value from the parent's view props, internal state props, or owned state. It **must** be ready to render when received by the React Component with Rendering responsibility; the child renders it and does not modify it further

**Patterns allowed:**

1. **inline primitive UI prop**
    - pass a literal or already-decided primitive directly at the prop, e.g. `label="Delete class"`, `tone="danger"`. **Location:** `<Component>.tsx`
    - **when:** the value is static, obvious, and not derived from editor state

2. **UI prop binding derived in component file**
    - assign the UI value to a binding named for what it controls in the rendered output. **Location:** `<Component>.tsx`
    - pass the binding to the prop. **Location:** `<Component>.tsx`
    - **naming:** the binding is named by rendered meaning, not by the condition that produced it, e.g. `isResizeVisible`, not `isSoleSelection`
    - **when:** the value depends on view props, internal state props, owned state, or a small branch

3. **single UI prop builder in `childProps.ts`**
    - export a pure function that returns *single UI-prop value*. Return type is constructed right above export function and **not** imported from a child. **Location:** `childProps.ts`
    - pass the function call directly to the child prop. **Location:** `<Component>.tsx`
    - **naming:** prop builder is named for the prop value it returns with prefix `to`, e.g. `toDeleteLabel(...)`, `toPickerValue(...)`, `toIsResizeVisible(...)`
    - **when:** only one derived UI prop is needed and derivation needs a substantial or independently-tested expression, justifying extraction from the component body
    
4. **UI prop object builder in `childProps.ts`**
    - export a pure function that returns *a plain UI prop object* (only UI props, other types of props **must not** be bundled). Return type is constructed right above export function and **not** imported from a child. **Location:** `childProps.ts`
    - assign the result of a function call to a named binding. **Location:** `<Component>.tsx`
    - pass the named binding to the child by spreading it. **Location:** `<Component>.tsx`
    - **naming:** 
	    - if child has only UI props: builder function is named `to<ChildName>Props(...)`; binding is named `<childName>Props`, e.g. `classSelectionSummaryProps`, `classStyleControlsProps`
	    - if child has multiple UI props + other props: builder function is named `to<ChildName>UIProps(...)`; binding is named `<childName>UIProps`
    - **when:** multiple UI props are derived and derivation needs a substantial or independently-tested expression, justifying extraction from the component body

### 4.6 Event handler props derivation

Providing a child the callback by which it requests a change. The child **must** invoke the handler with normalized data; the parent decides whether that request becomes a command, an owned-state change, or another request propagated upward.

**Patterns allowed:**

1. **inline pass-through handler**
    - pass an already-received handler directly to the child prop. **Location:** `<Component>.tsx`
    - **naming**: remains the same as received
    - **when:** the parent adds no decision, normalization, command dispatch, state-change behavior, or argument adaptation
2. **event handler binding defined in component file**
    - assign the handler to a binding named by the event the child reports. Raw DOM event adapters may remain inline at the rendering boundary only when they perform mechanical event extraction/normalization and immediately call a semantic handler. **Location:** `<Component>.tsx`
    - pass the binding to the child prop. **Location:** `<Component>.tsx`
    - **naming:** handler is named `on<Event>`, e.g. `onPlacementCommit`, `onClassResize`, `onSelectionChange`; handler **must not** be named by its state effect, e.g. `setPlacementState`, `clearSelection`
    - **when:** the handler performs a small local argument adaptation or delegates to an owner callback without needing a separate interaction pipeline
3. **derive all event handlers in `useInteractions()` hook**
    - export a single `useInteractions(...)` hook that returns **all required semantic ShinyView** event handlers for the component's children with the **exception of** pass-through handlers. Raw DOM event adapters may remain inline at the rendering boundary only when they perform mechanical event extraction/normalization and immediately call a semantic handler. **Location:** `useInteractions.ts`
    - call the hook and assign the result to named handler bindings. **Location:** `<Component>.tsx`
    - pass the returned handlers to child props. **Location:** `<Component>.tsx`
    - Once a component uses `useInteractions()`, all non-pass-through handlers must live there
    - **naming:** 
	    - hook is named `useInteractions(...)`
	    - return type of a hook is named `Interactions`
	    - returned handlers are named `on<Event>`, e.g. `onFillColorChange`, `onDuplicate`
    - **when:** a handler issues a Controller command or event-handler code is too large to keep the component body readable.
4. **log completed interaction in `useInteractions()` hook**
    - call `logAction` inside the semantic interaction handler after the interaction completes. **Location:** `useInteractions.ts`
    - log only the interaction name, target, and final values; never intermediate drag or resize values

### 4.7 Registering keystroke listener

Registering a browser-level keyboard listener for a semantic action owned by the current component. Keystrokes **must** be registered in the interaction layer of the component that owns the same semantic action.

**Pattern allowed:**

1. **keystroke listener registered in component file**
    - register and clean up the keystroke listener with `useEffect`. **Location:** `<Component>.tsx`
    - implement the browser listener inside the effect and call the semantic `on<Event>` handler it triggers
    - browser-event handling stays at the browser listener boundary: key matching, modifier matching, ignored-target checks, `preventDefault()`, and other DOM-event mechanics must be performed before calling the semantic interaction handler. The listener may use shared View utilities for reusable browser-event predicates.
    - semantic action logic, state update, and command transaction dispatch stay in the semantic handler implemented by patterns in  4.6, 4.8, 4.9
    - **naming:**
	    - browser listener is named by the browser event, e.g. `handleKeyDown`
	    - semantic handler keeps `on<Event>` naming, e.g. `onClassDelete`
    - **when:** a keystroke triggers a semantic action owned by this React component
### 4.8 Implementing interaction through state update

Changing owned state after a semantic request from the component itself or one of its children.

State updates happen in the state owner. Children report events through semantic handlers; the owner decides how those events change state. Raw setters, state-action dispatch, and state-action Context **must not** be used as child interfaces.

**Patterns allowed:**

1. **update state inside handler defined in component file**
    - execute state update inside `on<Event>` handler, implemented by the pattern 4.6-2. **Location:** `<Component>.tsx`
    - **naming:** defined as a part of 4.6-2 pattern
    - **when:** the state update is small and readable inside the owner component
    
2. **update state inside `useInteractions.ts`**
    - execute state update inside `useInteractions()` hook (with optional private helpers), implemented by the pattern 4.6-3. **Location:** `useInteractions.ts` 
    - **naming:** defined as a part of 4.6-3 pattern
    - **when:** state-update handler code is too large, too numerous, or shared with other interaction wiring

### 4.9 Implementing interaction through command transaction

Emitting a command transaction to a controller from semantic intent event handlers.

**Patterns allowed:**

1. **derive transaction in `transactions.ts` and dispatch through `useInteractions.ts`**
    - construct pure transaction builder function `to<SemanticIntent>Transaction(...)`, that imports command shapes from central command registry `editorCommands.ts` and combines one or more commands into a transaction to fulfill semantic intent of event handler. **Location:** `transactions.ts`
    - call transaction builder from event handler implementation and dispatch the result through `useDispatchTransaction`. **Location:** `useInteractions.ts`. Event handlers, requiring dispatching transactions **must** be defined inside `useInteractions.ts` (pattern 4.6-3) and never in main components function; they may also update owned state there
    - **naming:** transaction builder is named `to<SemanticIntent>Transaction(...)`, e.g. `toClassDeleteTransaction(...)`, `toFillColorSetTransaction(...)`

### 4.10 Child component routing

Choosing which child interface renders, from a discriminated view or a derived scenario.

**Patterns allowed:**

1. **inline binary select**	
	- select the child interface inline with a ternary over a derived condition. **Location:** `<Component>.tsx`	
	- the routing condition **may** be assigned to a named binding before `return` when it is non-obvious or reused. **Location:** `<Component>.tsx`	
	- **naming:** routing condition binding is named by the interface decision, e.g. `shouldRenderEditPane`, `shouldRenderPlacementOverlay`	
	- **when:** exactly two branches
2. **exhaustive switch + named binding**
	- assign the selected interface to a binding via an exhaustive `switch` over the view discriminant. **Location:** `<Component>.tsx`
	- render the binding. **Location:** `<Component>.tsx`
	- **when:** more than two branches, or a discriminated view (e.g. `view.status`)

# 5. Framework activities implementation patterns

Framework adaptation absorbs a foreign framework interface into View. A framework-shaped value **must** be translated into View vocabulary before it is used as View props, state, or command payload.

### 5.1 Framework prop and event adaptation

Adapting props and event payloads across a framework boundary. Might be applied in one of two directions:
- View props and Event handlers → framework props and callbacks. Before a value crosses from View to the framework, it **must** be converted to the framework shape.
- Framework props and event payloads → View props and Event handlers. Before a value crosses from the framework to View, it **must** be converted to the View shape.

This activity **must** be encapsulated in a React Component with only Framework adaptation responsibility, acting as a pure adapter between components with different boundary contracts.

**Patterns allowed:**

1. **inline framework prop and event adaptation**
    - adapt values directly in the adapter component. **Location:** `<Component>.tsx`
    - **naming:**
	    - framework-bound values use framework vocabulary
	    - View-bound values use View vocabulary
    - **when:** adaptation is small and local to one framework component

2. **framework prop and event builders in `frameworkAdapters.ts`**
    - export pure prop and event payload builder functions. **Location:** `frameworkAdapters.ts`
    - call builders from the adapter component. **Location:** `<Component>.tsx`
    - **naming:**
	    - View → framework builders are named `to<FrameworkPropsName>(...)`
	    - framework → View builders are named `to<ViewPropsName>(...)`
    - **when:** adaptation is substantial, repeated, or needs isolated testing

### 5.2 Framework-domain command adaptation

Translating framework-domain interaction facts into View command facts before command transaction construction.

A framework-domain command adaptation **must** make the domain transition explicit. The transaction builder receives View command facts, not framework-shaped facts.

**Patterns allowed:**

1. **framework-domain adapter function before transaction builder**
    - export pure adapter functions that translate framework-domain values into View command facts. **Location:** `frameworkAdapters.ts`
    - call adapter functions before calling a transaction builder. **Location:** `useInteractions.ts`
    - call the transaction builder only with View-domain values. **Location:** `transactions.ts`
    - identity mappings **must** still go through an adapter function when the source value is framework-domain, e.g. React Flow canvas point to View diagram point
    - **naming:**
	    - adapter functions are named by the View value they produce, e.g. `toDiagramPoint(...)`, `toDiagramRect(...)`
	    - when the source is not obvious from the file context, include the source domain, e.g. `toDiagramPointFromReactFlowPoint(...)`
	    - transaction builders keep command naming, e.g. `toClassCreateTransaction(...)`
    - **when:** a framework event, coordinate, state snapshot, or interaction fact contributes to a View command transaction

# 6. Rendering activities implementation patterns

No fixed patterns yet

# 7. Component organization

### 7.1 General rules

- A component folder **must** contain **only** files from the closed set detailed in this chapter, fixed by the component's responsibilities and the patterns it applies. It is applied to all React component folder in a tree rooted at EditorRoot, with one exception of `EditorRoot/index.ts` 
- Chapter 7 defines code order based on activity implemented by that code. File and inline annotations are defined by Chapter 8.
- Areas **must** be written strictly in described order. Unused areas are **omitted**.
- Functions named in patterns — the component, a `to<X>` builder, a `use<X>` hook — **may** carve out **private helpers**. Functions described in patterns, e.g. `useInteractions`, **are not** private helpers and the following rules do not apply to them:
    - a private helper is **pure**;
    - carve out **only** when the expression branches, iterates, repeats, or merits isolated testing — otherwise keep it inline;
    - a private helper stays in its caller's file in the private helper area;
    - private helpers are **never** exported.
- Private helpers are layered **after** their caller — entry first, the helpers it calls next, deeper layers after — and a helper **must not** sit above its caller. This governs every file.
- Private helper-only types **must** be declared immediately above the helper or helper layer that uses them.

### 7.2 `<Component>.tsx`

**Responsibilities:** Behavior, Rendering, Framework adaptation

**Patterns:** all

**Structure:**
```ts
/**
 * @behavior <behavior this component owns>
 * @render <visual surface this component renders>
 * @framework <framework/domain boundary this component adapts>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * This component's own `Props` type, named <Component>Props
 * Any local payload type (e.g. normalized event data).
 */

/** ── static catalog area ──
 * Component-owned static content catalogs: typed `readonly` domain literals this
 * component renders. Single-use, no cross-component reuse.
 * Scalar UI tuning values are NOT defined here — see 2.1-6 (editorUiConfig.ts). 
 */

export default function <Component>({ ... }: <Component>Props): ReactElement {

/** ── state creation area ──
 * Patterns: 4.1-1, 4.2-1
 */

/** ── state reconciliation area ──
 * Patterns: 4.3-1
 */

/** ── child props derivation area ──
 * Patterns: 4.4-2, 4.4-3, 4.5-2, 4.5-3, 4.5-4
 */

/** ── interactions area ──
 * Patterns: 4.6-2, 4.6-3, 4.8-1
 */

/** ── keystroke listener registration area ──
 * Patterns: 4.7-1
 */

/** ── routing area ──
 * Patterns: 4.10-1, 4.10-2
 */

  return ( ... );
}

/** ── private helper area ──
 */
```

### 7.3 `state.ts`

**Responsibilities:** Behavior

**Patterns:** 4.2-2

**Structure:**
```ts
/**
 * @behavior <state initialized and inputs that shape it>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * Boundary types owned by this file:
 * - exported function return object types, when needed;
 * - exported function input payload types, when the parameter list would otherwise become unreadable;
 * - local state shapes owned by this component and not declared in the state ledger.
 */

/** ── state initializer area ──
 * Patterns: 4.2-2
 * Functions: toInitial<StateName>(...)
 */

/** ── private helper area ──
 */
```

### 7.4 `childProps.ts`

**Responsibilities:** Behavior

**Patterns:** 4.4-3, 4.5-3, 4.5-4

**Structure:**
```ts
/**
 * @behavior <child props this file derives with derivation logic>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * Boundary types owned by this file:
 * - exported function return object types for UI prop bundles;
 * - exported function input payload types, when the parameter list would otherwise become unreadable.
 */

/** ── view slice area ──
 * Patterns: 4.4-3
 * Functions: to<SliceName>(...)
 */

/** ── state slice area ──
 * Patterns: 4.4-3
 * Functions: to<SliceName>(...)
 */

/** ── single UI prop area ──
 * Patterns: 4.5-3
 * Functions: to<UIPropName>(...)
 */

/** ── UI prop object area ──
 * Patterns: 4.5-4
 * Functions: to<ChildName>UIProps(...), to<ChildName>Props(...)
 */

/** ── private helper area ──
 */
```

### 7.5 `useInteractions.ts`

**Responsibilities:** Behavior, Framework adaptation 

**Patterns:** 4.6-3, 4.8-2, 4.9-1, 5.2-1

**Structure:**
```ts
/**
 * @behavior <semantic interactions this file implements and owned state this file updates - only when applicable>
 * @framework <framework/domain boundary this file adapts - only when applicable>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * Boundary types owned by this file:
 * - `Interactions`, the object returned by `useInteractions`;
 * - hook input object types, when the parameter list would otherwise become unreadable;
 * - normalized interaction payload types produced inside this file.
 * type Interactions = {
 *    on<Event>: (...args: ...) => void;
 * };
 */

/** ── interaction hook area ──
 * Patterns: 4.6-3, 4.8-2, 4.9-1, 5.2-1
 * Function: useInteractions(...)
 */

/** ── private helper area ──
 */
```

### 7.6 `transactions.ts`

**Responsibilities:** Behavior

**Patterns:** 4.9-1

**Structure:**
```ts
/**
 * @behavior <command transactions this file derives>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * Boundary types owned by this file:
 * - exported function input payload types, when the parameter list would otherwise become unreadable 
 * (return types of exported functions **must not** be defined here and instead be imported from
 * webview/src/View/commands/editorCommands.ts)
 */

/** ── transaction builder area ──
 * Patterns: 4.9-1
 * Function: to<SemanticIntent>Transaction(...)
 */

/** ── private helper area ──
 */
```

### 7.7 `useStateReconciliation.ts`

**Responsibilities:** Behavior

**Patterns:** 4.3-1

**Structure:**
```ts
/**
 * @behavior <owned state reconciled and why reconciliation is needed>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * Boundary types owned by this file:
 * - hook input object types, when the parameter list would otherwise become unreadable;
 * - local repair result types, when reconciliation calculates an intermediate repair object.
 */

/** ── state reconciliation hook area ──
 * Patterns: 4.3-1
 * Function: useStateReconciliation(...)
 */

/** ── private helper area ──
 */
```

### 7.8 `frameworkAdapters.ts`

**Responsibilities:** Framework adaptation

**Patterns:** 5.1-2, 5.2-1

**Structure:**
```ts
/**
 * @framework <source framework/domain shape to target View/framework shape>
 */

/**
 * ── import area ──
 * Sources fixed by Chapter 2.
 */

/** ── type area ──
 * Boundary types owned by this file:
 * - exported adapter function input payload types, when the parameter list would otherwise become unreadable;
 * - exported adapter function return object types, when the adapted shape needs a named local return type.
 */

/** ── framework prop and event adaptation area ──
 * Patterns: 5.1-2
 * Functions: to<FrameworkPropsName>(...), to<ViewPropsName>(...)
 */

/** ── framework command adaptation area ──
 * Patterns: 5.2-1
 * Functions: to<ViewCommandInputName>(...)
 */

/** ── private helper area ──
 */
```

### 7.9 No stylesheets

Domain components own no `.module.css`: chrome domain components compose library elements and arrangement belongs to templates; canvas domain components assemble canvas library elements. All styling authority is the library's ([UI Library Standards](./UI-library-standards.md)).

### 7.10 `icons.ts`

**Responsibilities:** none — a data catalog, not an implementation file

Component-owned glyph descriptors passed into library icon and marker slots: pure geometry data typed by the shared glyph descriptor shape. An extension of the static catalog area, justified only when descriptor bulk would obscure the component file. The domain authors what to depict; the library element receiving a descriptor authors all appearance — wrapper, stroke language, color.

**Patterns:**

1. Exported `readonly` descriptors typed by the shared glyph descriptor shape; the file renders nothing and imports nothing but `shared/`
2. Geometry on the 16-grid: whole or half-pixel coordinates; exact coordinates always
3. Codicons/Lucide proportions as the metrics reference
4. A descriptor carries geometry, the filled/stroked flag, and, for marker use, an anchor point — it **must not** carry stroke widths, colors, sizes, or any other appearance field
5. **naming:** descriptors are named by what they depict in domain terms, e.g. `compositionGlyph`, `inheritanceGlyph` — the semantic name is the point of domain ownership

# 8. Component annotations

### 8.1 File annotation

Every implementation file **must** open with exactly one file annotation block. The annotation **must** explain what this file does. It **must not** restate the file type or use `@responsibilities`.

#### `<Component>.tsx`

Use only lines that apply.

```ts
/**
 * @behavior <behavior this component owns>
 * @render <visual surface this component renders>
 * @framework <framework/domain boundary this component adapts>
 */
```

Good:

```ts
/**
 * @behavior Active placement tool selection.
 * @render Diagram creation tool palette.
 */
```

Good:

```ts
/**
 * @behavior Pointer lifecycle for class placement.
 * @render Placement draft rectangle overlay.
 * @framework React Flow canvas coordinates to View diagram placement.
 */
```

Bad — restates categories without saying what the component does:

```ts
/**
 * @behavior Component behavior.
 * @render Component rendering.
 */
```

#### `state.ts`

```ts
/**
 * @behavior <state initialized and inputs that shape it>
 */
```

Good:

```ts
/**
 * @behavior Initial ClassBoxPlacementState from class view rectangles.
 */
```

Bad — too generic:

```ts
/**
 * @behavior Initial state helper.
 */
```

#### `childProps.ts`

```ts
/**
 * @behavior <child props this file derives with derivation logic>
 */
```

Good:

```ts
/**
 * @behavior Filters selected classes from the diagram view using SelectionState and derives render-ready edit panel props.
 */
```

Bad — restates bindings instead of explaining the derivation:

```ts
/**
 * @behavior Selected class view and edit panel UI prop derivation.
 */
```

#### `useInteractions.ts`

```ts
/**
 * @behavior <semantic interactions this file implements>
 * @state <owned state this file updates - only when applicable>
 * @framework <framework/domain boundary this file adapts - only when applicable>
 */
```

Good:

```ts
/**
 * @behavior Class placement and deletion semantic handlers.
 * @state Active class placement state updates.
 */
```

Good:

```ts
/**
 * @behavior Placement drawing pointer lifecycle.
 * @framework React Flow canvas coordinates to View diagram placement.
 */
```

Bad — too generic:

```ts
/**
 * @behavior Interactions.
 */
```

Bad — hides state update:

```ts
/**
 * @behavior Placement handlers.
 */
```

#### `transactions.ts`

```ts
/**
 * @behavior <command transactions this file derives>
 */
```

Good:

```ts
/**
 * @behavior Class creation and class deletion transaction derivation.
 */
```

Bad — too generic:

```ts
/**
 * @behavior Transactions.
 */
```

#### `useStateReconciliation.ts`

```ts
/**
 * @behavior <owned state reconciled and why reconciliation is needed>
 */
```

Good:

```ts
/**
 * @behavior SelectionState reconciliation when selected classes disappear from view.
 */
```

Good:

```ts
/**
 * @behavior Keeps ClassBoxPlacementState aligned with the current class views by adding new class
 * placements and removing deleted class placements.
 */
```

Bad — does not explain why reconciliation exists:

```ts
/**
 * @behavior State reconciliation.
 */
```

#### `frameworkAdapters.ts`

```ts
/**
 * @framework <source framework/domain shape to target View/framework shape>
 */
```

Good:

```ts
/**
 * @framework View class boxes to React Flow nodes.
 */
```

Good:

```ts
/**
 * @framework React Flow canvas coordinates to View class creation rectangle.
 */
```

Bad — too generic:

```ts
/**
 * @framework React Flow adapter helpers.
 */
```

### 8.2 Inline annotations

Inline annotations mark source-code blocks that implement responsibility activities inside a file. Inline annotations are source comments, not Chapter 7 area names.

**General rules:**

- Every implemented activity area **must** have an inline annotation, except areas explicitly listed below as having no annotation.
- Private helper area **must** have inline annotation
- Import area, type area, component declaration area, render return area, static catalog area **must not** have inline annotations.
- "State creation" area **must** include clarification whether it is local or ledger state
- There **must** be an empty line before an inline area annotation, except when the annotation is the first statement inside a function body, because Prettier removes that leading blank line.
- Other ordinary code comments are allowed when they follow general coding rules.
- Existing ordinary code comments **must not** be erased only because they are not standard Component annotations.

**Short area annotation format:** `<area name from chapters 4-6>` 

- If area formally covers two activities, e.g. state creation and state initialization - only the first in order **must** be written

Good:

```ts
// State reconciliation
```

Bad - includes redundant word "area"

```ts
// State reconciliation area
```

Bad - no annotation of or inside return area is allowed 

```ts
// UI props derivation
return (
    <PaneSection label={sectionLabel}>
      <CommitTextField
```

**Long area annotation format:** `<area name from chapters 4-6>: <non-obvious implementation details>`

- If area formally covers two responsibilities, e.g. state creation and state initialization - only the first in order **must** be written

Good:

```ts
  /** State creation: local states - draw gesture anchor and current placement outline */
  const [origin, setOrigin] = useState(() => toInitialOrigin());
  const [draftRect, setDraftRect] = useState(() => toInitialDraftRect());
```

Bad - mentions two actions for one area

```ts
  /** State creation: local states - draw gesture anchor and current placement outline 
   *  State initialization
   */
  const [origin, setOrigin] = useState(() => toInitialOrigin());
  const [draftRect, setDraftRect] = useState(() => toInitialDraftRect());
```

**Private helper area annotation**: `// Private helpers`

- No other details for area to be provided
- Individual clarifying comments **may** be provided as part of general coding practices
