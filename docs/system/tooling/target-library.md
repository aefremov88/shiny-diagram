# Target Library

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-19  
> **Scope:** Shiny-specific target queries used with `vscode-custom-editor-harness`

The target library adapts Shiny's semantic editor interface to the generic `ElementTarget` contract of `vscode-custom-editor-harness`.

Its contents are Shiny-specific target queries. Generic gestures, waiting, VS Code control, document access, screenshots, and scenario execution are provided by the harness.

## 1. Source of truth

`docs/product/editor-interface.md` is the source of truth for target names, addresses, and composition.

The target library implements that interface against Shiny's rendered DOM. Each target address defined by the editor interface has a corresponding target query that:

- resolves the semantic address to the current DOM element;
- returns the harness `ElementTarget` contract.

## 2. Boundary

The dependency direction is:

```text
product/editor-interface.md
        ↓
target library
        ↓
vscode-custom-editor-harness target contract
```

The target library depends on:

- the editor-interface specification for semantic target addresses;
- Shiny's DOM structure and stable target attributes used to resolve those addresses;
- the harness target contract.

The dependency on the harness is one-way: the target library consumes the generic target contract; the harness remains Shiny-agnostic.

Gestures and scenario execution are composed with target queries by scenario code.

## 3. Target model

Target queries expose the same semantic composition as the editor interface.

Examples:

```ts
classBox("Order")
classBox("Order").header()
classBox("Order").member("id")
classBox("Order").resizeHandle("right")

editPane()
editPane().field("Name")
editPane().colorSelect("Fill")
editPane().colorSelect("Fill").option("Orange")
```

A composed target query resolves the full semantic address and encapsulates the DOM selector composition needed to reach it.

Queries are declarative: they identify an editor element. Waiting and gesture execution are supplied by the harness.

## 4. DOM contract

Targets are resolved from the rendered DOM using normal DOM structure and, where needed, stable Shiny-owned target attributes.

Stable target attributes are part of the editor-interface implementation contract. They identify semantic editor elements, remain stable across debug sessions, and carry no runtime behavior.

Shiny-specific DOM knowledge used for target resolution is centralized in the target library.

## 5. Code structure

Home:

```text
debug/
├── targets/
├── scenarios/
└── fixtures/
```

`debug/targets/` contains the reusable target library.

Its structure follows [Architectural Standards](../architectural-standards.md):

- one public boundary for scenario imports;
- private DOM-resolution implementation;
- subordinate target groups organized according to the semantic target tree;
- files and folders introduced for meaningful target subtrees or implementation responsibilities.

Scenarios compose target queries from the target library with gestures from `vscode-custom-editor-harness`.

Example:

```ts
import { drag, at } from "vscode-custom-editor-harness";
import { classBox } from "../targets";

await drag(classBox("Order").header(), at(400, 200));
```

## 6. Enforcement

The target library is included in repository TypeScript checking and linting.

Live element resolution occurs through the harness target contract at gesture time, so the library carries no module-level browser handles or session state.

Scenarios are disposable debug-session programs kept outside the reusable target library.

Changes to target addresses in `docs/product/editor-interface.md` are implemented by corresponding changes in the target library.
