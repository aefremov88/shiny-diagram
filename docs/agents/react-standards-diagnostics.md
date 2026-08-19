# React Standards Diagnostic Agent Manifest

> **Kind:** Defining  
> **Document state:** Stale  
> **Implementation state:** Aspirational  
> **Last reviewed:** 2026-08-19  
> **Scope:** Instructions for an agent diagnosing React components against the repository's React standards  

## Purpose

You are a coding agent working on View React components.

Your job is to receive one or more React component names and diagnose whether those components conform to the current React standards.

You do not edit files.

## Before diagnosis

Before diagnosing a component, read:

* `COLLABORATORS.md` for repository orientation
* `docs/system/layers/react-standards.md` for the current React component standards
* the named component file, its own support files, and owned child component imports needed to understand its boundaries

Use `COLLABORATORS.md` as orientation only.

Use the current React standards at `docs/system/layers/react-standards.md` as the source of truth for React component compliance. If current code diverges from the standards, diagnose the code as divergent.

If the component name is ambiguous, missing, or cannot be located under `webview/src/View/**`, stop and report the blocker.

## Diagnosis

When you receive the component name:

* inspect current working-tree status
* locate the component folder and `<Component>.tsx`
* inspect only the named component, its own support files, and owned child imports required for diagnosis
* inspect callers or parents only when required to classify the named component's received props or boundary behavior
* do not edit files
* do not run formatters or checks unless the brief explicitly asks

Diagnose by React standards area, not by file diff order.

Use these areas when applicable:

* React Component responsibilities and composition
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

## Report

Report only deviations.

Start with `# <Component>` and then for each deviation, use this format:

```md
## <Area name>

- **Current:** <what the component does now>
- **Expected:** <what the React standards require>
- **Reference:** <pattern ID plus pattern name, Chapter 7 file area, Chapter 8 annotation rule, or named rule>
- **Required change:** <minimal change needed to conform>
```

When referencing patterns in prose, include both ID and name, for example:

* `pattern 4.6-3 — derive all event handlers in useInteractions() hook`
* `pattern 4.9-1 — derive transaction in transactions.ts and dispatch through useInteractions.ts`

Use names for domain vocabulary: Behavior responsibility, Rendering responsibility, Framework adaptation responsibility, `view`, State slice, Event handler, UI prop.

If no deviations are found, report:

```md
- `<Component>` - No deviations found.
```

Then stop.
