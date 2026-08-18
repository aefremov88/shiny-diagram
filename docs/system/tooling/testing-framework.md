# Testing Framework

> **Kind:** Defining  
> **Document state:** Maintained  
> **Implementation state:** Implemented  
> **Last reviewed:** 2026-08-18  
> **Scope:** The regression test suites: their structure, coverage rules, and shared machinery  

## 1. Overview

- **Goal.** Regression tests check that the app still works. They do not aim to cover all scenarios; that space is explored by a testing agent (a separate project, run against the released product).

- **Separation of concerns.** Three places define the tests, each with its own responsibility:
  - **This document** defines the suites and the shape of their tests: what kind of failure each suite covers, and what one test does and asserts.
  - **Case sources** define which cases each suite covers. A case source is a project document (or code file) that lists the cases of its domain — for example, the write-back catalog lists all write options. One list entry, one test. A new case enters its case source first; the test follows from the entry.
  - **Test files** implement the tests. Everything about the implementation is free — file structure, naming, helpers, how a test is written — under two duties: the test follows the shape this document defines, and it names its case-source entry.

- **Coverage.** Each suite mirrors its case source. Coverage is therefore exactly as complete as the case source; gaps in the source are gaps in the suite. Cases outside every source belong to the testing agent.

- **Link.** Every case-source entry has a name: a write option, a statement kind, an invalid-language entry, a contract. A test carries the name of its entry in its title. The sync check matches the source's names against the test titles — by script where the source is generated, by review where it is prose.

| Suite | Covers | Case source |
| --- | --- | --- |
| Write-back regression | wrong or destructive edits to the `.mmd` file | WRITEBACK-CATALOG.md (generated) |
| Parser compatibility | broken promise of Mermaid–Shiny compatibility | mermaid-vocabulary.md |
| Layout contracts | broken placement promises | layoutContracts.ts |

- **Organization.** Tests live centrally in `webview/test/`, one folder per suite, not next to the code they test. Beside them: `webview/test/helpers/` (shared assertions and builders) and `webview/test/fixtures/` (shared source-text fixtures).

## 2. Write-back regression

- **Covers:** the write-back making a wrong or destructive change to the `.mmd` file.
- **Case source:** `webview/src/Controller/translate/WRITEBACK-CATALOG.md` — one test per write option of every command. The sync is enforced by `scripts/check-test-coverage.mjs` inside `npm run test`: it fails when any write option has no test naming it.
- **Mechanics:**
  1. The test constructs its initial source text in code, as required by the write option's condition. Example: the option "annotation absent" is tested on a file without the annotation. The text includes lines the command must not touch — valid content Shiny does not model: plain comments, ignored statements (vocabulary chapter 4), unusual spacing.
  2. Parse it, dispatch the command through the translate → resolve pipeline.
  3. Parse the resulting text again. Assert the edit is present in the graph.
  4. Assert every line the command did not target is byte-identical.
  5. Where the catalog states which ids the command must return, assert the ids in the `TransactionOutcome`.
  Steps 2–4 are one shared helper. A test provides only the command, the initial text, and the expected effect.
- **Files:** `webview/test/writeback/`, one file per command family.

## 3. Parser compatibility

- **Covers:** the promise of Mermaid–Shiny compatibility:
  - Shiny opens what Mermaid opens
  - Shiny breaks where Mermaid breaks
- **Case source:** `docs/engineering/architecture/mermaid-vocabulary.md`, in two directions. The sync is manual: reviewed when the vocabulary changes.
  - valid Mermaid is valid Shiny — one test per statement kind. Each parses into the correct graph, including syntax forms Shiny itself never writes.
  - invalid Mermaid is invalid Shiny — one test per entry of the vocabulary's "Invalid language" chapter. Each asserts the handling the chapter states: problem view, or ignored.
- **Mechanics:** text in → parse → assert the graph, or assert the problem report. Inputs are ready files from `webview/test/fixtures/`. No write-back involved.
- **Files:** `webview/test/parser/`, split by direction.

## 4. Layout contracts

- **Covers:** broken placement promises: overlapping boxes, moved elements, elements outside their namespace.
- **Case source:** the contracts in `webview/src/View/utils/layoutAlgorithm/layoutContracts.ts` — one test per contract, per algorithm where it applies (full layout, incremental layout). The sync is manual: every test names its contract.
- **Mechanics:** graph in → coordinates out → assert relations between elements (no overlap, unmoved, contained), never exact coordinates.
- **Files:** `webview/test/layout/`, one file per algorithm.
