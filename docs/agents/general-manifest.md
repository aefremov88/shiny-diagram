# Agent Manual

> **Implementation state:** Current
>
> **Document state:** Maintained
>
> **Last reviewed:** 2026-08-11
>
> **Scope:** Instructions for any agent working on Shiny Diagram: onboarding, decision levels, standing rules, and the report

## 0. Your role

You are an agent working on Shiny Diagram — a VS Code extension: a visual editor for Mermaid class diagrams, where visual edits are written back into the source text. You receive work as a brief. This manual governs every task. Specialized manuals — for example the debugging manual — add to it; they never replace it.

## 1. Onboarding

Read before your first task:

1. `docs/engineering/architecture/system-architecture.md` — the layers and the data flow.
2. `docs/engineering/development-process.md` — the loops, the checks, and where your work lands.
3. `docs/engineering/coding-standards.md` — rules for all code in the repo.
4. `docs/engineering/architecture/architectural-standards.md` — module boundaries and the webview–host protocol.
5. `docs/engineering/architecture/write-back-pipeline.md` — the core mechanism: how visual edits become source edits.
6. `docs/engineering/architecture/testing-framework.md` — the test suites and their case sources.
7. `docs/engineering/architecture/mermaid-vocabulary.md` — the language, its statements, and its invalid forms.

Read when your task touches their layer:

8. `docs/engineering/architecture/react-standards.md` — domain React components.
9. `docs/engineering/architecture/UI-library-standards.md` — the UI library layer.

## 2. Decision levels

A task is classified by its changes, taken together. The task's level is the highest level any of its changes touches.

1. **Level 1 — changes within one module or layer, following the standards.**
2. **Level 2 — changes across several modules or layers, following the standards.** Interfaces and contracts stay as they are; the work just spans more ground.
3. **Level 3 — a change of a contract between modules or layers.** An interface that more than one module depends on. The closed list:
   - **editor commands** (`editorCommands.ts`) — the contract between View and Controller. Additions count: a new command grows the shared language and obligates workers, catalogs, and tests.
   - **the bridge protocol** (`protocol.ts`) — the contract between the webview and the extension host.
   - **write intent kinds** — the contract between translate and resolve.
   - **`DiagramGraph`, provenance records, `TransactionOutcome`** — the contract between the Controller's parse side and everything that consumes it.
   - **the annotation grammar** — the contract between Shiny and the `.mmd` file.
4. **Level 4 — a change of the program's fixed structure.** The architecture, the patterns, the rules of construction. The change itself is the structural decision; it lands as an edit to the document that records it. The closed list of these documents:
   - `docs/engineering/architecture/system-architecture.md` — the layer model and the data flow.
   - `docs/engineering/architecture/architectural-standards.md` — module boundaries and the webview–host protocol rules.
   - `docs/engineering/architecture/react-standards.md` — responsibilities and implementation patterns of domain components.
   - `docs/engineering/architecture/UI-library-standards.md` — the UI library layer's rules.
   - `docs/engineering/architecture/write-back-pipeline.md` — the pipeline's design.
   - `docs/engineering/architecture/testing-framework.md` — the test suites and coverage rules.
   - `docs/engineering/architecture/stack.md` — the technology choices.
   - `docs/engineering/coding-standards.md` — the rules for all code.

   Not on this list: generated catalogs (the write-back catalog, the UI catalog) change only by regeneration from code; `mermaid-vocabulary.md` records the annotation grammar contract and changes under Level 3 approvals.

## 3. How to act at each level

- **Levels 1 and 2 — proceed.** Business as usual. Do the work, follow the standards, describe it in the report.
- **Levels 3 and 4 — propose, then wait.** Contracts are meant to absorb new needs without changing, and governing documents bind every future task — so both are suspicious by design. Draft a proposal: the need, the change, the alternative you rejected. Do not implement until the proposal is approved. When a contract change is approved, its mirrors are part of the same change: regenerate generated documents (the write-back catalog); update hand-maintained mirrors (the vocabulary) under the same approval.


## 4. Standing rules

- You never commit. The user makes every commit.
- If the brief's premise turns out to be wrong — the task as stated conflicts with what you find in the repo — stop and report. Do not reinterpret the task to make it fit.
- Run `npm run check` after significant changes, and always before handing work in. Hand in only green.
- Leave no debug logging, temporary flags, or instrumentation in source code.
- Gaps you notice in standards or documents are observations for the report, not things to fix unprompted.

## 5. The report

Every task ends with a report. Its sections, in order:

1. **Summary** — what was done, in a few sentences.
2. **Changes** — what changed and where, grouped by module or document. Level 3–4 items name their approval.
3. **Verification** — which checks ran and their results. A failing check is stated, never hidden.
4. **Flags** — observations for the user: gaps in standards or documents, wrong premises found, missing instruments, anything suspicious left untouched.
5. **Open items** — what remains undone or undecided, and why.

Keep the report factual and short. A reader must be able to act on it without asking what happened.
