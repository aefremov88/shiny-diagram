# Architectural Standards

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-19  
> **Scope:** Structural rules for production code in the Extension Host and Webview  

This document defines **how production code is structured**. The concrete layers, components, and dataflows of Shiny are defined in [System Architecture](https://chatgpt.com/g/g-p-6a8241d01c088191b7ab2fe56fc2ce8b/c/system-architecture.md).

## 1. Vocabulary

| Term                   | Definition                                                   |
| ---------------------- | ------------------------------------------------------------ |
| **Module**             | One source file with its own import/export scope.            |
| **Behavior**           | A rule implemented by code that determines an output, state change, or side effect from its inputs and current state. |
| **Contract**           | The types and callable interface through which one part of the system uses another. |
| **Boundary**           | The complete set of contracts an architectural unit exposes to code outside it. Everything else is private implementation. |
| **Static dependency**  | A source-level reference from one module to another through an import, type import, dynamic import, import-type expression, or re-export. |
| **Ownership**          | A behavior, state, or contract is owned by the architectural unit that defines its meaning and invariants. Using, storing, constructing, or implementing it does not transfer ownership. |
| **Layer**              | A named set of modules with a defined boundary, a defined set of owned behaviors, states, and contracts, and a defined position in the static dependency graph. |
| **Architectural unit** | A recursively composable unit inside a layer. In React layers it is a React component and its owned subtree; in module-structured layers it is a main module with private supporting modules and child units. |

## 2. Layers

Production code is partitioned into layers.

### 2.1 Ownership

Every behavior, state, and contract that crosses a layer boundary has one owner.

A layer must not redefine or infer semantics owned by another layer. It consumes those semantics through the owning layer's boundary.

### 2.2 Dependency direction

Layers form a directed graph of static dependencies.

If:

```text
A → B
```

then modules in `A` may depend on definitions exposed by `B`; modules in `B` must not depend on `A`.

The rule applies equally to runtime imports, type imports, dynamic imports, import-type expressions, and re-exports.

Runtime control may travel from `B` back to `A` through a callback supplied by `A`. This does not create a static dependency from `B` to `A`.

### 2.3 Independence

A layer must depend only on the boundary of the layers below it, not on their private implementation.

Conversely, a lower layer must not depend on the identity or structure of its current consumer. Replacing that consumer with another implementation satisfying the same contract must not require changes to the lower layer.

### 2.4 Shared foundations

A shared foundation is a bottom-level layer containing definitions whose semantics do not belong to any one consuming layer.

It must not depend on its consumers.

The concrete Shiny layer graph is defined in [System Architecture](https://chatgpt.com/g/g-p-6a8241d01c088191b7ab2fe56fc2ce8b/c/system-architecture.md).

## 3. React layers

A React layer is structured as a tree of architectural units. Each unit is a React component together with the support code and child components it exclusively owns.

```text
Parent/
├── Parent.tsx
├── supporting files
└── Child/
    ├── Child.tsx
    ├── supporting files
    └── Grandchild/
```

The structure repeats recursively.

- An exclusively owned child is nested under its owner; independent components are siblings.
- A component owns the behavior and transient state whose semantic scope is its subtree.
- State required by several descendants is hosted at their nearest common owner.
- Descendants receive data and capabilities through their parent/child boundaries.
- Effects travel upward through callbacks or dispatch handles supplied through those boundaries.
- Siblings do not coordinate each other directly; coordination belongs to their nearest common owner.
- A component must not import or otherwise depend on another component's private implementation.

Detailed View and UI conventions are defined in their dedicated standards.

## 4. Module-structured layers

A non-React layer is structured as a tree of architectural units. Each unit has one main module, optional private supporting modules, and optional child units.

```text
unit/
├── main.ts
├── supporting.ts
└── child-unit/
    ├── main.ts
    └── supporting.ts
```

The structure repeats recursively.

- The main module owns unit-level sequencing and exposes the unit's runtime entry point.
- Supporting modules implement subordinate behavior and remain private to the unit.
- A subordinate responsibility with its own internal structure becomes a child unit.
- Child units are composed by their owner; sibling units must not import each other's private modules.
- Code outside the unit uses its boundary and must not deep-import private implementation.
- Files and folders represent structural responsibilities, not visual symmetry, target file size, or one-export-per-file organization.
- If `index.ts` is used as a public facade, it contains re-exports and documentation only; implementation remains in the unit's modules.

## 5. Enforcement

Architectural rules are enforced mechanically where they can be derived from source structure.

`scripts/check-webview-boundaries.mjs` enforces the concrete dependency graph and public import surfaces defined by [System Architecture](https://chatgpt.com/g/g-p-6a8241d01c088191b7ab2fe56fc2ce8b/c/system-architecture.md), including reverse dependencies and prohibited deep imports. It runs as part of:

```text
npm run check
```

Rules requiring semantic judgment remain review-enforced, including:

- whether ownership is assigned to the correct layer or unit;
- whether a new layer or architectural unit represents a real structural boundary;
- whether supporting code belongs to its claimed owner;
- whether a definition placed in a shared foundation is actually independent of its consumers.

The three sources have separate roles:

```text
Architectural Standards → structural rules
System Architecture      → concrete Shiny structure
boundary checker          → mechanically enforced consequences
```
