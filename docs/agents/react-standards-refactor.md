# React Standards Refactor Agent Manifest

> **Kind:** Defining  
> **Document state:** Stale  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-19  
> **Scope:** Instructions for an agent refactoring React components to comply with the repository's React standards  

## Purpose

You are a coding agent working on View React components.

Your job is to receive one or more React component names and refactor those components to conform to the current React standards at `docs/system/layers/react-standards.md` in one pass.

Do not send a plan before editing. Think through the refactor internally, then implement it.

## Before implementation

Before refactoring a component, read:

* `COLLABORATORS.md` for repository orientation
* `docs/system/layers/react-standards.md` for the current React component standards
* the named component file, its own support files, owned child component imports, and affected callers or receiver-side contracts needed to preserve behavior and keep the code compiling

Use `COLLABORATORS.md` as orientation only.

Use the current React standards as the source of truth for React component compliance. If current code diverges from the standards, migrate the code toward the standards.

If the component name is ambiguous, missing, or cannot be located under `webview/src/View/**`, stop and report the blocker.

## Execution

When you receive the component name:

* inspect current working-tree status
* do not overwrite, revert, reformat, or "fix" unrelated unstaged human edits
* locate the component folder and `<Component>.tsx`
* treat the named component as the compliance target, not the patch boundary: refactor the named component, its support files, receiver-side contracts, owned descendants, callers, and any other affected View React components required to make the named component standards-compliant and keep the code compiling
* keep expansion standards-driven and do not include unrelated cleanup
* create, delete, or rename only files allowed by the React standards for the component's responsibilities and applied patterns
* put code into the Chapter 7 file areas that correspond to the Chapter 4-6 patterns being used
* preserve runtime behavior unless the standards require a structural change
* do not redesign architecture
* do not expand scope to unrelated components
* do not introduce new concepts, layers, message channels, prop categories, responsibilities, or state ownership
* do not edit architecture documentation unless the brief explicitly asks for it

Apply these refactor dimensions when relevant:

* React Component responsibility annotation and composition
* import sources and dependency boundaries
* received props and prop categories
* file composition and allowed files
* file annotations and inline annotations
* state creation
* state initialization
* state reconciliation
* View and State slice prop derivation
* UI prop derivation
* Event handler prop derivation
* state update interaction implementation
* command transaction interaction implementation
* child component routing
* rendering
* framework adaptation
* private helper placement and layering

When referencing patterns in comments or notes, use ID plus name, for example:

* `pattern 4.6-3 — derive all event handlers in useInteractions() hook`
* `pattern 4.9-1 — derive transaction in transactions.ts and dispatch through useInteractions.ts`

Use names for domain vocabulary: Behavior responsibility, Rendering responsibility, Framework adaptation responsibility, `view`, State slice, Event handler, UI prop.

If the refactor requires a standards decision that is not covered by the current React standards, stop and report the blocker instead of inventing a new pattern.

## Standard check

After implementation, run:

```bash
npm run check
```

If `npm run check` fails, fix failures caused by your changes and run it again.

If the failure is unrelated to your changes, report it clearly.

## Review

After implementation:

1. Leave all changes unstaged.
2. Do not paste full diffs into chat.
3. Report only:

```md
# Review

## Changed files

- `path/to/file-a`
- `path/to/file-b`

## Checks

- `npm run check`: pass/fail/not run

## Notes

- None.
```

Then stop.
